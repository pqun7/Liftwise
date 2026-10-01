import { APP_VERSION } from '../../app/version';
import { DATABASE_VERSION } from '../../lib/storage/schema';
import {
  DataSafetyRepository,
  dataSafetyRepository,
  type DatabaseHealth,
} from '../../lib/storage/repositories/dataSafetyRepository';
import {
  AppSettingsRepository,
  appSettingsRepository,
} from '../../lib/storage/repositories/appSettingsRepository';
import {
  BACKUP_VERSION,
  backupDataSchema,
  backupEnvelopeSchema,
  backupHeaderSchema,
  legacyBackupEnvelopeSchema,
  type LiftwiseBackupData,
  type LiftwiseBackupEnvelope,
} from '../../lib/backup/backupSchema';
import { validateBackupRelationships } from '../../lib/backup/backupValidation';
import { canonicalStringify, sha256, withoutChecksum } from '../../lib/backup/checksum';
import { BackupError } from '../../lib/backup/errors';

const LAST_BACKUP_SETTING = 'dataSafety.lastBackupAt';

export interface BackupPreview {
  createdAt: string;
  sourceAppVersion: string;
  sourceBackupVersion: number;
  counts: {
    customExercises: number;
    programs: number;
    programDays: number;
    programExercises: number;
    workouts: number;
    sets: number;
    bodyMetrics: number;
  };
  unresolvedExerciseIds: string[];
}

export interface PreparedRestore {
  data: LiftwiseBackupData;
  preview: BackupPreview;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BackupError('invalid-json', 'This file is not valid JSON.');
  }
}

function makePreview(
  data: LiftwiseBackupData,
  createdAt: string,
  sourceAppVersion: string,
  sourceBackupVersion: number,
  unresolvedExerciseIds: string[],
): BackupPreview {
  return {
    createdAt,
    sourceAppVersion,
    sourceBackupVersion,
    counts: {
      customExercises: data.customExercises.length,
      programs: data.programs.length,
      programDays: data.programDays.length,
      programExercises: data.programExercises.length,
      workouts: data.workoutSessions.length,
      sets: data.workoutSets.length,
      bodyMetrics: data.bodyMetrics.length,
    },
    unresolvedExerciseIds,
  };
}

export class BackupService {
  constructor(
    private readonly repository: DataSafetyRepository = dataSafetyRepository,
    private readonly settings: AppSettingsRepository = appSettingsRepository,
  ) {}

  async createBackup(createdAt = new Date().toISOString()): Promise<LiftwiseBackupEnvelope> {
    const data = backupDataSchema.parse(await this.repository.exportUserData());
    validateBackupRelationships(data, await this.repository.listProviderExerciseIds());
    const payload = {
      application: 'liftwise' as const,
      backupVersion: BACKUP_VERSION as 1,
      schemaVersion: DATABASE_VERSION,
      appVersion: APP_VERSION,
      createdAt,
      data,
    };
    return backupEnvelopeSchema.parse({ ...payload, checksum: await sha256(payload) });
  }

  serialize(envelope: LiftwiseBackupEnvelope): string {
    return `${canonicalStringify(envelope)}\n`;
  }

  async prepareRestore(text: string): Promise<PreparedRestore> {
    const raw = parseJson(text);
    const header = backupHeaderSchema.safeParse(raw);
    if (!header.success) {
      throw new BackupError('invalid-schema', 'This is not a valid Liftwise backup envelope.');
    }
    if (header.data.backupVersion > BACKUP_VERSION) {
      throw new BackupError(
        'unsupported-version',
        `Backup version ${header.data.backupVersion} requires a newer Liftwise release.`,
      );
    }
    let data: LiftwiseBackupData;
    let createdAt: string;
    let appVersion: string;
    let checksum: string;
    if (header.data.backupVersion === BACKUP_VERSION) {
      const parsed = backupEnvelopeSchema.safeParse(raw);
      if (!parsed.success) {
        throw new BackupError('invalid-schema', 'The backup contains invalid records.');
      }
      data = parsed.data.data;
      createdAt = parsed.data.createdAt;
      appVersion = parsed.data.appVersion;
      checksum = parsed.data.checksum;
    } else if (header.data.backupVersion === 0) {
      const parsed = legacyBackupEnvelopeSchema.safeParse(raw);
      if (!parsed.success) {
        throw new BackupError('invalid-schema', 'The legacy backup contains invalid records.');
      }
      const { appSettings, ...legacyData } = parsed.data.data;
      data = backupDataSchema.parse({ ...legacyData, portableSettings: appSettings });
      createdAt = parsed.data.createdAt;
      appVersion = parsed.data.appVersion;
      checksum = parsed.data.checksum;
    } else {
      throw new BackupError(
        'unsupported-version',
        `Backup version ${header.data.backupVersion} is not supported.`,
      );
    }

    const expectedChecksum = await sha256(withoutChecksum(raw as { checksum: string }));
    if (checksum !== expectedChecksum) {
      throw new BackupError(
        'checksum-failed',
        'Backup checksum verification failed. The file may be corrupted or altered.',
      );
    }
    if (header.data.schemaVersion > DATABASE_VERSION) {
      throw new BackupError(
        'incompatible-schema',
        `Database schema ${header.data.schemaVersion} requires a newer Liftwise release.`,
      );
    }

    const relationshipResult = validateBackupRelationships(
      data,
      await this.repository.listProviderExerciseIds(),
    );
    return {
      data,
      preview: makePreview(
        data,
        createdAt,
        appVersion,
        header.data.backupVersion,
        relationshipResult.unresolvedExerciseIds,
      ),
    };
  }

  async restore(prepared: PreparedRestore): Promise<void> {
    await this.repository.replaceUserData(prepared.data);
  }

  async deleteAllUserData(): Promise<void> {
    await this.repository.deleteAllUserData();
  }

  audit(): Promise<DatabaseHealth> {
    return this.repository.audit();
  }

  async getLastBackupAt(): Promise<string | null> {
    const setting = await this.settings.get(LAST_BACKUP_SETTING);
    return typeof setting?.value === 'string' ? setting.value : null;
  }

  async recordBackup(createdAt: string): Promise<void> {
    await this.settings.set(LAST_BACKUP_SETTING, createdAt);
  }
}

export const backupService = new BackupService();

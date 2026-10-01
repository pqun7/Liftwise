import {
  appSettingSchema,
  bodyMetricSchema,
  exerciseSchema,
  programDaySchema,
  programExerciseSchema,
  programSchema,
  workoutExerciseSchema,
  workoutSessionSchema,
  workoutSetSchema,
} from '../../../domain/validation';
import { backupDataSchema, type LiftwiseBackupData } from '../../backup/backupSchema';
import { canonicalStringify } from '../../backup/checksum';
import { validateBackupRelationships } from '../../backup/backupValidation';
import { BackupError } from '../../backup/errors';
import { database, type LiftwiseDatabase } from '../database';

const PORTABLE_SETTING_KEYS = new Set(['activeProgramId']);

function sortById<T extends { id: string }>(records: T[]): T[] {
  return records.sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeData(data: LiftwiseBackupData): LiftwiseBackupData {
  return {
    customExercises: sortById([...data.customExercises]),
    programs: sortById([...data.programs]),
    programDays: sortById([...data.programDays]),
    programExercises: sortById([...data.programExercises]),
    workoutSessions: sortById([...data.workoutSessions]),
    workoutExercises: sortById([...data.workoutExercises]),
    workoutSets: sortById([...data.workoutSets]),
    bodyMetrics: sortById([...data.bodyMetrics]),
    portableSettings: [...data.portableSettings].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
  };
}

export interface DatabaseHealth {
  status: 'healthy' | 'attention';
  issues: string[];
}

export class DataSafetyRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  private async readUserData(): Promise<LiftwiseBackupData> {
    const [
      exercises,
      programs,
      programDays,
      programExercises,
      workoutSessions,
      workoutExercises,
      workoutSets,
      bodyMetrics,
      appSettings,
    ] = await Promise.all([
      this.db.exercises.where('sourceProvider').equals('custom').toArray(),
      this.db.programs.toArray(),
      this.db.programDays.toArray(),
      this.db.programExercises.toArray(),
      this.db.workoutSessions.toArray(),
      this.db.workoutExercises.toArray(),
      this.db.workoutSets.toArray(),
      this.db.bodyMetrics.toArray(),
      this.db.appSettings.toArray(),
    ]);

    return normalizeData({
      customExercises: exercises.map((record) => exerciseSchema.parse(record)),
      programs: programs.map((record) => programSchema.parse(record)),
      programDays: programDays.map((record) => programDaySchema.parse(record)),
      programExercises: programExercises.map((record) => programExerciseSchema.parse(record)),
      workoutSessions: workoutSessions.map((record) => workoutSessionSchema.parse(record)),
      workoutExercises: workoutExercises.map((record) => workoutExerciseSchema.parse(record)),
      workoutSets: workoutSets.map((record) => workoutSetSchema.parse(record)),
      bodyMetrics: bodyMetrics.map((record) => bodyMetricSchema.parse(record)),
      portableSettings: appSettings
        .filter(({ key }) => PORTABLE_SETTING_KEYS.has(key))
        .map((record) => appSettingSchema.parse(record)),
    });
  }

  async exportUserData(): Promise<LiftwiseBackupData> {
    return this.db.transaction(
      'r',
      [
        this.db.exercises,
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutSessions,
        this.db.workoutExercises,
        this.db.workoutSets,
        this.db.bodyMetrics,
        this.db.appSettings,
      ],
      () => this.readUserData(),
    );
  }

  async listProviderExerciseIds(): Promise<Set<string>> {
    const ids = await this.db.exercises.where('sourceProvider').equals('repdb').primaryKeys();
    return new Set(ids);
  }

  async audit(): Promise<DatabaseHealth> {
    try {
      const data = await this.exportUserData();
      const { unresolvedExerciseIds } = validateBackupRelationships(
        data,
        await this.listProviderExerciseIds(),
      );
      if (unresolvedExerciseIds.length > 0) {
        return {
          status: 'attention',
          issues: [
            `${unresolvedExerciseIds.length} provider exercise reference(s) are unresolved.`,
          ],
        };
      }
      return { status: 'healthy', issues: [] };
    } catch (error) {
      return {
        status: 'attention',
        issues: [error instanceof Error ? error.message : 'Database validation failed.'],
      };
    }
  }

  async replaceUserData(data: LiftwiseBackupData): Promise<void> {
    const normalized = normalizeData(backupDataSchema.parse(data));
    validateBackupRelationships(normalized, await this.listProviderExerciseIds());

    await this.db.transaction(
      'rw',
      [
        this.db.exercises,
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutSessions,
        this.db.workoutExercises,
        this.db.workoutSets,
        this.db.bodyMetrics,
        this.db.appSettings,
      ],
      async () => {
        await Promise.all([
          this.db.programs.clear(),
          this.db.programDays.clear(),
          this.db.programExercises.clear(),
          this.db.workoutSessions.clear(),
          this.db.workoutExercises.clear(),
          this.db.workoutSets.clear(),
          this.db.bodyMetrics.clear(),
          this.db.appSettings.clear(),
          this.db.exercises.where('sourceProvider').equals('custom').delete(),
        ]);

        await this.db.exercises.bulkAdd(normalized.customExercises);
        await this.db.programs.bulkAdd(normalized.programs);
        await this.db.programDays.bulkAdd(normalized.programDays);
        await this.db.programExercises.bulkAdd(normalized.programExercises);
        await this.db.workoutSessions.bulkAdd(normalized.workoutSessions);
        await this.db.workoutExercises.bulkAdd(normalized.workoutExercises);
        await this.db.workoutSets.bulkAdd(normalized.workoutSets);
        await this.db.bodyMetrics.bulkAdd(normalized.bodyMetrics);
        await this.db.appSettings.bulkAdd(normalized.portableSettings);

        const restored = await this.readUserData();
        if (canonicalStringify(restored) !== canonicalStringify(normalized)) {
          throw new BackupError(
            'import-failed',
            'Post-import verification did not match the backup.',
          );
        }
      },
    );
  }

  async deleteAllUserData(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.exercises,
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutSessions,
        this.db.workoutExercises,
        this.db.workoutSets,
        this.db.bodyMetrics,
        this.db.appSettings,
      ],
      async () => {
        await Promise.all([
          this.db.programs.clear(),
          this.db.programDays.clear(),
          this.db.programExercises.clear(),
          this.db.workoutSessions.clear(),
          this.db.workoutExercises.clear(),
          this.db.workoutSets.clear(),
          this.db.bodyMetrics.clear(),
          this.db.appSettings.clear(),
          this.db.exercises.where('sourceProvider').equals('custom').delete(),
        ]);
      },
    );
  }
}

export const dataSafetyRepository = new DataSafetyRepository();

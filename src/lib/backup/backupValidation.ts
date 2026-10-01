import type { LiftwiseBackupData } from './backupSchema';
import { BackupError } from './errors';

function assertUnique(records: readonly { id: string }[], label: string): Set<string> {
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) {
      throw new BackupError('duplicate-id', `Duplicate ${label} identifier: ${record.id}`);
    }
    ids.add(record.id);
  }
  return ids;
}

function assertUniqueSettingKeys(data: LiftwiseBackupData): void {
  const keys = new Set<string>();
  for (const setting of data.portableSettings) {
    if (keys.has(setting.key)) {
      throw new BackupError('duplicate-id', `Duplicate setting key: ${setting.key}`);
    }
    keys.add(setting.key);
  }
}

function assertUniqueOrder<T extends { id: string; order: number }>(
  records: readonly T[],
  parent: (record: T) => string,
  label: string,
): void {
  const positions = new Set<string>();
  for (const record of records) {
    const key = `${parent(record)}:${record.order}`;
    if (positions.has(key)) {
      throw new BackupError('duplicate-id', `Duplicate ${label} ordering position: ${key}`);
    }
    positions.add(key);
  }
}

export interface BackupRelationshipResult {
  unresolvedExerciseIds: string[];
}

export function validateBackupRelationships(
  data: LiftwiseBackupData,
  availableProviderExerciseIds: ReadonlySet<string> = new Set(),
): BackupRelationshipResult {
  const customExerciseIds = assertUnique(data.customExercises, 'custom exercise');
  const programIds = assertUnique(data.programs, 'program');
  const dayIds = assertUnique(data.programDays, 'program day');
  const programExerciseIds = assertUnique(data.programExercises, 'program exercise');
  const sessionIds = assertUnique(data.workoutSessions, 'workout session');
  const workoutExerciseIds = assertUnique(data.workoutExercises, 'workout exercise');
  assertUnique(data.workoutSets, 'workout set');
  assertUnique(data.bodyMetrics, 'body metric');
  assertUniqueSettingKeys(data);

  assertUniqueOrder(data.programDays, (record) => record.programId, 'program day');
  assertUniqueOrder(data.programExercises, (record) => record.programDayId, 'program exercise');
  assertUniqueOrder(data.workoutExercises, (record) => record.workoutSessionId, 'workout exercise');

  const workoutSetPositions = new Set<string>();
  for (const set of data.workoutSets) {
    const key = `${set.workoutExerciseId}:${set.setNumber}`;
    if (workoutSetPositions.has(key)) {
      throw new BackupError('duplicate-id', `Duplicate workout set number: ${key}`);
    }
    workoutSetPositions.add(key);
  }

  for (const day of data.programDays) {
    if (!programIds.has(day.programId)) {
      throw new BackupError('missing-reference', `Program day ${day.id} has no program.`);
    }
  }
  for (const exercise of data.programExercises) {
    if (!dayIds.has(exercise.programDayId)) {
      throw new BackupError(
        'missing-reference',
        `Program exercise ${exercise.id} has no program day.`,
      );
    }
  }
  for (const session of data.workoutSessions) {
    if (session.programId !== null && !programIds.has(session.programId)) {
      throw new BackupError('missing-reference', `Workout ${session.id} has no program.`);
    }
    if (session.programDayId !== null && !dayIds.has(session.programDayId)) {
      throw new BackupError('missing-reference', `Workout ${session.id} has no program day.`);
    }
    if (session.currentExerciseId !== null) {
      const current = data.workoutExercises.find(({ id }) => id === session.currentExerciseId);
      if (!current || current.workoutSessionId !== session.id) {
        throw new BackupError(
          'missing-reference',
          `Workout ${session.id} has an invalid current exercise.`,
        );
      }
    }
  }
  for (const exercise of data.workoutExercises) {
    if (!sessionIds.has(exercise.workoutSessionId)) {
      throw new BackupError(
        'missing-reference',
        `Workout exercise ${exercise.id} has no workout session.`,
      );
    }
    if (
      exercise.programExerciseId !== null &&
      !programExerciseIds.has(exercise.programExerciseId)
    ) {
      throw new BackupError(
        'missing-reference',
        `Workout exercise ${exercise.id} has no program prescription.`,
      );
    }
  }
  for (const set of data.workoutSets) {
    if (!workoutExerciseIds.has(set.workoutExerciseId)) {
      throw new BackupError('missing-reference', `Workout set ${set.id} has no exercise.`);
    }
  }

  const referencedExerciseIds = new Set([
    ...data.programExercises.map(({ exerciseId }) => exerciseId),
    ...data.workoutExercises.map(({ exerciseId }) => exerciseId),
  ]);
  const unresolvedExerciseIds: string[] = [];
  for (const exerciseId of referencedExerciseIds) {
    if (customExerciseIds.has(exerciseId) || availableProviderExerciseIds.has(exerciseId)) continue;
    if (exerciseId.startsWith('repdb:')) unresolvedExerciseIds.push(exerciseId);
    else {
      throw new BackupError(
        'missing-reference',
        `User exercise reference ${exerciseId} is missing from the backup.`,
      );
    }
  }

  const activeProgram = data.portableSettings.find(({ key }) => key === 'activeProgramId');
  if (typeof activeProgram?.value === 'string' && !programIds.has(activeProgram.value)) {
    throw new BackupError('missing-reference', 'The active program setting references no program.');
  }

  return { unresolvedExerciseIds: unresolvedExerciseIds.sort() };
}

import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackupService } from '../src/features/dataSafety/backupService';
import { sha256, withoutChecksum } from '../src/lib/backup/checksum';
import { BackupError } from '../src/lib/backup/errors';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { BodyMetricRepository } from '../src/lib/storage/repositories/bodyMetricRepository';
import { DataSafetyRepository } from '../src/lib/storage/repositories/dataSafetyRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { createRepdbArtifact } from './fixtures/repdb';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(() => {
  vi.restoreAllMocks();
  return cleanupTestDatabases();
});

async function createFixture(database: LiftwiseDatabase) {
  const providerExercise = createRepdbArtifact().exercises[0]!;
  await database.exercises.add(providerExercise);
  const exercises = new ExerciseRepository(database);
  const programs = new ProgramRepository(database);
  const workouts = new WorkoutRepository(database);
  const bodyMetrics = new BodyMetricRepository(database);
  const customExercise = await exercises.create({
    name: 'Custom Cable Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps'],
    equipment: 'cable',
    notes: 'User-owned',
  });
  const program = await programs.create({ name: 'Push Plan', description: 'Backup fixture' });
  const day = await programs.addDay({ programId: program.id, name: 'Push Day' });
  const providerPrescription = await programs.addExercise({
    programDayId: day.id,
    exerciseId: providerExercise.id,
    order: 1,
    targetSets: 3,
    minReps: 6,
    maxReps: 8,
    targetRirMin: 1,
    targetRirMax: 2,
    restSeconds: 180,
  });
  await programs.addExercise({
    programDayId: day.id,
    exerciseId: customExercise.id,
    order: 2,
    targetSets: 2,
    minReps: 10,
    maxReps: 12,
    restSeconds: 90,
  });
  const session = await workouts.createSession({
    programId: program.id,
    programDayId: day.id,
    name: 'Historical fixture',
  });
  const workoutExercise = await workouts.addExercise({
    workoutSessionId: session.id,
    exerciseId: providerExercise.id,
    programExerciseId: providerPrescription.id,
    order: 1,
  });
  await workouts.addSet({
    workoutExerciseId: workoutExercise.id,
    setNumber: 1,
    setType: 'working',
    weight: 80,
    reps: 8,
    rir: 2,
    completed: true,
  });
  await bodyMetrics.create({ weight: 82.5, notes: 'Morning' });
  return { providerExercise, customExercise, program, day };
}

function serviceFor(database: LiftwiseDatabase) {
  const repository = new DataSafetyRepository(database);
  return {
    repository,
    service: new BackupService(repository, new AppSettingsRepository(database)),
  };
}

async function resign<T extends { checksum: string }>(value: T): Promise<T> {
  return { ...value, checksum: await sha256(withoutChecksum(value)) };
}

describe('Liftwise backup and restore', () => {
  it('exports a versioned checksummed envelope without RepDB catalog records', async () => {
    const database = createTestDatabase('backup-export');
    await createFixture(database);
    const { service } = serviceFor(database);

    const backup = await service.createBackup('2026-10-01T12:00:00.000Z');

    expect(backup).toMatchObject({
      application: 'liftwise',
      backupVersion: 1,
      schemaVersion: 4,
      appVersion: '0.5.0',
      createdAt: '2026-10-01T12:00:00.000Z',
    });
    expect(backup.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(backup.data.customExercises).toHaveLength(1);
    expect(
      backup.data.customExercises.every(({ sourceProvider }) => sourceProvider === 'custom'),
    ).toBe(true);
    expect(backup.data.programExercises.map(({ exerciseId }) => exerciseId)).toContain(
      'repdb:bench-press',
    );
  });

  it('rejects invalid JSON, invalid schemas, future versions, and checksum changes', async () => {
    const database = createTestDatabase('backup-invalid');
    await createFixture(database);
    const { service } = serviceFor(database);
    const backup = await service.createBackup('2026-10-01T12:00:00.000Z');

    await expect(service.prepareRestore('{bad')).rejects.toMatchObject({ code: 'invalid-json' });
    await expect(service.prepareRestore('{}')).rejects.toMatchObject({ code: 'invalid-schema' });
    await expect(
      service.prepareRestore(JSON.stringify({ ...backup, backupVersion: 99 })),
    ).rejects.toMatchObject({ code: 'unsupported-version' });

    const changed = structuredClone(backup);
    changed.data.programs[0]!.name = 'Tampered';
    await expect(service.prepareRestore(JSON.stringify(changed))).rejects.toMatchObject({
      code: 'checksum-failed',
    });
  });

  it('migrates the known legacy backup format before preview', async () => {
    const database = createTestDatabase('backup-legacy');
    await createFixture(database);
    const { service } = serviceFor(database);
    const current = await service.createBackup('2026-10-01T12:00:00.000Z');
    const { portableSettings, ...legacyData } = current.data;
    const legacyPayload = {
      ...withoutChecksum(current),
      backupVersion: 0 as const,
      data: { ...legacyData, appSettings: portableSettings },
    };
    const legacy = { ...legacyPayload, checksum: await sha256(legacyPayload) };

    const prepared = await service.prepareRestore(JSON.stringify(legacy));

    expect(prepared.preview.sourceBackupVersion).toBe(0);
    expect(prepared.data.portableSettings).toEqual(portableSettings);
  });

  it('rejects duplicate IDs and missing custom references before import', async () => {
    const database = createTestDatabase('backup-relations');
    await createFixture(database);
    const { service } = serviceFor(database);
    const backup = await service.createBackup('2026-10-01T12:00:00.000Z');

    const duplicate = structuredClone(backup);
    duplicate.data.programs.push(structuredClone(duplicate.data.programs[0]!));
    await expect(
      service.prepareRestore(JSON.stringify(await resign(duplicate))),
    ).rejects.toMatchObject({
      code: 'duplicate-id',
    });

    const missingCustom = structuredClone(backup);
    missingCustom.data.programExercises[1]!.exerciseId = crypto.randomUUID();
    await expect(
      service.prepareRestore(JSON.stringify(await resign(missingCustom))),
    ).rejects.toMatchObject({ code: 'missing-reference' });
  });

  it('preserves and reports unavailable provider references', async () => {
    const database = createTestDatabase('backup-provider-missing');
    await createFixture(database);
    const { service } = serviceFor(database);
    const backup = await service.createBackup('2026-10-01T12:00:00.000Z');
    backup.data.programExercises[0]!.exerciseId = 'repdb:temporarily-unavailable';
    const prepared = await service.prepareRestore(JSON.stringify(await resign(backup)));

    expect(prepared.preview.unresolvedExerciseIds).toEqual(['repdb:temporarily-unavailable']);
    expect(prepared.data.programExercises[0]!.exerciseId).toBe('repdb:temporarily-unavailable');
  });

  it('round-trips exact user data, preserves RepDB, and survives close/reopen', async () => {
    const database = createTestDatabase('backup-roundtrip');
    const fixture = await createFixture(database);
    const { repository, service } = serviceFor(database);
    const before = await repository.exportUserData();
    const backup = await service.createBackup('2026-10-01T12:00:00.000Z');
    const prepared = await service.prepareRestore(service.serialize(backup));

    await service.deleteAllUserData();
    expect(await database.exercises.get(fixture.providerExercise.id)).toBeDefined();
    expect(await database.exercises.get(fixture.customExercise.id)).toBeUndefined();
    await service.restore(prepared);
    expect(await repository.exportUserData()).toEqual(before);

    const databaseName = database.name;
    database.close();
    const reopened = new LiftwiseDatabase(databaseName);
    await reopened.open();
    expect(await new DataSafetyRepository(reopened).exportUserData()).toEqual(before);
    expect(await reopened.exercises.get(fixture.providerExercise.id)).toBeDefined();
    reopened.close();
  });

  it('rolls back every destructive write when transactional import fails', async () => {
    const database = createTestDatabase('backup-rollback');
    await createFixture(database);
    const { repository } = serviceFor(database);
    const original = await repository.exportUserData();
    const replacement = structuredClone(original);
    replacement.programs[0]!.name = 'Replacement';
    vi.spyOn(database.programExercises, 'bulkAdd').mockRejectedValueOnce(
      new Error('simulated write failure'),
    );

    await expect(repository.replaceUserData(replacement)).rejects.toThrow(
      'simulated write failure',
    );
    expect(await repository.exportUserData()).toEqual(original);
  });

  it('deletes only user data and leaves RepDB exercises available', async () => {
    const database = createTestDatabase('backup-delete');
    const fixture = await createFixture(database);
    const { repository } = serviceFor(database);

    await repository.deleteAllUserData();

    expect(await repository.exportUserData()).toEqual({
      customExercises: [],
      programs: [],
      programDays: [],
      programExercises: [],
      workoutSessions: [],
      workoutExercises: [],
      workoutSets: [],
      bodyMetrics: [],
      portableSettings: [],
    });
    expect(await database.exercises.get(fixture.providerExercise.id)).toBeDefined();
  });

  it('uses deterministic SHA-256 canonical serialization', async () => {
    await expect(sha256({ b: 2, a: 1 })).resolves.toBe(await sha256({ a: 1, b: 2 }));
  });

  it('exposes typed backup errors', () => {
    expect(new BackupError('invalid-json', 'bad')).toMatchObject({ code: 'invalid-json' });
  });
});

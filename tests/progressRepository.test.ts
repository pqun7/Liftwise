import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressRepository } from '../src/features/progress/progressService';
import { progressCsv } from '../src/features/progress/exports';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { BodyMetricRepository } from '../src/lib/storage/repositories/bodyMetricRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { VERSION_5_STORES } from '../src/lib/storage/schema';
import { DataSafetyRepository } from '../src/lib/storage/repositories/dataSafetyRepository';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { BackupService } from '../src/features/dataSafety/backupService';
import { sha256, withoutChecksum } from '../src/lib/backup/checksum';
import { version5BodyMetricFixture } from './fixtures/version5';
import { cleanupTestDatabases, createTestDatabase, trackDatabaseName } from './helpers/database';
afterEach(cleanupTestDatabases);

describe('progress storage, export and compatibility', () => {
  it('queries completed date ranges and selected-exercise lifetime history only', async () => {
    const db = createTestDatabase('progress');
    const repo = new WorkoutRepository(db);
    const source = await new ExerciseRepository(db).create({
      name: 'Snapshot Bench',
      primaryMuscle: 'chest',
    });
    for (const date of ['2025-01-01T10:00:00.000Z', '2026-10-01T10:00:00.000Z']) {
      const session = await repo.createSession({ startedAt: date });
      const exercise = await repo.addExercise({
        workoutSessionId: session.id,
        exerciseId: source.id,
      });
      await repo.addSet({
        workoutExerciseId: exercise.id,
        setType: 'working',
        weight: 100,
        reps: 8,
        completed: true,
      });
      await repo.finish(session.id, new Date(Date.parse(date) + 3_600_000));
    }
    await repo.createSession();
    const progress = new ProgressRepository(db);
    const graphs = await progress.history('2026-09-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z');
    expect(graphs).toHaveLength(1);
    expect(graphs[0]?.exercises[0]?.exercise.exerciseName).toBe('Snapshot Bench');
    expect(await progress.exerciseHistory(source.id)).toHaveLength(2);
    expect(await progress.exerciseOptions()).toEqual([{ id: source.id, name: 'Snapshot Bench' }]);
    expect(await progress.exerciseHistory('missing')).toEqual([]);
    expect(await progress.history('2030-01-01T00:00:00.000Z')).toEqual([]);
  });
  it('upgrades frozen v5 body data unchanged and creates the compound date index', async () => {
    const name = `progress-v5-${crypto.randomUUID()}`;
    trackDatabaseName(name);
    const legacy = new Dexie(name);
    legacy.version(5).stores(VERSION_5_STORES);
    await legacy.table('bodyMetrics').put(version5BodyMetricFixture);
    legacy.close();
    const db = new LiftwiseDatabase(name);
    await db.open();
    expect(db.verno).toBe(6);
    expect(await db.bodyMetrics.get(version5BodyMetricFixture.id)).toEqual(
      version5BodyMetricFixture,
    );
    expect(
      db.workoutSessions.schema.indexes.some((index) => index.name === '[status+startedAt]'),
    ).toBe(true);
    db.close();
  });
  it('validates optional measurements, edits/deletes, and round-trips backup then reopen', async () => {
    const db = createTestDatabase('body');
    const body = new BodyMetricRepository(db);
    await expect(body.create({})).rejects.toThrow();
    await expect(body.create({ waistCm: -1 })).rejects.toThrow();
    await expect(body.create({ bodyFatPercentage: 101 })).rejects.toThrow();
    const entry = await body.create({ waistCm: 85, chestCm: 100, armsCm: 35, legsCm: 55 });
    const edited = await body.update(entry.id, { weight: 80, waistCm: 84 });
    const safety = new DataSafetyRepository(db);
    const service = new BackupService(safety, new AppSettingsRepository(db));
    const backup = await service.createBackup();
    await service.deleteAllUserData();
    await service.restore(await service.prepareRestore(service.serialize(backup)));
    const name = db.name;
    db.close();
    const reopened = new LiftwiseDatabase(name);
    expect(await new BodyMetricRepository(reopened).list()).toEqual([edited]);
    await new BodyMetricRepository(reopened).delete(edited.id);
    expect(await reopened.bodyMetrics.count()).toBe(0);
    reopened.close();
  });
  it('accepts schema5 backup checksums without rewriting legacy body records', async () => {
    const db = createTestDatabase('old-backup');
    const safety = new DataSafetyRepository(db);
    const service = new BackupService(safety, new AppSettingsRepository(db));
    const backup = await service.createBackup();
    backup.schemaVersion = 5;
    backup.appVersion = '0.7.0';
    backup.data.bodyMetrics = [version5BodyMetricFixture];
    backup.checksum = await sha256(withoutChecksum(backup));
    await service.restore(await service.prepareRestore(service.serialize(backup)));
    expect(await db.bodyMetrics.get(version5BodyMetricFixture.id)).toEqual(
      version5BodyMetricFixture,
    );
  });
  it('exports deterministic user CSV, snapshot names, blanks and formula-safe text', async () => {
    const db = createTestDatabase('csv');
    const repo = new WorkoutRepository(db);
    const source = await new ExerciseRepository(db).create({
      name: '=HYPERLINK("bad")',
      primaryMuscle: 'chest',
    });
    const session = await repo.createSession();
    const exercise = await repo.addExercise({
      workoutSessionId: session.id,
      exerciseId: source.id,
    });
    await repo.addSet({ workoutExerciseId: exercise.id, setType: 'warmup', weight: 0, reps: null });
    await new BodyMetricRepository(db).create({ waistCm: 90 });
    const data = await new DataSafetyRepository(db).exportUserData();
    const csv = progressCsv(data);
    expect(csv['sets.csv']).toContain('exercise_name_snapshot');
    expect(csv['sets.csv']).toContain("'=HYPERLINK");
    expect(csv['sets.csv']).toContain('warmup,0,,,false');
    expect(csv['body_metrics.csv']).toContain('waist_cm');
    expect(progressCsv(data)).toEqual(csv);
    expect(csv['workouts.csv']).toContain('active');
  });
});

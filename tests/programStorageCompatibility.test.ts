import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { programDaySchema, programSchema } from '../src/domain/validation';
import { trainingCalendar } from '../src/domain/trainingCalendar';
import { scheduledTrainingWeekdays } from '../src/domain/streak';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { VERSION_3_STORES, VERSION_6_STORES } from '../src/lib/storage/schema';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { DataSafetyRepository } from '../src/lib/storage/repositories/dataSafetyRepository';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { ProgramBuilderService } from '../src/features/plan/builderService';
import { BackupService } from '../src/features/dataSafety/backupService';
import { sha256, withoutChecksum } from '../src/lib/backup/checksum';
import { version3DayFixture, version3ProgramFixture } from './fixtures/migrations';
import { cleanupTestDatabases, createTestDatabase, trackDatabaseName } from './helpers/database';

afterEach(cleanupTestDatabases);

describe('persisted program compatibility', () => {
  it.each([undefined, 'weekly', 'cycle', 'future-mode'])(
    'reopens version 6 records with mode %s without rewriting user data',
    async (scheduleType) => {
      const db = createTestDatabase('program-compatibility');
      const original = new Dexie(db.name);
      original.version(6).stores(VERSION_6_STORES);
      const record = {
        ...version3ProgramFixture,
        ...(scheduleType === undefined ? {} : { scheduleType }),
        futureMetadata: { source: 'newer-client', values: [1, null, true] },
      };
      const day = {
        id: version3DayFixture.id,
        programId: record.id,
        name: version3DayFixture.name,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        order: 1,
        notes: 'Keep these notes',
        weekday: 0,
        kind: 'workout',
      };
      await original.table('programs').put(record);
      await original.table('programDays').put(day);
      original.close();

      await db.open();
      const programs = new ProgramRepository(db);
      expect(await programs.list()).toEqual([record]);
      expect((await programs.get(record.id))?.days[0]?.day).toEqual(day);
      expect(await db.programs.get(record.id)).toEqual(record);
      expect(await db.programDays.get(day.id)).toEqual(day);

      await programs.update(record.id, { name: 'Renamed' });
      await programs.updateDay(day.id, { notes: 'Edited' });
      const copy = await programs.duplicate(record.id);
      expect(copy.program.scheduleType).toBe(scheduleType);
      expect(copy.program).toMatchObject({ futureMetadata: record.futureMetadata });
      expect(copy.days[0]?.day).toMatchObject({ kind: 'workout', notes: 'Edited', weekday: 0 });
      const safety = new DataSafetyRepository(db);
      const service = new BackupService(safety, new AppSettingsRepository(db));
      const backup = await service.createBackup();
      const prepared = await service.prepareRestore(service.serialize(backup));
      await service.restore(prepared);
      expect(await safety.exportUserData()).toEqual(backup.data);
      expect(await safety.audit()).toEqual({ status: 'healthy', issues: [] });
      expect((await programs.get(record.id))?.program).toMatchObject({
        name: 'Renamed',
        futureMetadata: record.futureMetadata,
      });
    },
  );

  it('upgrades a version 3 program without inventing a schedule or losing notes', async () => {
    const name = `liftwise-legacy-program-${crypto.randomUUID()}`;
    trackDatabaseName(name);
    const legacy = new Dexie(name);
    legacy.version(3).stores(VERSION_3_STORES);
    await legacy.table('programs').put(version3ProgramFixture);
    await legacy.table('programDays').put({ ...version3DayFixture, notes: 'Legacy notes' });
    legacy.close();
    const db = new LiftwiseDatabase(name);
    try {
      const graph = await new ProgramRepository(db).get(version3ProgramFixture.id);
      expect(graph?.program).toEqual(version3ProgramFixture);
      expect(graph?.days[0]?.day).toMatchObject({ order: 1, notes: 'Legacy notes' });
      expect(graph?.days[0]?.day).not.toHaveProperty('dayNumber');
    } finally {
      db.close();
    }
  });

  it('uses weekdays for legacy/weekly/future modes and completion order for explicit cycles', async () => {
    const db = createTestDatabase();
    const programs = new ProgramRepository(db);
    const program = await programs.create({ name: 'Schedule' });
    const exercise = await new ExerciseRepository(db).create({
      name: 'Row',
      primaryMuscle: 'back',
    });
    for (const weekday of [4, 0]) {
      const day = await programs.addDay({ programId: program.id, name: `Day ${weekday}`, weekday });
      await programs.addExercise({ programDayId: day.id, exerciseId: exercise.id });
    }
    const graph = (await programs.get(program.id))!;
    const now = new Date(2026, 9, 5, 12);
    for (const mode of [undefined, 'weekly', 'future-mode']) {
      graph.program.scheduleType = mode;
      expect(trainingCalendar(graph, [], now).dated).toBe(true);
      expect(trainingCalendar(graph, [], now).startableToday?.day.weekday).toBe(0);
      expect(scheduledTrainingWeekdays(graph)).toEqual([4, 0]);
    }
    graph.program.scheduleType = 'cycle';
    expect(trainingCalendar(graph, [], now).dated).toBe(false);
    expect(trainingCalendar(graph, [], now).startableToday?.day.id).toBe(graph.days[0]?.day.id);
    expect(trainingCalendar(graph, [], now, graph.days[0]!.day.id).startableToday?.day.id).toBe(
      graph.days[1]?.day.id,
    );
    expect(scheduledTrainingWeekdays(graph)).toBeNull();
    expect(graph.days.map(({ day }) => day.weekday)).toEqual([4, 0]);
  });

  it('retains and restores long cycles and recovery metadata', async () => {
    const db = createTestDatabase();
    const programs = new ProgramRepository(db);
    const program = await programs.create({
      name: 'Long cycle',
      scheduleType: 'cycle',
      draft: true,
    });
    for (let index = 0; index < 8; index++)
      await programs.addDay({ programId: program.id, name: `Day ${index}` });
    const graph = (await programs.get(program.id))!;
    await db.table('programDays').update(graph.days[0]!.day.id, { kind: 'recovery' });
    await programs.duplicateDay(graph.days[1]!.day.id);
    await new ProgramBuilderService(db).finish(program.id);
    const service = new BackupService(new DataSafetyRepository(db), new AppSettingsRepository(db));
    const backup = await service.createBackup();
    expect(backup.data.programDays).toHaveLength(9);
    expect(backup.data.programDays).toContainEqual(expect.objectContaining({ kind: 'recovery' }));
    await service.restore(await service.prepareRestore(service.serialize(backup)));
    expect((await programs.get(program.id))?.program.scheduleType).toBe('cycle');
    expect((await programs.get(program.id))?.days).toHaveLength(9);
  });

  it('still rejects corrupt known fields and malformed schedule modes before restore writes', async () => {
    const db = createTestDatabase();
    const programs = new ProgramRepository(db);
    const program = await programs.create({ name: 'Safe', scheduleType: 'weekly' });
    expect(programSchema.safeParse({ ...program, archived: 'no' }).success).toBe(false);
    expect(programSchema.safeParse({ ...program, scheduleType: { type: 'weekly' } }).success).toBe(
      false,
    );
    expect(
      programDaySchema.safeParse({ ...version3DayFixture, order: 1, notes: null, weekday: 7 })
        .success,
    ).toBe(false);
    const service = new BackupService(new DataSafetyRepository(db), new AppSettingsRepository(db));
    const backup = await service.createBackup();
    const corrupt = {
      ...backup,
      data: { ...backup.data, programs: [{ ...program, scheduleType: 42 }] },
    };
    corrupt.checksum = await sha256(withoutChecksum(corrupt));
    await expect(service.prepareRestore(JSON.stringify(corrupt))).rejects.toMatchObject({
      code: 'invalid-schema',
    });
    expect(await programs.list()).toEqual([program]);
  });
});

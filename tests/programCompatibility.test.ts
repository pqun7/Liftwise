import { afterEach, describe, expect, it } from 'vitest';

import { programDaySchema, programSchema } from '../src/domain/validation';
import { BackupService } from '../src/features/dataSafety/backupService';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { DataSafetyRepository } from '../src/lib/storage/repositories/dataSafetyRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);

describe('persisted scheduling metadata compatibility', () => {
  it.each(['weekly', 'cycle'] as const)(
    'opens, edits and backs up existing %s programs without losing metadata',
    async (scheduleType) => {
      const db = createTestDatabase('program-compatibility');
      const programs = new ProgramRepository(db);
      const program = await programs.create({ name: 'Existing plan' });
      const workout = await programs.addDay({ programId: program.id, name: 'Training' });
      const recovery = await programs.addDay({ programId: program.id, name: 'Rest' });
      // Reproduce records written by the previous scheduling build in the same v6 database.
      const persistedProgram = { ...program, scheduleType };
      const persistedDays = [
        { ...workout, kind: 'workout' },
        { ...recovery, kind: 'recovery' },
      ];
      await db.table('programs').put(persistedProgram);
      await db.table('programDays').bulkPut(persistedDays);
      db.close();
      await db.open();

      expect(await programs.list()).toEqual([persistedProgram]);
      expect((await programs.get(program.id))?.days.map(({ day }) => day)).toEqual(persistedDays);
      await programs.update(program.id, { name: 'Edited plan' });
      await programs.updateDay(workout.id, { notes: 'Keep metadata' });
      expect(await db.programs.get(program.id)).toMatchObject({ scheduleType });
      expect(await db.programDays.get(workout.id)).toMatchObject({ kind: 'workout' });

      const repository = new DataSafetyRepository(db);
      const service = new BackupService(repository, new AppSettingsRepository(db));
      const before = await repository.exportUserData();
      const backup = await service.createBackup();
      const prepared = await service.prepareRestore(service.serialize(backup));
      await service.restore(prepared);
      db.close();
      await db.open();
      expect(await repository.exportUserData()).toEqual(before);
    },
  );

  it('still rejects unknown keys and invalid scheduling values', () => {
    const stamp = '2026-10-06T12:00:00.000Z';
    const program = {
      id: crypto.randomUUID(),
      name: 'Strict plan',
      description: null,
      archived: false,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const day = {
      id: crypto.randomUUID(),
      programId: program.id,
      name: 'Training',
      order: 1,
      notes: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    expect(programSchema.safeParse({ ...program, scheduleType: 'invalid' }).success).toBe(false);
    expect(programSchema.safeParse({ ...program, unknownKey: true }).success).toBe(false);
    expect(programDaySchema.safeParse({ ...day, kind: 'invalid' }).success).toBe(false);
    expect(programDaySchema.safeParse({ ...day, unknownKey: true }).success).toBe(false);
    expect(programSchema.parse(program)).toEqual(program);
    expect(programDaySchema.parse(day)).toEqual(day);
  });
});

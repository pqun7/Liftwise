import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgramBuilderService } from '../src/features/plan/builderService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { DataSafetyRepository } from '../src/lib/storage/repositories/dataSafetyRepository';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { BackupService } from '../src/features/dataSafety/backupService';
import { programSchema } from '../src/domain/validation';
import { validateBackupRelationships } from '../src/lib/backup/backupValidation';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
afterEach(cleanupTestDatabases);

describe('durable Program Builder', () => {
  it('keeps drafts inactive and recovers metadata/days after reopen', async () => {
    const db = createTestDatabase('builder');
    const builder = new ProgramBuilderService(db);
    const repository = new ProgramRepository(db);
    const program = await builder.saveBasics({
      name: 'PPL',
      goal: 'strength',
      level: 'intermediate',
    });
    expect(await repository.getActiveId()).toBeNull();
    await expect(repository.setActive(program.id)).rejects.toThrow('Save');
    await builder.chooseDays(program.id, [4, 0, 2], 'ppl');
    db.close();
    await db.open();
    const graph = await repository.get(program.id);
    expect(graph?.program).toMatchObject({
      draft: true,
      goal: 'strength',
      level: 'intermediate',
      splitTemplate: 'ppl',
    });
    expect(graph?.days.map(({ day }) => [day.weekday, day.name])).toEqual([
      [0, 'Push Day'],
      [2, 'Pull Day'],
      [4, 'Legs Day'],
    ]);
    await expect(
      new WorkoutRepository(db).startPlannedWorkout(graph!.days[0]!.day.id),
    ).rejects.toThrow('Save');
    await builder.finish(program.id);
    expect(await repository.getActiveId()).toBe(program.id);
    expect(await db.workoutSessions.count()).toBe(0);
  });
  it('preserves IDs, custom names and prescriptions when templates/weekday choices change', async () => {
    const db = createTestDatabase();
    const builder = new ProgramBuilderService(db);
    const repository = new ProgramRepository(db);
    const program = await repository.create({ name: 'Existing' });
    const day = await repository.addDay({
      programId: program.id,
      name: 'My Push',
      notes: 'Keep me',
    });
    const custom = await new ExerciseRepository(db).create({
      name: 'Custom Press',
      primaryMuscle: 'chest',
    });
    const prescription = await repository.addExercise({
      programDayId: day.id,
      exerciseId: custom.id,
      targetSets: 3,
    });
    await builder.chooseDays(program.id, [1, 4], 'upper-lower');
    await builder.chooseDays(program.id, [1, 4], 'ppl');
    expect((await repository.get(program.id))?.days[0]).toMatchObject({
      day: { id: day.id, name: 'My Push', notes: 'Keep me', weekday: 1 },
      exercises: [{ id: prescription.id, exerciseId: custom.id }],
    });
  });
  it('rejects invalid/duplicate weekdays and rolls back unconfirmed destructive selection', async () => {
    const db = createTestDatabase();
    const builder = new ProgramBuilderService(db);
    const repository = new ProgramRepository(db);
    const program = await builder.saveBasics({ name: 'Safe' });
    await builder.chooseDays(program.id, [0, 2, 4], 'ppl');
    const before = await repository.get(program.id);
    for (const invalid of [[], [0, 0], [-1], [7]])
      await expect(builder.chooseDays(program.id, invalid, 'custom')).rejects.toThrow();
    await expect(builder.chooseDays(program.id, [0], 'custom')).rejects.toThrow('Confirm');
    expect(await repository.get(program.id)).toEqual(before);
    await expect(
      repository.addDay({ programId: program.id, name: 'Conflict', weekday: 0 }),
    ).rejects.toThrow('weekday');
  });
  it('day removal preserves completed snapshots and session prescriptions', async () => {
    const db = createTestDatabase();
    const builder = new ProgramBuilderService(db);
    const repository = new ProgramRepository(db);
    const workouts = new WorkoutRepository(db);
    const program = await builder.saveBasics({ name: 'History' });
    const graph = await builder.chooseDays(program.id, [0, 2], 'ppl');
    const exercise = await new ExerciseRepository(db).create({
      name: 'Bench',
      primaryMuscle: 'chest',
    });
    await repository.addExercise({
      programDayId: graph!.days[1]!.day.id,
      exerciseId: exercise.id,
      targetSets: 3,
      minReps: 8,
      maxReps: 8,
    });
    await builder.finish(program.id);
    const workout = await workouts.startPlannedWorkout(graph!.days[1]!.day.id);
    await workouts.finish(workout.session.id);
    await builder.chooseDays(program.id, [0], 'custom', true);
    const history = await workouts.get(workout.session.id);
    expect(history?.exercises[0]?.exercise.plannedTargetSets).toBe(3);
    expect(history?.exercises[0]?.exercise.plannedMinReps).toBe(8);
    expect(history?.session.programDayId).toBeNull();
  });
  it('round-trips draft and saved optional metadata through the unchanged backup pipeline', async () => {
    const db = createTestDatabase();
    const builder = new ProgramBuilderService(db);
    const repository = new DataSafetyRepository(db);
    const service = new BackupService(repository, new AppSettingsRepository(db));
    const program = await builder.saveBasics({
      name: 'Backup',
      goal: 'hypertrophy',
      level: 'beginner',
    });
    await builder.chooseDays(program.id, [0, 3], 'custom');
    const before = await repository.exportUserData();
    const invalid = structuredClone(before);
    invalid.programDays[1]!.weekday = invalid.programDays[0]!.weekday;
    expect(() => validateBackupRelationships(invalid, new Set())).toThrow(
      'duplicate training weekdays',
    );
    const backup = await service.createBackup();
    const prepared = await service.prepareRestore(service.serialize(backup));
    await service.deleteAllUserData();
    await service.restore(prepared);
    db.close();
    await db.open();
    expect(await repository.exportUserData()).toEqual(before);
    const historical = { ...before.programs[0]! };
    delete historical.goal;
    delete historical.level;
    delete historical.splitTemplate;
    delete historical.draft;
    expect(programSchema.parse(historical)).toEqual(historical);
  });
  it('rolls back all day changes when a later write fails', async () => {
    const db = createTestDatabase();
    const builder = new ProgramBuilderService(db);
    const repository = new ProgramRepository(db);
    const program = await builder.saveBasics({ name: 'Rollback' });
    await builder.chooseDays(program.id, [0, 2], 'ppl');
    const before = await repository.get(program.id);
    const failure = vi
      .spyOn(db.programDays, 'add')
      .mockRejectedValueOnce(new Error('Storage full'));
    await expect(builder.chooseDays(program.id, [0, 4], 'custom', true)).rejects.toThrow(
      'Storage full',
    );
    failure.mockRestore();
    expect(await repository.get(program.id)).toEqual(before);
  });
});

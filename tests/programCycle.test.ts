import { afterEach, expect, it } from 'vitest';
import { ProgramBuilderService } from '../src/features/plan/builderService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { programSchema, programDaySchema } from '../src/domain/validation';
import { trainingCalendar } from '../src/domain/trainingCalendar';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
afterEach(cleanupTestDatabases);

it('keeps cycle ordering, real recovery entries and prescriptions across duplication and database reopening', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const builder = new ProgramBuilderService(db);
  const program = await builder.saveBasics({ name: 'Cycle', scheduleType: 'cycle' });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Bench',
    primaryMuscle: 'chest',
  });
  const push = await repo.addDay({ programId: program.id, name: 'Push', kind: 'workout' });
  await repo.addExercise({
    programDayId: push.id,
    exerciseId: exercise.id,
    targetSets: 3,
    minReps: 6,
    maxReps: 8,
    targetRirMin: 2,
    targetRirMax: 2,
    restSeconds: 150,
  });
  const rest = await repo.addDay({ programId: program.id, name: 'Recovery', kind: 'recovery' });
  for (let i = 0; i < 6; i++) await repo.addDay({ programId: program.id, name: `Day ${i + 3}` });
  const copy = await repo.duplicateDay(push.id);
  await repo.updateDay(copy.day.id, { name: 'Push B' });
  const graph = (await repo.get(program.id))!;
  const ids = graph.days.map(({ day }) => day.id);
  await repo.reorderDays(program.id, [copy.day.id, ...ids.filter((id) => id !== copy.day.id)]);
  await builder.finish(program.id, true);
  db.close();
  await db.open();
  const reopened = (await repo.get(program.id))!;
  expect(reopened.days).toHaveLength(9);
  expect(reopened.days[0]).toMatchObject({
    day: { name: 'Push B' },
    exercises: [{ targetSets: 3, minReps: 6, maxReps: 8, targetRirMin: 2, restSeconds: 150 }],
  });
  expect(reopened.days.find(({ day }) => day.id === rest.id)).toMatchObject({
    day: { kind: 'recovery' },
    exercises: [],
  });
  expect(await repo.getActiveId()).toBe(program.id);
  expect(
    trainingCalendar(reopened, [], new Date()).upcoming.map(({ entry }) => entry.day.name),
  ).toEqual(['Push B', 'Push']);
  await expect(
    repo.addExercise({ programDayId: rest.id, exerciseId: exercise.id }),
  ).rejects.toThrow('workout day');
  await expect(new WorkoutRepository(db).startPlannedWorkout(rest.id)).rejects.toThrow('Recovery');
  await expect(builder.setScheduleType(program.id, 'weekly')).rejects.toThrow(
    'Keep Flexible Cycle',
  );
  expect((await repo.get(program.id))?.days).toHaveLength(9);
});

it('switches a weekly draft to a cycle without replacing saved day or prescription IDs', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const builder = new ProgramBuilderService(db);
  const program = await builder.saveBasics({ name: 'Existing' });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Press',
    primaryMuscle: 'chest',
  });
  const day = await repo.addDay({
    programId: program.id,
    name: 'My Upper',
    weekday: 2,
    notes: 'Keep me',
  });
  const target = await repo.addExercise({
    programDayId: day.id,
    exerciseId: exercise.id,
    targetSets: 4,
  });
  await builder.setScheduleType(program.id, 'cycle');
  expect((await repo.get(program.id))?.days[0]).toMatchObject({
    day: { id: day.id, name: 'My Upper', weekday: null, notes: 'Keep me' },
    exercises: [{ id: target.id, targetSets: 4 }],
  });
  const existing = await repo.create({ name: 'Active' });
  await builder.finish(program.id, false);
  expect(await repo.getActiveId()).toBe(existing.id);
  await builder.finish(program.id, true);
  expect(await repo.getActiveId()).toBe(program.id);
});

it('accepts legacy record shapes and validates optional cycle fields without an IndexedDB migration', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const program = await repo.create({ name: 'Legacy' });
  const day = await repo.addDay({ programId: program.id, name: 'Upper', weekday: 0 });
  expect(programSchema.parse(program).scheduleType).toBeUndefined();
  expect(programDaySchema.parse(day).kind).toBeUndefined();
  expect(programSchema.parse({ ...program, scheduleType: 'cycle' }).scheduleType).toBe('cycle');
  expect(programDaySchema.parse({ ...day, kind: 'recovery' }).kind).toBe('recovery');
  await expect(
    repo.addDay({ programId: program.id, name: 'Duplicate weekday', weekday: 0 }),
  ).rejects.toThrow('weekday');
});

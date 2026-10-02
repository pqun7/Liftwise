import { afterEach, expect, it } from 'vitest';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { nextProgramWorkout, chronologicalDays } from '../src/features/plan/programDisplay';
import type { WorkoutSession } from '../src/domain/entities';

afterEach(cleanupTestDatabases);

it('limits creation and duplication to seven days and validates duplicate weekdays atomically', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const program = await repo.create({ name: 'Week' });
  const day = await repo.addDay({ programId: program.id, name: 'Upper', weekday: 0 });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Press',
    primaryMuscle: 'chest',
  });
  const target = await repo.addExercise({
    programDayId: day.id,
    exerciseId: exercise.id,
    targetSets: 3,
    minReps: 8,
    maxReps: 12,
    restSeconds: 90,
  });
  await expect(repo.duplicateDay(day.id, 0)).rejects.toThrow('already has');
  const copy = await repo.duplicateDay(day.id, 6);
  expect(copy.day.weekday).toBe(6);
  expect(copy.day.id).not.toBe(day.id);
  expect(copy.exercises[0]).toMatchObject({
    targetSets: 3,
    minReps: 8,
    maxReps: 12,
    restSeconds: 90,
  });
  expect(copy.exercises[0]!.id).not.toBe(target.id);
  await expect(repo.updateDay(day.id, { weekday: 6 })).rejects.toThrow('already has');
  for (let weekday = 1; weekday < 6; weekday++)
    await repo.addDay({ programId: program.id, name: `Day ${weekday}`, weekday });
  await expect(repo.addDay({ programId: program.id, name: 'Eighth' })).rejects.toThrow('seven');
  await expect(repo.duplicateDay(day.id)).rejects.toThrow('seven');
  expect((await repo.get(program.id))!.days).toHaveLength(7);
  await repo.deleteDay(copy.day.id);
  expect(await db.programExercises.where('programDayId').equals(copy.day.id).count()).toBe(0);
  expect((await repo.duplicateDay(day.id, 6)).day.weekday).toBe(6);
  db.close();
  await db.open();
  expect((await repo.get(program.id))!.days).toHaveLength(7);
});

it('derives next workout across rest days, completion, empty days and Sunday rollover', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const program = await repo.create({ name: 'Next' });
  const sunday = await repo.addDay({ programId: program.id, name: 'Sunday', weekday: 6 });
  const monday = await repo.addDay({ programId: program.id, name: 'Monday', weekday: 0 });
  await repo.addDay({ programId: program.id, name: 'Empty Friday', weekday: 4 });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Press',
    primaryMuscle: 'chest',
  });
  for (const day of [sunday, monday])
    await repo.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 3 });
  const graph = (await repo.get(program.id))!;
  const now = new Date(2026, 9, 4, 12);
  expect(nextProgramWorkout(graph, [], now)?.day.id).toBe(sunday.id);
  const completed = [
    {
      status: 'completed',
      programDayId: sunday.id,
      endedAt: now.toISOString(),
      startedAt: now.toISOString(),
    } as WorkoutSession,
  ];
  expect(nextProgramWorkout(graph, completed, now)?.day.id).toBe(monday.id);
  expect(nextProgramWorkout(graph, [], new Date(2026, 9, 2, 12))?.day.id).toBe(sunday.id);
  expect(chronologicalDays(graph.days).map(({ day }) => day.weekday)).toEqual([0, 4, 6]);
  expect(nextProgramWorkout({ ...graph, days: [] }, [], now)).toBeNull();
  expect(nextProgramWorkout({ ...graph, days: [graph.days[0]!] }, completed, now)?.day.id).toBe(
    sunday.id,
  );
});

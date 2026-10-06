import { afterEach, expect, it, vi } from 'vitest';
import { ProgramBuilderService } from '../src/features/plan/builderService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

afterEach(cleanupTestDatabases);

async function fixture(scheduleType: 'weekly' | 'cycle' = 'weekly') {
  const db = createTestDatabase('custom-schedule');
  const builder = new ProgramBuilderService(db);
  const repo = new ProgramRepository(db);
  const program = await builder.saveBasics({ name: 'Custom QA', scheduleType });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Custom press',
    primaryMuscle: 'chest',
  });
  return { db, builder, repo, program, exercise };
}

it('creates a weekly custom schedule without adding exercises, then preserves manually added targets on revisiting Schedule', async () => {
  const { db, builder, repo, program, exercise } = await fixture();
  const graph = (await builder.useCustomTemplate(program.id, [4, 0, 2]))!;
  expect(graph.program.splitTemplate).toBe('custom');
  expect(graph.days.map(({ day, exercises }) => [day.weekday, exercises.length])).toEqual([
    [0, 0],
    [2, 0],
    [4, 0],
  ]);
  const day = graph.days[0]!.day;
  const target = await repo.addExercise({
    programDayId: day.id,
    exerciseId: exercise.id,
    targetSets: 4,
    restSeconds: 90,
  });
  await repo.updateDay(day.id, { name: 'My push', notes: 'Keep this' });
  await builder.chooseDays(program.id, [0, 2, 4], 'custom');
  db.close();
  await db.open();
  expect((await repo.get(program.id))?.days[0]).toMatchObject({
    day: { id: day.id, name: 'My push', notes: 'Keep this' },
    exercises: [{ id: target.id, targetSets: 4, restSeconds: 90 }],
  });
});

it('guards replacement and keeps completed session snapshots when an existing program becomes blank Custom', async () => {
  const { db, builder, repo, program, exercise } = await fixture();
  const day = await repo.addDay({ programId: program.id, name: 'Preset push', weekday: 0 });
  await repo.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 4 });
  await builder.finish(program.id, true);
  const workouts = new WorkoutRepository(db);
  const workout = await workouts.startPlannedWorkout(day.id);
  await workouts.finish(workout.session.id);
  const before = await repo.get(program.id);
  await expect(builder.useCustomTemplate(program.id, [0, 2, 4])).rejects.toThrow('Confirm');
  expect(await repo.get(program.id)).toEqual(before);
  const blank = (await builder.useCustomTemplate(program.id, [0, 2, 4], true))!;
  expect(blank.days.every(({ exercises }) => exercises.length === 0)).toBe(true);
  expect(blank.program.draft).toBe(false);
  expect(await repo.getActiveId()).toBe(program.id);
  expect((await workouts.get(workout.session.id))?.exercises[0]?.exercise.plannedTargetSets).toBe(
    4,
  );
  expect((await workouts.get(workout.session.id))?.session.programDayId).toBeNull();
});

it('starts a custom cycle empty and adds blank workout / real recovery days without catalog targets', async () => {
  const { builder, repo, program, exercise } = await fixture('cycle');
  const old = await repo.addDay({ programId: program.id, name: 'Old upper' });
  await repo.addExercise({ programDayId: old.id, exerciseId: exercise.id });
  const blank = (await builder.useCustomTemplate(program.id, undefined, true))!;
  expect(blank.days).toHaveLength(0);
  expect(blank.program.splitTemplate).toBe('custom');
  const workout = await builder.addCycleWorkout(program.id, 'Push');
  await repo.addDay({ programId: program.id, name: 'Recovery', kind: 'recovery' });
  const graph = (await repo.get(program.id))!;
  expect(graph.days).toHaveLength(2);
  expect(graph.days.every(({ exercises }) => exercises.length === 0)).toBe(true);
  expect(graph.days[0]?.day.id).toBe(workout.id);
  expect(graph.days[1]?.day.kind).toBe('recovery');
  await builder.finish(program.id);
});

it('rolls back Custom replacement completely on storage failure or invalid weekdays', async () => {
  const { db, builder, repo, program, exercise } = await fixture();
  const day = await repo.addDay({ programId: program.id, name: 'Keep', weekday: 0 });
  await repo.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 3 });
  const before = await repo.get(program.id);
  await expect(builder.useCustomTemplate(program.id, [0, 0], true)).rejects.toThrow();
  const failure = vi.spyOn(db.programDays, 'add').mockRejectedValueOnce(new Error('Storage full'));
  await expect(builder.useCustomTemplate(program.id, [2], true)).rejects.toThrow('Storage full');
  failure.mockRestore();
  expect(await repo.get(program.id)).toEqual(before);
});

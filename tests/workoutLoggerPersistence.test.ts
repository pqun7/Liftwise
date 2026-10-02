import { afterEach, expect, it } from 'vitest';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
afterEach(cleanupTestDatabases);

it('prefills planned and quick sets from completed history, never marks them completed, and restores rest extensions', async () => {
  const db = createTestDatabase('logger');
  const repo = new WorkoutRepository(db);
  const custom = await new ExerciseRepository(db).create({ name: 'Bench', primaryMuscle: 'chest' });
  const history = await repo.createSession({ startedAt: '2026-09-01T00:00:00.000Z' });
  const prior = await repo.addExercise({ workoutSessionId: history.id, exerciseId: custom.id });
  await repo.addSet({
    workoutExerciseId: prior.id,
    setType: 'working',
    weight: 62.5,
    reps: 8,
    rir: 3,
    completed: true,
  });
  await repo.finish(history.id);
  const programs = new ProgramRepository(db);
  const program = await programs.create({ name: 'Strength' });
  const day = await programs.addDay({ programId: program.id, name: 'Push' });
  await programs.addExercise({
    programDayId: day.id,
    exerciseId: custom.id,
    targetSets: 3,
    minReps: 6,
    maxReps: 8,
    targetRirMin: 1,
    targetRirMax: 2,
    restSeconds: 180,
  });
  const workout = await repo.startPlannedWorkout(day.id);
  for (const set of workout.exercises[0]!.sets)
    expect(set).toMatchObject({ weight: 62.5, reps: 8, rir: 3, completed: false });
  const undo = await repo.completeSet(workout.exercises[0]!.sets[0]!.id, {});
  const before = (await repo.get(workout.session.id))!.session;
  const extended = await repo.extendRest(workout.session.id);
  expect(Date.parse(extended.restEndsAt!) - Date.parse(before.restEndsAt!)).toBe(30000);
  expect(extended.restStartedAt).toBe(before.restStartedAt);
  db.close();
  const reopened = new LiftwiseDatabase(db.name);
  try {
    expect(
      (await new WorkoutRepository(reopened).get(workout.session.id))!.session.restEndsAt,
    ).toBe(extended.restEndsAt);
  } finally {
    reopened.close();
  }
  await db.open();
  await repo.undoCompletion(undo);
  expect((await repo.get(workout.session.id))!.exercises[0]!.sets[0]!.completed).toBe(false);
  await repo.completeSet(workout.exercises[0]!.sets[1]!.id, {});
  await repo.finish(workout.session.id);
  const quick = await repo.createSession();
  const exercise = await repo.addExercise({ workoutSessionId: quick.id, exerciseId: custom.id });
  expect(await repo.addSet({ workoutExerciseId: exercise.id, setType: 'working' })).toMatchObject({
    weight: 62.5,
    completed: false,
  });
});

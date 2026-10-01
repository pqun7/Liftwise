import { afterEach, describe, expect, it } from 'vitest';

import { calculateWorkoutVolume } from '../src/domain/calculations';
import { workoutSetSchema } from '../src/domain/validation';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { cleanupTestDatabases, createTestDatabase, trackDatabaseName } from './helpers/database';

afterEach(cleanupTestDatabases);

describe('WorkoutRepository', () => {
  it('persists a complete workout graph across database close and reload', async () => {
    const name = `liftwise-workout-reload-${crypto.randomUUID()}`;
    trackDatabaseName(name);
    const firstDatabase = new LiftwiseDatabase(name);
    const exercises = new ExerciseRepository(firstDatabase);
    const workouts = new WorkoutRepository(firstDatabase);
    const exercise = await exercises.create({
      name: 'Incline Press',
      primaryMuscle: 'pectorals',
    });
    const session = await workouts.createSession({ name: 'Push Session' });
    const workoutExercise = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: exercise.id,
      order: 1,
    });
    const set = await workouts.addSet({
      workoutExerciseId: workoutExercise.id,
      setNumber: 1,
      setType: 'working',
      weight: 70,
      reps: 8,
      rir: 2,
      completed: true,
    });
    firstDatabase.close();

    const reloadedDatabase = new LiftwiseDatabase(name);
    const reloadedWorkout = await new WorkoutRepository(reloadedDatabase).get(session.id);

    expect(reloadedWorkout?.session).toEqual(session);
    expect(reloadedWorkout?.exercises[0]?.exercise).toEqual(workoutExercise);
    expect(reloadedWorkout?.exercises[0]?.sets).toEqual([set]);
    reloadedDatabase.close();
  });

  it('writes set updates immediately and derives volume from completed sets', async () => {
    const database = createTestDatabase('workout-update');
    const exercises = new ExerciseRepository(database);
    const workouts = new WorkoutRepository(database);
    const exercise = await exercises.create({ name: 'Row', primaryMuscle: 'latissimus_dorsi' });
    const session = await workouts.createSession();
    const workoutExercise = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: exercise.id,
      order: 1,
    });
    const draftSet = await workouts.addSet({
      workoutExerciseId: workoutExercise.id,
      setNumber: 1,
      setType: 'working',
    });
    const completedSet = await workouts.updateSet(draftSet.id, {
      weight: 100,
      reps: 5,
      rir: 1,
      completed: true,
    });

    expect(await database.workoutSets.get(draftSet.id)).toEqual(completedSet);
    expect(calculateWorkoutVolume([completedSet])).toBe(500);
    expect('volume' in completedSet).toBe(false);
  });

  it('rejects completed sets without weight and reps', () => {
    expect(() =>
      workoutSetSchema.parse({
        id: crypto.randomUUID(),
        workoutExerciseId: crypto.randomUUID(),
        setNumber: 1,
        setType: 'failure',
        weight: null,
        reps: null,
        rir: null,
        completed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toThrow(/Completed sets require/);
  });

  it('cascades workout deletion through exercises and sets', async () => {
    const database = createTestDatabase('workout-delete');
    const exercises = new ExerciseRepository(database);
    const workouts = new WorkoutRepository(database);
    const exercise = await exercises.create({ name: 'Curl', primaryMuscle: 'biceps' });
    const session = await workouts.createSession();
    const workoutExercise = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: exercise.id,
      order: 1,
    });
    await workouts.addSet({
      workoutExerciseId: workoutExercise.id,
      setNumber: 1,
      setType: 'warmup',
    });

    await workouts.deleteSession(session.id);

    expect(await database.workoutSessions.count()).toBe(0);
    expect(await database.workoutExercises.count()).toBe(0);
    expect(await database.workoutSets.count()).toBe(0);
  });

  it('rejects relationships to records that do not exist', async () => {
    const database = createTestDatabase('workout-relationships');
    const workouts = new WorkoutRepository(database);

    await expect(
      workouts.addSet({
        workoutExerciseId: crypto.randomUUID(),
        setNumber: 1,
        setType: 'working',
      }),
    ).rejects.toThrow(/WorkoutExercise/);
  });
});

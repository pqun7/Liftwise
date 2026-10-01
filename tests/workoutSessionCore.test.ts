import { afterEach, describe, expect, it } from 'vitest';

import { restRemainingSeconds, workoutElapsedSeconds } from '../src/domain/workoutTime';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { cleanupTestDatabases, createTestDatabase, trackDatabaseName } from './helpers/database';

afterEach(cleanupTestDatabases);

async function createPlannedWorkout(database: LiftwiseDatabase) {
  const exercises = new ExerciseRepository(database);
  const programs = new ProgramRepository(database);
  const workouts = new WorkoutRepository(database);
  const exercise = await exercises.create({ name: 'Bench Press', primaryMuscle: 'chest' });
  const program = await programs.create({ name: 'Push Pull Legs' });
  const day = await programs.addDay({ programId: program.id, name: 'Push Day' });
  const prescription = await programs.addExercise({
    programDayId: day.id,
    exerciseId: exercise.id,
    targetSets: 3,
    minReps: 8,
    maxReps: 8,
    targetRirMin: 1,
    targetRirMax: 2,
    restSeconds: 180,
    notes: 'Controlled eccentric',
  });
  const workout = await workouts.startPlannedWorkout(day.id, '2026-10-01T10:00:00.000Z');
  return { exercise, program, day, prescription, workout, workouts, programs };
}

describe('Workout session core', () => {
  it('snapshots a planned prescription independently from later program edits', async () => {
    const database = createTestDatabase('workout-snapshot');
    const { prescription, workout, workouts, programs } = await createPlannedWorkout(database);

    await programs.updateExercise(prescription.id, {
      targetSets: 4,
      minReps: 6,
      maxReps: 6,
      targetRirMin: 0,
      targetRirMax: 1,
      restSeconds: 240,
      notes: 'Changed later',
    });
    await workouts.finish(workout.session.id, new Date('2026-10-01T11:00:00.000Z'));
    const history = await workouts.get(workout.session.id);

    expect(history?.session.status).toBe('completed');
    expect(history?.exercises[0]?.exercise).toMatchObject({
      exerciseName: 'Bench Press',
      plannedTargetSets: 3,
      plannedMinReps: 8,
      plannedMaxReps: 8,
      plannedRirMin: 1,
      plannedRirMax: 2,
      plannedRestSeconds: 180,
      plannedNotes: 'Controlled eccentric',
    });
    expect(history?.exercises[0]?.sets).toHaveLength(3);
  });

  it('starts a quick workout without a program and persists session-only exercises', async () => {
    const database = createTestDatabase('quick-workout');
    const exercises = new ExerciseRepository(database);
    const workouts = new WorkoutRepository(database);
    const custom = await exercises.create({ name: 'My Cable Press', primaryMuscle: 'chest' });

    const session = await workouts.createSession({ name: 'Quick Workout' });
    const added = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: custom.id,
    });

    expect(session).toMatchObject({ programId: null, programDayId: null, status: 'active' });
    expect(added).toMatchObject({
      exerciseId: custom.id,
      exerciseName: 'My Cable Press',
      programExerciseId: null,
    });
    expect(await database.programExercises.count()).toBe(0);
  });

  it('persists set create, complete, edit, and delete actions immediately', async () => {
    const database = createTestDatabase('set-actions');
    const { workout, workouts } = await createPlannedWorkout(database);
    const set = workout.exercises[0]!.sets[0]!;

    await workouts.updateSet(set.id, { weight: 80, reps: 8, rir: 2, completed: true });
    expect(await database.workoutSets.get(set.id)).toMatchObject({
      weight: 80,
      reps: 8,
      rir: 2,
      completed: true,
    });
    await workouts.updateSet(set.id, { weight: 82.5, reps: 7 });
    expect(await database.workoutSets.get(set.id)).toMatchObject({ weight: 82.5, reps: 7 });
    await workouts.deleteSet(set.id);
    expect(await database.workoutSets.get(set.id)).toBeUndefined();
  });

  it('persists exercise add, reorder, remove, notes, and current exercise changes', async () => {
    const database = createTestDatabase('workout-actions');
    const exercises = new ExerciseRepository(database);
    const workouts = new WorkoutRepository(database);
    const firstSource = await exercises.create({ name: 'Row', primaryMuscle: 'back' });
    const secondSource = await exercises.create({ name: 'Curl', primaryMuscle: 'biceps' });
    const session = await workouts.createSession();
    const first = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: firstSource.id,
    });
    const second = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: secondSource.id,
    });

    await workouts.reorderExercises(session.id, [second.id, first.id]);
    await workouts.setCurrentExercise(session.id, second.id);
    await workouts.updateSessionNotes(session.id, 'Saved immediately');
    await workouts.removeExercise(first.id);
    const persisted = await workouts.get(session.id);

    expect(persisted?.session).toMatchObject({
      currentExerciseId: second.id,
      notes: 'Saved immediately',
    });
    expect(persisted?.exercises.map(({ exercise }) => [exercise.id, exercise.order])).toEqual([
      [second.id, 1],
    ]);
  });

  it('derives rest and elapsed timers from persisted timestamps', async () => {
    const database = createTestDatabase('workout-timers');
    const workouts = new WorkoutRepository(database);
    const session = await workouts.createSession({ startedAt: '2026-10-01T10:00:00.000Z' });
    const resting = await workouts.startRest(session.id, 180, new Date('2026-10-01T10:05:00.000Z'));
    expect(restRemainingSeconds(resting, new Date('2026-10-01T10:06:00.000Z').getTime())).toBe(120);
    const paused = await workouts.pause(session.id, new Date('2026-10-01T10:10:00.000Z'));
    expect(workoutElapsedSeconds(paused, new Date('2026-10-01T10:20:00.000Z').getTime())).toBe(600);
    const resumed = await workouts.resume(session.id, new Date('2026-10-01T10:20:00.000Z'));
    expect(resumed.pausedDurationSeconds).toBe(600);
    expect(workoutElapsedSeconds(resumed, new Date('2026-10-01T10:25:00.000Z').getTime())).toBe(
      900,
    );
  });

  it('recovers exactly two completed sets after database close and reopen', async () => {
    const name = `liftwise-workout-crash-${crypto.randomUUID()}`;
    trackDatabaseName(name);
    const firstDatabase = new LiftwiseDatabase(name);
    const { workout, workouts } = await createPlannedWorkout(firstDatabase);
    const [first, second] = workout.exercises[0]!.sets;
    await workouts.updateSet(first!.id, { weight: 80, reps: 8, completed: true });
    await workouts.updateSet(second!.id, { weight: 80, reps: 8, completed: true });
    firstDatabase.close();

    const reopened = new LiftwiseDatabase(name);
    const recovered = await new WorkoutRepository(reopened).getUnfinished();
    const completed = recovered?.exercises
      .flatMap(({ sets }) => sets)
      .filter(({ completed }) => completed);

    expect(recovered?.session.id).toBe(workout.session.id);
    expect(completed?.map(({ id }) => id)).toEqual([first!.id, second!.id]);
    expect(new Set(completed?.map(({ id }) => id)).size).toBe(2);
    reopened.close();
  });

  it('finishes a workout, removes it from recovery, and uses only completed prior performance', async () => {
    const database = createTestDatabase('workout-finish');
    const { exercise, workout, workouts } = await createPlannedWorkout(database);
    const set = workout.exercises[0]!.sets[0]!;
    await workouts.updateSet(set.id, { weight: 90, reps: 8, completed: true });
    await workouts.finish(workout.session.id, new Date('2026-10-01T11:00:00.000Z'));

    const next = await workouts.createSession({
      name: 'Later',
      startedAt: '2026-10-02T10:00:00.000Z',
    });
    expect(await workouts.getUnfinished()).toMatchObject({ session: { id: next.id } });
    expect(await workouts.getPreviousCompletedExercise(exercise.id, next.startedAt)).toMatchObject({
      sets: [{ id: set.id, completed: true }],
    });
    expect((await workouts.listCompleted()).map(({ session }) => session.id)).toEqual([
      workout.session.id,
    ]);
  });

  it('keeps completed snapshot history readable after deleting its source program', async () => {
    const database = createTestDatabase('workout-program-delete');
    const { program, workout, workouts, programs } = await createPlannedWorkout(database);
    const set = workout.exercises[0]!.sets[0]!;
    await workouts.updateSet(set.id, { weight: 85, reps: 8, completed: true });
    await workouts.finish(workout.session.id, new Date('2026-10-01T11:00:00.000Z'));

    await programs.delete(program.id);
    const history = await workouts.get(workout.session.id);

    expect(history?.session).toMatchObject({
      status: 'completed',
      programId: null,
      programDayId: null,
    });
    expect(history?.exercises[0]?.exercise).toMatchObject({
      programExerciseId: null,
      exerciseName: 'Bench Press',
      plannedTargetSets: 3,
      plannedMinReps: 8,
      plannedMaxReps: 8,
    });
    expect(history?.exercises[0]?.sets[0]).toMatchObject({
      id: set.id,
      weight: 85,
      reps: 8,
      completed: true,
    });
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { copiedSetValues, lastUsedSet, previousSetFor } from '../src/domain/workoutPrefill';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { BackupService } from '../src/features/dataSafety/backupService';
import { DataSafetyRepository } from '../src/lib/storage/repositories/dataSafetyRepository';
import { AppSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);

async function fixture() {
  const db = createTestDatabase('speed');
  const exercises = new ExerciseRepository(db);
  const workouts = new WorkoutRepository(db);
  const source = await exercises.create({ name: 'Speed Bench', primaryMuscle: 'chest' });
  const other = await exercises.create({ name: 'Speed Row', primaryMuscle: 'back' });
  const session = await workouts.createSession();
  const exercise = await workouts.addExercise({
    workoutSessionId: session.id,
    exerciseId: source.id,
    plannedRestSeconds: 180,
  });
  const set = await workouts.addSet({
    workoutExerciseId: exercise.id,
    setType: 'working',
    weight: 100,
    reps: 8,
    rir: 2,
  });
  return { db, workouts, source, other, session, exercise, set };
}

describe('Gym speed persistence', () => {
  it('preserves the source program through session replacement and unplanned additions', async () => {
    const { db, workouts, source, other, session } = await fixture();
    await workouts.discard(session.id);
    const programs = new ProgramRepository(db);
    const program = await programs.create({ name: 'Source Plan' });
    const day = await programs.addDay({ programId: program.id, name: 'Push' });
    await programs.addExercise({
      programDayId: day.id,
      exerciseId: source.id,
      targetSets: 3,
      minReps: 8,
      maxReps: 8,
    });
    const before = await programs.get(program.id);
    const graph = await workouts.startPlannedWorkout(day.id);
    await workouts.replaceExercise(graph.exercises[0]!.exercise.id, other.id);
    await workouts.addExercise({ workoutSessionId: graph.session.id, exerciseId: source.id });
    expect(await programs.get(program.id)).toEqual(before);
  });

  it('round-trips persisted skipping through backup v2 and database reopening', async () => {
    const { db, workouts, exercise, session } = await fixture();
    await workouts.skipExercise(exercise.id, true);
    const service = new BackupService(new DataSafetyRepository(db), new AppSettingsRepository(db));
    const backup = await service.createBackup();
    const prepared = await service.prepareRestore(service.serialize(backup));
    await service.deleteAllUserData();
    await service.restore(prepared);
    const name = db.name;
    db.close();
    const reopened = new LiftwiseDatabase(name);
    expect(
      (await new WorkoutRepository(reopened).get(session.id))?.exercises[0]?.exercise.skipped,
    ).toBe(true);
    reopened.close();
  });
  it('duplicates values into a draft, never a second completed set', async () => {
    const { workouts, set, session } = await fixture();
    await workouts.completeSet(set.id, {});
    const duplicate = await workouts.duplicateSet(set.id);
    expect(duplicate).toMatchObject({
      weight: 100,
      reps: 8,
      rir: 2,
      setNumber: 2,
      completed: false,
    });
    expect(
      (await workouts.get(session.id))?.exercises[0]?.sets.filter((item) => item.completed),
    ).toHaveLength(1);
  });

  it('atomically completes/rests and undoes completion with the prior rest state after reopen', async () => {
    const { db, workouts, session, set } = await fixture();
    const prior = await workouts.startRest(session.id, 60);
    const undo = await workouts.completeSet(set.id, { weight: 102.5 });
    expect((await workouts.get(session.id))?.exercises[0]?.sets[0]?.completed).toBe(true);
    await workouts.undoCompletion(undo);
    const name = db.name;
    db.close();
    const reopened = new LiftwiseDatabase(name);
    const graph = await new WorkoutRepository(reopened).get(session.id);
    expect(graph?.exercises[0]?.sets[0]).toMatchObject({ completed: false, weight: 102.5 });
    expect(graph?.session).toMatchObject({
      restStartedAt: prior.restStartedAt,
      restEndsAt: prior.restEndsAt,
    });
    reopened.close();
  });

  it('rolls back invalid completion without starting rest and rejects expired undo', async () => {
    const { workouts, session, set } = await fixture();
    await expect(workouts.completeSet(set.id, { reps: null })).rejects.toThrow();
    expect((await workouts.get(session.id))?.session.restEndsAt).toBeNull();
    const undo = await workouts.completeSet(set.id, {});
    await expect(workouts.undoCompletion({ ...undo, expiresAt: 0 })).rejects.toThrow(/expired/);
  });

  it('persists skipping and ordering, then replaces only a draft exercise without changing completed identity', async () => {
    const { db, workouts, session, exercise, other, set } = await fixture();
    const added = await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: other.id,
    });
    await workouts.skipExercise(exercise.id, true);
    await workouts.reorderExercises(session.id, [added.id, exercise.id]);
    await workouts.replaceExercise(exercise.id, other.id);
    const graph = await workouts.get(session.id);
    expect(graph?.exercises[1]?.exercise).toMatchObject({
      exerciseId: other.id,
      skipped: false,
      order: 2,
      programExerciseId: null,
    });
    expect(await db.workoutSets.get(set.id)).toMatchObject({ weight: null, reps: null, rir: null });
    await workouts.completeSet(set.id, { weight: 20, reps: 10 });
    await expect(workouts.replaceExercise(exercise.id, other.id)).rejects.toThrow(/Completed sets/);
  });

  it('maps previous working sets by set number and last-used values from actual completed sets', async () => {
    const { workouts, set } = await fixture();
    const completed = await workouts.updateSet(set.id, { completed: true });
    const draft = { ...set, id: crypto.randomUUID(), setNumber: 2 };
    expect(previousSetFor(draft, [completed])).toEqual(completed);
    expect(lastUsedSet(draft, [completed], [])).toEqual(completed);
    expect(copiedSetValues(completed)).toEqual({ weight: 100, reps: 8, rir: 2 });
    expect(previousSetFor({ ...draft, setType: 'warmup' }, [completed])).toBeUndefined();
  });
});

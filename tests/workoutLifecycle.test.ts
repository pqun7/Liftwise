import { afterEach, describe, expect, it } from 'vitest';
import { workoutElapsedSeconds, restRemainingSeconds } from '../src/domain/workoutTime';
import { WORKOUT_AWAY_GRACE_MS } from '../src/domain/workoutLifecycle';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);
const at = (minutes: number) => new Date(Date.UTC(2026, 9, 9, 10, minutes));
async function fixture() {
  const db = createTestDatabase('lifecycle');
  const repo = new WorkoutRepository(db);
  const session = await repo.createSession({ startedAt: at(0).toISOString() });
  return { db, repo, session };
}

describe('workout interruption and recovery', () => {
  it('continues a short absence and pauses a long absence at departure, without deleting sets', async () => {
    const { db, repo, session } = await fixture();
    await repo.checkpointPresence('one', true, at(10));
    await repo.checkpointPresence('one', false, at(20));
    await repo.recoverInterrupted(at(24));
    expect((await repo.get(session.id))?.session.status).toBe('active');
    await repo.checkpointPresence('one', false, at(24));
    await repo.recoverInterrupted(at(30));
    const recovered = (await repo.get(session.id))!.session;
    expect(recovered).toMatchObject({
      status: 'paused',
      pausedAt: at(20).toISOString(),
      pauseReason: 'away',
      durationEstimated: false,
    });
    expect(workoutElapsedSeconds(recovered, at(60).getTime())).toBe(1200);
    db.close();
    await db.open();
    await repo.recoverInterrupted(at(90));
    expect((await repo.get(session.id))?.session.pausedAt).toBe(at(20).toISOString());
  });

  it('does not pause while another window is visible; expires a killed window at its last checkpoint', async () => {
    const { repo, session } = await fixture();
    await repo.checkpointPresence('one', true, at(10));
    await repo.checkpointPresence('two', true, at(10));
    await repo.checkpointPresence('one', false, at(11));
    await repo.checkpointPresence('two', true, at(20));
    await repo.recoverInterrupted(new Date(at(20).getTime() + 30_000));
    expect((await repo.get(session.id))?.session.status).toBe('active');
    await repo.recoverInterrupted(new Date(at(20).getTime() + WORKOUT_AWAY_GRACE_MS));
    expect((await repo.get(session.id))?.session).toMatchObject({
      status: 'paused',
      pausedAt: at(20).toISOString(),
      pauseReason: 'recovery',
      durationEstimated: true,
    });
  });

  it('freezes both timers, resumes remaining rest, and finishes without counting the paused gap', async () => {
    const { repo, session } = await fixture();
    await repo.startRest(session.id, 180, at(19));
    const paused = await repo.pause(session.id, at(20));
    expect(restRemainingSeconds(paused, at(60).getTime())).toBe(120);
    const resumed = await repo.resume(session.id, at(60));
    expect(restRemainingSeconds(resumed, at(60).getTime())).toBe(120);
    expect(workoutElapsedSeconds(resumed, at(65).getTime())).toBe(1500);
    await repo.pause(session.id, at(65));
    const finished = await repo.finish(session.id, at(120));
    expect(workoutElapsedSeconds(finished)).toBe(1500);
    expect(finished.restEndsAt).toBeNull();
    expect(await repo.finish(session.id, at(180))).toEqual(finished);
  });

  it('recovers legacy sessions and permits correction of an estimated duration', async () => {
    const { db, repo, session } = await fixture();
    await db.workoutSessions.update(session.id, { updatedAt: at(20).toISOString() });
    await repo.recoverInterrupted(at(90));
    expect((await repo.get(session.id))?.session.durationEstimated).toBe(true);
    const corrected = await repo.correctDuration(session.id, 1800);
    expect(workoutElapsedSeconds(corrected)).toBe(1800);
    expect(corrected.durationEstimated).toBe(false);
    const resumed = await repo.resume(session.id, at(90));
    expect(workoutElapsedSeconds(resumed, at(95).getTime())).toBe(2100);
    await expect(repo.correctDuration(session.id, 100)).rejects.toThrow(/Pause/);
  });

  it('handles a backwards device clock without a negative duration', async () => {
    const { repo, session } = await fixture();
    await repo.checkpointPresence('one', true, at(30));
    await repo.recoverInterrupted(at(20));
    const recovered = (await repo.get(session.id))!.session;
    expect(recovered.status).toBe('paused');
    expect(recovered.durationEstimated).toBe(true);
    expect(workoutElapsedSeconds(recovered)).toBe(1200);
  });

  it('rejects stale set edits atomically and keeps the other window value', async () => {
    const { db, repo, session } = await fixture();
    const source = await new ExerciseRepository(db).create({
      name: 'Bench',
      primaryMuscle: 'chest',
    });
    const entry = await repo.addExercise({ workoutSessionId: session.id, exerciseId: source.id });
    const set = await repo.addSet({ workoutExerciseId: entry.id, setType: 'working', weight: 40 });
    const updated = await repo.updateSet(set.id, { weight: 60 }, set.updatedAt);
    await expect(repo.updateSet(set.id, { weight: 80 }, set.updatedAt)).rejects.toThrow(
      /another window/,
    );
    expect((await db.workoutSets.get(set.id))?.weight).toBe(60);
    expect((await repo.updateSet(set.id, { weight: 80 }, updated.updatedAt)).weight).toBe(80);
  });

  it('preserves workout snapshots when switching, editing, archiving and deleting the source program', async () => {
    const { db, repo, session } = await fixture();
    await repo.discard(session.id);
    const programs = new ProgramRepository(db);
    const source = await new ExerciseRepository(db).create({
      name: 'Bench',
      primaryMuscle: 'chest',
    });
    const original = await programs.create({ name: 'Original' });
    const day = await programs.addDay({ programId: original.id, name: 'Push' });
    await programs.addExercise({
      programDayId: day.id,
      exerciseId: source.id,
      targetSets: 3,
      minReps: 8,
      maxReps: 10,
    });
    await programs.setActive(original.id);
    const workout = await repo.startPlannedWorkout(day.id);
    await repo.completeSet(workout.exercises[0]!.sets[0]!.id, { weight: 40, reps: 8 });
    const recorded = (await repo.get(workout.session.id))!;
    const next = await programs.create({ name: 'Next' });
    await programs.setActive(next.id);
    await programs.updateDay(day.id, { name: 'Changed' });
    await programs.update(original.id, { archived: true });
    expect(await repo.get(workout.session.id)).toEqual(recorded);
    await programs.delete(original.id);
    const detached = (await repo.get(workout.session.id))!;
    expect(detached.session).toMatchObject({
      name: recorded.session.name,
      status: 'active',
      programId: null,
      programDayId: null,
    });
    expect(detached.exercises[0]?.sets).toEqual(recorded.exercises[0]?.sets);
    expect(detached.exercises[0]?.exercise).toMatchObject({
      exerciseName: 'Bench',
      plannedTargetSets: 3,
      plannedMinReps: 8,
      programExerciseId: null,
    });
    await repo.finish(workout.session.id);
    expect(await repo.getUnfinished()).toBeUndefined();
    expect((await repo.createSession()).status).toBe('active');
  });
});

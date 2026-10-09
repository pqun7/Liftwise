import { afterEach, expect, it } from 'vitest';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { getHomeData } from '../src/features/home/homeService';
import { getWorkoutLanding } from '../src/features/workout/workoutService';
import { sessionCalendarDate } from '../src/domain/trainingCalendar';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

afterEach(cleanupTestDatabases);
it('keeps a workout completed after midnight on its scheduled date across database reopen and every landing projection', async () => {
  const db = createTestDatabase('midnight');
  const programs = new ProgramRepository(db),
    workouts = new WorkoutRepository(db);
  const exercise = await new ExerciseRepository(db).create({
    name: 'Bench',
    primaryMuscle: 'chest',
  });
  const program = await programs.create({ name: 'Upper' });
  await programs.setActive(program.id);
  const day = await programs.addDay({ programId: program.id, name: 'Upper B', weekday: 2 });
  await programs.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 1 });
  const session = await workouts.startPlannedWorkout(
    day.id,
    new Date(2026, 9, 7, 23, 55).toISOString(),
  );
  await workouts.updateSet(session.exercises[0]!.sets[0]!.id, {
    weight: 20,
    reps: 10,
    completed: true,
  });
  await workouts.finish(session.session.id, new Date(2026, 9, 8, 0, 5));
  db.close();
  await db.open();
  const now = new Date(2026, 9, 8, 12);
  const home = await getHomeData(db, now);
  const completed = (await workouts.get(session.session.id))!;
  expect(sessionCalendarDate(completed.session)).toBe('2026-10-07');
  expect(home.calendar.getDayState('2026-10-07').status).toBe('completed');
  expect(home.week.find((day) => day.key === '2026-10-07')?.completed).toBe(1);
  expect(home.week.find((day) => day.key === '2026-10-08')?.completed).toBe(0);
  expect(home.calendar.getCompletedSession(home.today)).toBeNull();
  expect((await getWorkoutLanding(db, now)).state).toBe('rest-day');
  expect(await db.workoutSessions.count()).toBe(1);
  expect(await workouts.finish(session.session.id, now)).toEqual(completed.session);
  expect(await db.workoutSessions.count()).toBe(1);
});

it('shows durable completion without an active program instead of returning to the setup prompt', async () => {
  const db = createTestDatabase('legacy-completion');
  const repo = new WorkoutRepository(db);
  const started = new Date(2026, 9, 8, 10);
  const session = await repo.createSession({
    name: 'Legacy training',
    startedAt: started.toISOString(),
  });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Squat',
    primaryMuscle: 'quads',
  });
  const entry = await repo.addExercise({ workoutSessionId: session.id, exerciseId: exercise.id });
  const set = await repo.addSet({
    workoutExerciseId: entry.id,
    setType: 'working',
    weight: 20,
    reps: 8,
  });
  const now = new Date(2026, 9, 8, 12);
  expect((await getWorkoutLanding(db, now)).state).toBe('in-progress');
  await repo.updateSet(set.id, { completed: true });
  await repo.finish(session.id, new Date(2026, 9, 8, 11));
  db.close();
  await db.open();
  const landing = await getWorkoutLanding(db, now);
  expect(landing).toMatchObject({
    state: 'completed-today',
    completedToday: { id: session.id, completedSets: 1 },
  });
  expect((await getHomeData(db, now)).calendar.getDayState('2026-10-08').status).toBe('completed');
  expect((await getWorkoutLanding(db, new Date(2026, 9, 9, 12))).state).toBe('no-program');
});

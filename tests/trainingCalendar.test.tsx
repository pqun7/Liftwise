import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { trainingCalendar, sessionCalendarDate } from '../src/domain/trainingCalendar';
import {
  addLocalCalendarDays,
  dateFromKey,
  localDateKey,
  weekdayOf,
  Weekday,
} from '../src/domain/localCalendar';
import { watchCalendar } from '../src/app/shell/useCalendarRevalidation';
import { HomePage } from '../src/features/home/HomePage';
import { PlanPage } from '../src/features/plan/PlanPage';
import { WorkoutPage } from '../src/features/workout/WorkoutPage';
import { getHomeData } from '../src/features/home/homeService';
import { getWorkoutLanding } from '../src/features/workout/workoutService';
import { workoutCompletion } from '../src/features/home/homeData';
import { ProgressRepository } from '../src/features/progress/progressService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
import { workoutSessionSchema } from '../src/domain/validation';

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await cleanupTestDatabases();
});

it('maps all seven weekdays once and crosses Saturday/Sunday/Monday and year boundaries', () => {
  for (let index = 0; index < 7; index++)
    expect(weekdayOf(new Date(2026, 9, 5 + index, 12))).toBe(index);
  expect(weekdayOf(dateFromKey('2026-10-04'))).toBe(Weekday.SUNDAY);
  expect(addLocalCalendarDays('2026-10-03', 1)).toBe('2026-10-04');
  expect(addLocalCalendarDays('2026-10-04', 1)).toBe('2026-10-05');
  expect(addLocalCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addLocalCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
});

it('refreshes exactly at local midnight without polling and cleans up listeners and timers', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 3, 23, 59));
  const refresh = vi.fn();
  const stop = watchCalendar(refresh);
  vi.advanceTimersByTime(59_999);
  expect(refresh).not.toHaveBeenCalled();
  vi.advanceTimersByTime(51);
  expect(refresh).toHaveBeenCalledOnce();
  expect(localDateKey(new Date())).toBe('2026-10-04');
  stop();
  expect(vi.getTimerCount()).toBe(0);
  window.dispatchEvent(new Event('focus'));
  expect(refresh).toHaveBeenCalledOnce();
});

it('refreshes on foreground after sleeping across midnight and on device timezone change', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 4, 23, 59));
  const refresh = vi.fn();
  const stop = watchCalendar(refresh);
  vi.setSystemTime(new Date(2026, 9, 5, 8));
  window.dispatchEvent(new Event('focus'));
  expect(refresh).toHaveBeenCalledOnce();
  window.dispatchEvent(new Event('focus'));
  expect(refresh).toHaveBeenCalledOnce();
  document.dispatchEvent(new Event('visibilitychange'));
  expect(refresh).toHaveBeenCalledTimes(2);
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(123);
  window.dispatchEvent(new Event('focus'));
  expect(refresh).toHaveBeenCalledTimes(3);
  stop();
});

async function fixture() {
  const db = createTestDatabase('calendar');
  const programs = new ProgramRepository(db),
    workouts = new WorkoutRepository(db);
  const program = await programs.create({ name: 'PPL' });
  await programs.setActive(program.id);
  const exercise = await new ExerciseRepository(db).create({
    name: 'Squat',
    primaryMuscle: 'quads',
  });
  const legs = await programs.addDay({
    programId: program.id,
    name: 'Legs B',
    weekday: Weekday.SATURDAY,
  });
  const push = await programs.addDay({
    programId: program.id,
    name: 'Push A',
    weekday: Weekday.MONDAY,
  });
  for (const day of [legs, push])
    await programs.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 12 });
  const graph = await workouts.startPlannedWorkout(legs.id, new Date(2026, 9, 3, 20).toISOString());
  for (const set of graph.exercises[0]!.sets.slice(0, 2))
    await workouts.updateSet(set.id, { completed: true, weight: 50, reps: 8 });
  return { db, programs, workouts, program, legs, push, session: graph.session };
}

it('reopens offline on Sunday with 2/12 Saturday sets and preserves independent truths across all screens', async () => {
  const { db, programs, workouts, program, legs, push, session } = await fixture();
  db.close();
  await db.open();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const now = new Date(2026, 9, 4, 12),
    home = await getHomeData(db, now);
  const graph = (await programs.get(program.id))!;
  const calendar = trainingCalendar(graph, [session], now);
  expect(calendar.scheduledToday).toBeNull();
  expect(calendar.isRestDay(home.today)).toBe(true);
  expect(calendar.next).toMatchObject({ entry: { day: { id: push.id } }, date: '2026-10-05' });
  expect(home.active?.session.scheduledDate).toBe('2026-10-03');
  expect(workoutCompletion(home.active!)).toMatchObject({
    completedSets: 2,
    totalSets: 12,
    remainingSets: 10,
    percent: 17,
    completedExercises: 0,
  });
  const landing = await getWorkoutLanding(db, now);
  expect(landing).toMatchObject({
    state: 'in-progress',
    todayDayId: null,
    nextDayId: push.id,
    unfinished: { scheduledDate: '2026-10-03', completedSets: 2, totalSets: 12 },
  });
  const streak = await new ProgressRepository(db).streak(now);
  expect(streak.week.find(({ isToday }) => isToday)).toMatchObject({
    date: '2026-10-04',
    status: 'rest',
  });
  const monday = await new ProgressRepository(db).streak(new Date(2026, 9, 5, 0));
  expect(monday.week[0]).toMatchObject({ status: 'today', isToday: true });
  expect(monday.missedDays).toBe(0);
  const router = createMemoryRouter([
    { path: '/', element: <HomePage />, loader: () => home },
    {
      path: '/plan',
      element: <PlanPage />,
      loader: () => ({
        programs: [program],
        graphs: [graph],
        activeProgramId: program.id,
        completed: [],
        now: now.toISOString(),
        unfinished: session,
      }),
    },
    { path: '/workout', element: <WorkoutPage />, loader: () => landing },
  ]);
  render(<RouterProvider router={router} />);
  const todaySection = (await screen.findByRole('heading', { name: 'Today' })).closest('section')!;
  expect(within(todaySection).getByText('Rest Day')).toBeInTheDocument();
  expect(within(todaySection).queryByText('Legs B')).toBeNull();
  expect(screen.getByText(/Active session · Started Saturday/)).toBeInTheDocument();
  await router.navigate('/plan');
  expect(await screen.findByText('Next workout')).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: /^Push A/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Continue in Workout/ })).toHaveAttribute(
    'href',
    `/workout/${session.id}`,
  );
  expect(screen.queryByRole('button', { name: /Start/ })).toBeNull();
  await router.navigate('/workout');
  expect(await screen.findByRole('link', { name: 'Resume Workout' })).toHaveAttribute(
    'href',
    `/workout/${session.id}`,
  );
  expect(screen.queryByText('Your next session, ready when you are.')).toBeNull();
  // Live plan edits must not alter the persisted session snapshot or date.
  await programs.updateDay(legs.id, { weekday: Weekday.SUNDAY });
  expect((await getHomeData(db, now)).calendar.scheduledToday?.day.id).toBe(legs.id);
  expect((await workouts.get(session.id))!.session.scheduledDate).toBe('2026-10-03');
});

it('shows the actual schedule when selecting a different calendar date without starting that workout', async () => {
  const { db, workouts, session, push } = await fixture();
  await workouts.finish(session.id, new Date(2026, 9, 3, 21));
  const home = await getHomeData(db, new Date(2026, 9, 4, 12));
  render(
    <RouterProvider
      router={createMemoryRouter([{ path: '/', element: <HomePage />, loader: () => home }])}
    />,
  );
  await screen.findByRole('heading', { name: 'Today' });
  fireEvent.click(screen.getByRole('button', { name: /^Monday/ }));
  expect(screen.getByRole('heading', { name: 'Push A' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View Scheduled Workout' })).toHaveAttribute(
    'href',
    `/plan/${push.programId}/days/${push.id}`,
  );
  expect(screen.queryByRole('button', { name: 'Start Workout' })).toBeNull();
  expect(await db.workoutSessions.count()).toBe(1);
});

it('groups an active session by its captured local calendar date when timestamps fall on a different device date', async () => {
  const { db, session } = await fixture();
  await db.workoutSessions.put({ ...session, scheduledDate: '2026-10-04' });
  const home = await getHomeData(db, new Date(2026, 9, 4, 12));
  expect(sessionCalendarDate(home.active!.session)).toBe('2026-10-04');
  expect(home.week.find(({ key }) => key === '2026-10-04')!.performance).toBeGreaterThan(0);
  expect(home.week.find(({ key }) => key === '2026-10-03')!.performance).toBe(0);
  expect(home.calendar.scheduledToday).toBeNull();
});

it('retains manually selectable undated workouts in mixed programs without scheduling them on rest dates', async () => {
  const { db, programs, program, push } = await fixture();
  const day = await programs.addDay({ programId: program.id, name: 'Optional Arms' });
  const graph = (await programs.get(program.id))!;
  await programs.addExercise({
    programDayId: day.id,
    exerciseId: graph.days[0]!.exercises[0]!.exerciseId,
    targetSets: 1,
  });
  const landing = await getWorkoutLanding(db, new Date(2026, 9, 4, 12));
  expect(landing.todayDayId).toBeNull();
  expect(landing.nextDayId).toBe(push.id);
  expect(landing.previews.some(({ day: preview }) => preview.id === day.id)).toBe(true);
});

it('keeps today’s program workout scheduled after an unrelated quick workout is completed', async () => {
  const { db, workouts, session, push } = await fixture();
  await workouts.finish(session.id, new Date(2026, 9, 3, 21));
  const quick = await workouts.createSession({ startedAt: new Date(2026, 9, 5, 10).toISOString() });
  await workouts.finish(quick.id, new Date(2026, 9, 5, 11));
  const now = new Date(2026, 9, 5, 12);
  const home = await getHomeData(db, now);
  expect(home.calendar.scheduledToday?.day.id).toBe(push.id);
  expect(home.suggestion?.day.id).toBe(push.id);
  expect(home.calendar.next?.date).toBe('2026-10-10');
  expect(await getWorkoutLanding(db, now)).toMatchObject({
    state: 'scheduled',
    todayDayId: push.id,
  });
});

it('uses the same eligible set totals for Home and workout recovery while keeping skipped logs in completed history', async () => {
  const { db, workouts, session } = await fixture();
  const graph = (await workouts.get(session.id))!;
  await workouts.skipExercise(graph.exercises[0]!.exercise.id, true);
  const now = new Date(2026, 9, 4, 12);
  expect(workoutCompletion((await getHomeData(db, now)).active!)).toMatchObject({
    completedSets: 0,
    totalSets: 0,
  });
  expect((await getWorkoutLanding(db, now)).unfinished).toMatchObject({
    completedSets: 0,
    totalSets: 0,
  });
  await workouts.finish(session.id, new Date(2026, 9, 4, 11));
  expect(workoutCompletion((await workouts.get(session.id))!)).toMatchObject({
    completedSets: 2,
    totalSets: 12,
  });
});

it('keeps legacy date compatibility idempotent and validates new calendar dates without mutating history', async () => {
  const { db, workouts, session } = await fixture();
  const legacy = { ...session };
  delete legacy.scheduledDate;
  await db.workoutSessions.put(legacy);
  for (let count = 0; count < 2; count++) {
    db.close();
    await db.open();
    expect(sessionCalendarDate((await workouts.get(session.id))!.session)).toBe('2026-10-03');
    expect((await db.workoutSessions.get(session.id))!.scheduledDate).toBeUndefined();
  }
  expect(workoutSessionSchema.safeParse({ ...legacy, scheduledDate: '2026-02-30' }).success).toBe(
    false,
  );
  await workouts.finish(session.id, new Date(2026, 9, 4, 10));
  const home = await getHomeData(db, new Date(2026, 9, 4, 12));
  expect(home.active).toBeNull();
  expect(home.calendar.scheduledToday).toBeNull();
  expect(home.summary.workouts).toBe(1);
  expect(home.streak.week[6]?.status).toBe('completed');
});

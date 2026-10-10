import { AppShell } from '../src/app/shell/AppShell';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { getHomeData } from '../src/features/home/homeService';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type LoaderFunctionArgs } from 'react-router-dom';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { ProgressRepository, progressRepository } from '../src/features/progress/progressService';
import { progressLoader, workoutHistoryLoader } from '../src/features/progress/loaders';
import { ProgressPage } from '../src/features/progress/ProgressPage';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';
import { useCalendarRevalidation } from '../src/app/shell/useCalendarRevalidation';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await cleanupTestDatabases();
});

describe('persisted streak data and route rendering', () => {
  it('reconstructs after database reopen and ignores unfinished sessions', async () => {
    const db = createTestDatabase('streak-reopen');
    const workouts = new WorkoutRepository(db);
    const now = new Date(2026, 9, 8, 18);
    const session = await workouts.createSession({
      startedAt: new Date(2026, 9, 7, 23, 50).toISOString(),
    });
    expect((await new ProgressRepository(db).streak(now)).currentStreak).toBe(0);
    await workouts.finish(session.id, new Date(2026, 9, 8, 0, 10));
    await workouts.createSession({ startedAt: now.toISOString() });
    const result = await new ProgressRepository(db).streak(now);
    expect(result).toMatchObject({
      currentStreak: 1,
      bestStreak: 1,
      trackingStartDate: '2026-10-08',
    });
    const name = db.name;
    db.close();
    const reopened = new LiftwiseDatabase(name);
    expect(await new ProgressRepository(reopened).streak(now)).toEqual(result);
    reopened.close();
  });
  it('loads overview history once, updates the streak card after completion and keeps global stats across periods', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 18));
    const db = createTestDatabase('streak-route');
    const workouts = new WorkoutRepository(db);
    const history = vi
      .spyOn(progressRepository, 'history')
      .mockImplementation((from, until) => new ProgressRepository(db).history(from, until));
    vi.spyOn(progressRepository, 'streak').mockImplementation((now, weekdays, start) =>
      new ProgressRepository(db).streak(now, weekdays, start),
    );
    const router = createMemoryRouter(
      [
        {
          path: '/progress',
          hydrateFallbackElement: <p>Loading</p>,
          element: <AppShell />,
          children: [{ index: true, element: <ProgressPage />, loader: progressLoader }],
        },
      ],
      { initialEntries: ['/progress'] },
    );
    render(<RouterProvider router={router} />);
    expect((await screen.findByText('Current streak')).parentElement).toHaveTextContent('0');
    expect(history).toHaveBeenCalledTimes(1);
    const session = await workouts.createSession();
    await workouts.finish(session.id);
    await router.revalidate();
    await waitFor(() =>
      expect(screen.getByText('Current streak').parentElement).toHaveTextContent('1'),
    );
    expect(
      screen
        .getByRole('list', { name: 'Current week workout streak' })
        .querySelector('[aria-current="date"]'),
    ).toHaveAccessibleName(/completed, today/);
    await router.navigate('/progress?range=7D');
    expect(screen.getByText('Current streak').parentElement).toHaveTextContent('1');
    const long = await progressLoader({
      request: new Request('http://localhost/progress?range=1Y'),
      params: {},
      context: undefined,
    } as LoaderFunctionArgs);
    expect(long.streak).toMatchObject({ currentStreak: 1, bestStreak: 1, missedDays: 0 });
    router.dispose();
  });
  it('derives rest from the active program, stays consistent on Home and survives schedule changes and reopen', async () => {
    const db = createTestDatabase('rest-schedule');
    const programs = new ProgramRepository(db);
    const exercise = await new ExerciseRepository(db).create({
      name: 'Rest test bench',
      primaryMuscle: 'chest',
    });
    const program = await programs.create({ name: 'Scheduled program' });
    const monday = await programs.addDay({ programId: program.id, name: 'Monday', weekday: 0 });
    const wednesday = await programs.addDay({
      programId: program.id,
      name: 'Wednesday',
      weekday: 2,
    });
    for (const day of [monday, wednesday])
      await programs.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 1 });
    const workouts = new WorkoutRepository(db);
    const now = new Date(2026, 9, 8, 18);
    for (const day of [5, 7]) {
      const session = await workouts.createSession({
        startedAt: new Date(2026, 9, day, 10).toISOString(),
      });
      await workouts.finish(session.id, new Date(2026, 9, day, 11));
    }
    const progress = new ProgressRepository(db);
    expect(await progress.trainingWeekdays()).toEqual([0, 2]);
    const before = await progress.streak(now);
    expect(before).toMatchObject({ currentStreak: 2, bestStreak: 2 });
    expect(before.week[1]?.status).toBe('rest');
    expect(before.week[3]?.status).toBe('rest');
    expect((await getHomeData(db, now)).streak).toEqual(before);
    db.close();
    const reopened = new LiftwiseDatabase(db.name);
    expect(await new ProgressRepository(reopened).streak(now)).toEqual(before);
    const repo = new ProgramRepository(reopened);
    const tuesday = await repo.addDay({ programId: program.id, name: 'Tuesday', weekday: 1 });
    await repo.addExercise({ programDayId: tuesday.id, exerciseId: exercise.id, targetSets: 1 });
    expect((await new ProgressRepository(reopened).streak(now)).currentStreak).toBe(1);
    expect((await new ProgressRepository(reopened).streak(now)).week[1]?.status).toBe('missed');
    await repo.setActive(null);
    expect(await new ProgressRepository(reopened).trainingWeekdays()).toBeNull();
    expect((await new ProgressRepository(reopened).streak(now)).week[3]?.status).toBe('today');
    reopened.close();
  });
  it('shares cycle recovery rules without excusing pre-program gaps or inventing attendance', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date(2026, 9, 8, 18);
    vi.setSystemTime(now);
    const db = createTestDatabase('cycle-streak-route');
    const programs = new ProgramRepository(db);
    const exercise = await new ExerciseRepository(db).create({
      name: 'Cycle bench',
      primaryMuscle: 'chest',
    });
    const program = await programs.create({ name: 'Cycle strength', scheduleType: 'cycle' });
    await programs.update(program.id, { cycleStartDate: '2026-10-05' });
    for (const [name, kind] of [
      ['Push', 'workout'],
      ['Recovery', 'recovery'],
      ['Pull', 'workout'],
    ] as const) {
      const day = await programs.addDay({ programId: program.id, name, kind });
      if (kind === 'workout')
        await programs.addExercise({
          programDayId: day.id,
          exerciseId: exercise.id,
          targetSets: 1,
        });
    }
    const workouts = new WorkoutRepository(db);
    for (const day of [1, 3, 5, 7, 7]) {
      const session = await workouts.createSession({
        startedAt: new Date(2026, 9, day, 10).toISOString(),
      });
      await workouts.finish(session.id, new Date(2026, 9, day, 11));
    }
    const repo = new ProgressRepository(db);
    const expected = await repo.streak(now);
    expect(expected).toMatchObject({ currentStreak: 2, bestStreak: 2 });
    expect(expected.week[1]?.status).toBe('rest');
    expect(expected.week.filter((day) => day.status === 'completed')).toHaveLength(2);
    vi.spyOn(progressRepository, 'history').mockImplementation((from, until) =>
      repo.history(from, until),
    );
    vi.spyOn(progressRepository, 'streak').mockImplementation((at, weekdays, start) =>
      repo.streak(at, weekdays, start),
    );
    expect((await getHomeData(db, now)).streak).toEqual(expected);
    for (const range of ['7D', '1M', 'ALL']) {
      const result = await progressLoader({
        request: new Request(`http://localhost/progress?range=${range}`),
        params: {},
        context: undefined,
      } as LoaderFunctionArgs);
      expect(result.streak).toMatchObject({
        currentStreak: 2,
        bestStreak: 2,
        missedDays: 2,
        week: expected.week,
      });
    }
    expect((await workoutHistoryLoader()).streak.week).toEqual(expected.week);
    expect(await db.workoutSessions.count()).toBe(5);
    db.close();
    const reopened = new LiftwiseDatabase(db.name);
    expect(await new ProgressRepository(reopened).streak(now)).toEqual(expected);
    reopened.close();
  });
  it('keeps the Plan header usable when optional streak data is unavailable', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/plan',
          loader: () => ({ streak: null }),
          element: <AppShell />,
          hydrateFallbackElement: <p>Loading</p>,
          children: [{ index: true, element: <p>Local program</p> }],
        },
      ],
      { initialEntries: ['/plan'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Local program')).toBeVisible();
    expect(screen.queryByText('0 days')).not.toBeInTheDocument();
    router.dispose();
  });
  it('revalidates an open screen at local midnight without a refresh', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8, 23, 59, 59));
    const loader = vi.fn(() => ({ today: new Date().getDate() }));
    function CalendarScreen() {
      useCalendarRevalidation();
      return <p>Calendar</p>;
    }
    const router = createMemoryRouter([
      { path: '/', loader, hydrateFallbackElement: <p>Loading</p>, element: <CalendarScreen /> },
    ]);
    render(<RouterProvider router={router} />);
    const { act } = await import('@testing-library/react');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(loader).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader.mock.results.at(-1)?.value).toEqual({ today: 9 });
    router.dispose();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../src/features/home/HomePage';
import { getHomeData } from '../src/features/home/homeService';
import {
  homeState,
  localDateKey,
  programDayMetadata,
  workoutCompletion,
} from '../src/features/home/homeData';
import { startPlannedWorkout } from '../src/features/workout/workoutService';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

vi.mock('../src/features/workout/workoutService', () => ({ startPlannedWorkout: vi.fn() }));
afterEach(async () => {
  vi.clearAllMocks();
  await cleanupTestDatabases();
});
const now = new Date(2026, 9, 7, 12);

async function programFixture() {
  const db = createTestDatabase('home');
  const programs = new ProgramRepository(db);
  const workouts = new WorkoutRepository(db);
  const exercise = await new ExerciseRepository(db).create({
    name: 'Bench Press',
    primaryMuscle: 'chest',
  });
  const program = await programs.create({ name: 'Push Pull Legs' });
  const push = await programs.addDay({ programId: program.id, name: 'Push Day' });
  const pull = await programs.addDay({ programId: program.id, name: 'Pull Day' });
  const prescription = await programs.addExercise({
    programDayId: push.id,
    exerciseId: exercise.id,
    targetSets: 3,
    minReps: 8,
    maxReps: 8,
  });
  await programs.addExercise({ programDayId: pull.id, exerciseId: exercise.id, targetSets: 2 });
  return { db, programs, workouts, program, push, pull, prescription };
}

async function renderHome(data: Awaited<ReturnType<typeof getHomeData>>) {
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: '/',
          element: <HomePage />,
          loader: () => data,
          hydrateFallbackElement: <p>Opening</p>,
        },
        { path: '/workout/:id', element: <h1>Session opened</h1> },
      ])}
    />,
  );
  await screen.findByRole('heading', { name: /Welcome to Liftwise/ });
}

describe('Home derived state and local data', () => {
  it('opens completed dates as saved details without offering the planned workout again', async () => {
    const { db, programs, workouts, push } = await programFixture();
    await programs.updateDay(push.id, { weekday: 1 });
    const graph = await workouts.startPlannedWorkout(
      push.id,
      new Date(2026, 9, 6, 10).toISOString(),
    );
    await workouts.finish(graph.session.id, new Date(2026, 9, 6, 11));
    const data = await getHomeData(db, now);
    await renderHome(data);
    const user = userEvent.setup();
    const completedDay = screen.getByRole('button', { name: /Tuesday.*1 completed workouts/ });
    expect(completedDay).toHaveAttribute('data-status', 'completed');
    await user.click(completedDay);
    expect(homeState(data, '2026-10-06')).toBe('rest-day');
    expect(screen.queryByRole('button', { name: 'Start Workout' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View Scheduled Workout' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Completed Workout' })).toHaveAttribute(
      'href',
      `/workout/${graph.session.id}?details=1`,
    );
    expect(startPlannedWorkout).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Monday.*Rest/ })).toHaveAttribute(
      'data-status',
      'rest',
    );
    expect(screen.getByRole('button', { name: /Thursday/ })).toHaveAttribute('data-future', 'true');
  });
  it('shows honest empty/rest state and a local Monday-first week across a month boundary', async () => {
    const db = createTestDatabase('home-empty');
    const data = await getHomeData(db, new Date(2026, 9, 2, 12));
    expect(data.week.map(({ date }) => date)).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(data.week.find(({ isToday }) => isToday)?.key).toBe('2026-10-02');
    expect(data.week.map(({ kind }) => kind)).toEqual([
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'future',
      'future',
    ]);
    expect(data.summary.workouts).toBe(0);
    expect(data.recent).toEqual([]);
    expect(data.catalogCount).toBeNull();
    expect(homeState(data, data.today)).toBe('rest-day');
    expect(localDateKey(new Date(2026, 9, 2, 0, 1))).toBe('2026-10-02');
  });

  it('suggests an ordered active-program day without inventing a date schedule or writing data', async () => {
    const { db, push } = await programFixture();
    const data = await getHomeData(db, now);
    expect(data.suggestion?.day.id).toBe(push.id);
    expect(programDayMetadata(data.suggestion!)).toBe('1 exercise · 3 planned sets');
    expect(homeState(data, data.today)).toBe('scheduled');
    expect(homeState(data, data.week[0]!.key)).toBe('rest-day');
    expect(await db.workoutSessions.count()).toBe(0);
    expect((await getHomeData(db, now)).suggestion).toEqual(data.suggestion);
  });

  it('uses completed history for rotation and keeps historical prescriptions independent', async () => {
    const { db, workouts, programs, push, pull, prescription } = await programFixture();
    const graph = await workouts.startPlannedWorkout(
      push.id,
      new Date(2026, 9, 6, 10).toISOString(),
    );
    await workouts.updateSet(graph.exercises[0]!.sets[0]!.id, {
      weight: 100,
      reps: 8,
      completed: true,
    });
    await workouts.finish(graph.session.id, new Date(2026, 9, 6, 11));
    await programs.updateExercise(prescription.id, { targetSets: 4, minReps: 6, maxReps: 6 });
    const data = await getHomeData(db, now);
    expect(data.suggestion?.day.id).toBe(pull.id);
    expect(data.recent[0]?.exercises[0]?.exercise.plannedTargetSets).toBe(3);
    expect(data.week.find(({ date }) => date === 6)?.completed).toBe(1);
    expect(data.week.find(({ date }) => date === 6)).toMatchObject({
      kind: 'training',
      performance: 1,
    });
    expect(data.summary.workouts).toBe(1);
    expect(data.summary.workingSets).toBe(1);
    expect(data.summary.durationSeconds).toBe(3600);
  });

  it('shows a rest day after training, excludes older years from weekly totals', async () => {
    const { db, workouts, push } = await programFixture();
    for (const date of [new Date(2025, 0, 1, 10), new Date(2026, 9, 7, 10)]) {
      const graph = await workouts.startPlannedWorkout(push.id, date.toISOString());
      await workouts.finish(graph.session.id, new Date(date.getTime() + 3600_000));
    }
    const data = await getHomeData(db, now);
    expect(data.summary.workouts).toBe(1);
    expect(data.previousSummary.workouts).toBe(0);
    expect(data.weekHistory).toHaveLength(1);
    expect(homeState(data, data.today)).toBe('rest-day');
  });

  it('prioritizes unfinished Quick Workouts across date selection and database reopen', async () => {
    const db = createTestDatabase('home-quick');
    const workouts = new WorkoutRepository(db);
    const session = await workouts.createSession({
      name: 'Quick Workout',
      startedAt: now.toISOString(),
    });
    const before = await getHomeData(db, now);
    expect(homeState(before, before.week[0]!.key)).toBe('in-progress');
    expect(workoutCompletion(before.active!)).toMatchObject({ percent: 0, remainingSets: 0 });
    db.close();
    const reopened = new LiftwiseDatabase(db.name);
    try {
      expect((await getHomeData(reopened, now)).active?.session.id).toBe(session.id);
    } finally {
      reopened.close();
    }
  });

  it('counts actual sets and excludes skipped exercises from active completion', async () => {
    const { db, workouts, push } = await programFixture();
    const graph = await workouts.startPlannedWorkout(push.id, now.toISOString());
    await workouts.updateSet(graph.exercises[0]!.sets[0]!.id, {
      weight: 100,
      reps: 8,
      completed: true,
    });
    expect(workoutCompletion((await getHomeData(db, now)).active!)).toMatchObject({
      percent: 33,
      completedSets: 1,
      remainingSets: 2,
    });
    await workouts.skipExercise(graph.exercises[0]!.exercise.id, true);
    expect(workoutCompletion((await getHomeData(db, now)).active!)).toMatchObject({
      exercises: 0,
      remainingSets: 0,
      percent: 0,
    });
    await workouts.finish(graph.session.id, new Date(now.getTime() + 3600_000));
    expect(workoutCompletion((await workouts.get(graph.session.id))!).completedSets).toBe(1);
  });

  it('retains program order when Quick Workouts push the last planned session out of recent cards', async () => {
    const { db, workouts, push, pull } = await programFixture();
    const planned = await workouts.startPlannedWorkout(
      push.id,
      new Date(2026, 8, 1, 10).toISOString(),
    );
    await workouts.finish(planned.session.id, new Date(2026, 8, 1, 11));
    for (const day of [2, 3, 4, 5]) {
      const quick = await workouts.createSession({
        startedAt: new Date(2026, 8, day, 10).toISOString(),
      });
      await workouts.finish(quick.id, new Date(2026, 8, day, 11));
    }
    const data = await getHomeData(db, now);
    expect(data.recent).toHaveLength(3);
    expect(data.weekHistory).toEqual([]);
    expect(data.suggestion?.day.id).toBe(pull.id);
  });
});

describe('Home interactions', () => {
  it('switches calendar content without altering the program and starts only on explicit action', async () => {
    const { db, push } = await programFixture();
    const data = await getHomeData(db, now);
    await renderHome(data);
    const user = userEvent.setup();
    const selector = screen.getByRole('group', { name: 'Select a day this week' });
    await user.click(selector.querySelector('button')!);
    expect(screen.getByRole('heading', { name: 'No workout scheduled' })).toBeInTheDocument();
    expect(startPlannedWorkout).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /today, no completed workouts/ }));
    vi.mocked(startPlannedWorkout).mockResolvedValueOnce('session');
    await user.click(screen.getByRole('button', { name: 'Start Workout' }));
    expect(await screen.findByRole('heading', { name: 'Session opened' })).toBeInTheDocument();
    expect(startPlannedWorkout).toHaveBeenCalledExactlyOnceWith(push.id);
  });

  it('shows a readable start failure and allows retry without losing the plan', async () => {
    const { db } = await programFixture();
    await renderHome(await getHomeData(db, now));
    vi.mocked(startPlannedWorkout).mockRejectedValueOnce(new Error('Storage is full'));
    await userEvent.click(screen.getByRole('button', { name: 'Start Workout' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is full');
    expect(screen.getByRole('button', { name: 'Start Workout' })).toBeEnabled();
  });

  it('renders snapshot recovery with one dominant action and accessible progress', async () => {
    const { db, workouts, push } = await programFixture();
    const graph = await workouts.startPlannedWorkout(push.id, now.toISOString());
    await workouts.updateSet(graph.exercises[0]!.sets[0]!.id, {
      weight: 100,
      reps: 8,
      completed: true,
    });
    await renderHome(await getHomeData(db, now));
    expect(screen.getByRole('link', { name: 'Continue Workout' })).toHaveAttribute(
      'href',
      `/workout/${graph.session.id}`,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('0 of 1 exercise · 2 sets left')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Workout' })).not.toBeInTheDocument();
  });
});

it('dated programs respect Monday-first weekdays and order the upcoming rest-day workout', async () => {
  const { db, programs, push, pull } = await programFixture();
  await programs.updateDay(push.id, { weekday: 0 });
  await programs.updateDay(pull.id, { weekday: 2 });
  const monday = await getHomeData(db, new Date(2026, 9, 5, 12));
  expect(monday.suggestion?.day.id).toBe(push.id);
  const tuesday = await getHomeData(db, new Date(2026, 9, 6, 12));
  expect(homeState(tuesday, tuesday.today)).toBe('rest-day');
  expect(tuesday.suggestion).toBeNull();
  expect(tuesday.nextDays[0]?.day.id).toBe(pull.id);
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkoutPage } from '../src/features/workout/WorkoutPage';
import {
  getWorkoutLanding,
  getOrStartWorkout,
  startPlannedWorkout,
  type WorkoutLandingData,
} from '../src/features/workout/workoutService';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

vi.mock('../src/features/workout/workoutService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/features/workout/workoutService')>()),
  startPlannedWorkout: vi.fn(),
}));
afterEach(async () => {
  vi.clearAllMocks();
  await cleanupTestDatabases();
});
const now = new Date(2026, 9, 7, 12);
async function fixture() {
  const db = createTestDatabase('landing');
  const programs = new ProgramRepository(db);
  const workouts = new WorkoutRepository(db);
  const custom = await new ExerciseRepository(db).create({ name: 'Bench', primaryMuscle: 'chest' });
  const program = await programs.create({ name: 'Strength' });
  await programs.setActive(program.id);
  const day = await programs.addDay({
    programId: program.id,
    name: 'Push',
    weekday: (now.getDay() + 6) % 7,
  });
  await programs.addExercise({
    programDayId: day.id,
    exerciseId: custom.id,
    targetSets: 3,
    minReps: 6,
    maxReps: 8,
  });
  return { db, programs, workouts, custom, program, day };
}
async function renderLanding(data: WorkoutLandingData) {
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: '/',
          element: <WorkoutPage />,
          loader: () => data,
          hydrateFallbackElement: <p>Loading</p>,
        },
        { path: '/workout/:id', element: <h1>Logger</h1> },
      ])}
    />,
  );
  await screen.findByRole('heading', { name: 'Start training' });
}

it('derives no-program, scheduled and rest-day states without creating a session', async () => {
  const empty = createTestDatabase('empty-landing');
  expect((await getWorkoutLanding(empty, now)).state).toBe('no-program');
  const { db, day, custom } = await fixture();
  const scheduled = await getWorkoutLanding(db, now);
  expect(scheduled).toMatchObject({ state: 'scheduled', todayDayId: day.id });
  expect(scheduled.previews[0]!.entries[0]).toMatchObject({
    exercise: { id: custom.id },
    prescription: { targetSets: 3 },
    previous: null,
  });
  expect((await getWorkoutLanding(db, new Date(2026, 9, 8, 12))).state).toBe('rest-day');
  expect(await db.workoutSessions.count()).toBe(0);
  await renderLanding(scheduled);
  expect(screen.getByText('1 exercise · 3 planned sets')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Bench — exercise details/ })).toHaveAttribute(
    'href',
    `/exercises/${encodeURIComponent(custom.id)}`,
  );
  expect(document.querySelector('input, textarea, select')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(await db.workoutSessions.count()).toBe(0);
});

it('keeps completed-today separate, loads real previous performance and gives unfinished sessions priority', async () => {
  const { db, workouts, day } = await fixture();
  const session = await workouts.startPlannedWorkout(
    day.id,
    new Date(2026, 9, 7, 10).toISOString(),
  );
  await workouts.updateSet(session.exercises[0]!.sets[0]!.id, {
    weight: 62.5,
    reps: 8,
    rir: 2,
    completed: true,
  });
  await workouts.finish(session.session.id, new Date(2026, 9, 7, 11));
  const data = await getWorkoutLanding(db, now);
  expect(data.state).toBe('completed-today');
  expect(data.completedToday?.completedSets).toBe(1);
  expect(data.previews[0]!.entries[0]!.previous?.sets[0]).toMatchObject({
    weight: 62.5,
    completed: true,
  });
  await renderLanding(data);
  expect(screen.queryByRole('button', { name: 'Start Workout' })).toBeNull();
  expect(screen.getByRole('link', { name: 'View Completed Workout' })).toHaveAttribute(
    'href',
    `/workout/${session.session.id}`,
  );
  const quick = await workouts.createSession({ startedAt: now.toISOString() });
  expect(await getWorkoutLanding(db, now)).toMatchObject({
    state: 'in-progress',
    unfinished: { id: quick.id },
  });
});

it('serializes competing starts across database connections, preserves snapshots and resumes the same session after reopen', async () => {
  const { db, programs, day, program } = await fixture();
  const second = new LiftwiseDatabase(db.name);
  try {
    const [firstId, secondId] = await Promise.all([
      getOrStartWorkout(day.id, db),
      getOrStartWorkout(null, second),
    ]);
    expect(firstId).toBe(secondId);
    expect(await db.workoutSessions.count()).toBe(1);
    const graph = (await new WorkoutRepository(db).get(firstId))!;
    expect(graph.exercises[0]?.exercise.plannedTargetSets).toBe(3);
    expect(graph.exercises[0]?.sets.every((set) => !set.completed)).toBe(true);
    expect((await programs.get(program.id))!.days[0]!.exercises[0]!.targetSets).toBe(3);
    db.close();
    expect(await getOrStartWorkout(day.id, second)).toBe(firstId);
  } finally {
    second.close();
  }
});

it('does not write when start fails and permits retry without losing programs', async () => {
  const { db, program } = await fixture();
  await expect(getOrStartWorkout('missing-day', db)).rejects.toThrow();
  expect(await db.workoutSessions.count()).toBe(0);
  expect(await db.programs.get(program.id)).toBeDefined();
});

it('renders a calm rest day and keeps optional training an explicit choice', async () => {
  const { db } = await fixture();
  await renderLanding(await getWorkoutLanding(db, new Date(2026, 9, 8, 12)));
  expect(screen.getByRole('heading', { name: 'No workout today' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start Workout' })).toBeNull();
  expect(screen.getByText('Next: Push · Wednesday')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(screen.getByRole('button', { name: 'Start Workout' })).toBeInTheDocument();
  expect(await db.workoutSessions.count()).toBe(0);
});

it('pins a single primary start for long previews and shows missing-reference recovery without writing', async () => {
  const { db } = await fixture();
  const data = await getWorkoutLanding(db, now);
  const entry = data.previews[0]!.entries[0]!;
  data.previews[0]!.entries = Array.from({ length: 6 }, (_, index) => ({
    ...entry,
    prescription: { ...entry.prescription, id: `preview-${index}`, order: index + 1 },
  }));
  data.previews[0]!.entries[5]!.exercise = null;
  await renderLanding(data);
  expect(screen.getAllByRole('button', { name: 'Start Workout' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Start Workout' })).toBeDisabled();
  expect(screen.getByText(/Reference preserved/)).toBeInTheDocument();
  expect(await db.workoutSessions.count()).toBe(0);
});

it('continues an unfinished session and never offers another start on landing', async () => {
  const { db, workouts, day } = await fixture();
  const graph = await workouts.startPlannedWorkout(day.id, now.toISOString());
  await renderLanding(await getWorkoutLanding(db, now));
  expect(screen.getByRole('link', { name: 'Continue Workout' })).toHaveAttribute(
    'href',
    `/workout/${graph.session.id}`,
  );
  expect(screen.queryByRole('button', { name: /Start/ })).toBeNull();
});

it('blocks double taps before rendering pending state and reports a recoverable storage error', async () => {
  const { db } = await fixture();
  let reject!: (error: Error) => void;
  vi.mocked(startPlannedWorkout).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await renderLanding(await getWorkoutLanding(db, now));
  const start = screen.getByRole('button', { name: 'Start Workout' });
  fireEvent.click(start);
  fireEvent.click(start);
  expect(startPlannedWorkout).toHaveBeenCalledOnce();
  reject(new Error('Storage unavailable'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
  await waitFor(() => expect(start).toBeEnabled());
});

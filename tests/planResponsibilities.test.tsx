import { afterEach, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { listPrograms, saveProgramSchedule } from '../src/features/plan/programService';
import { getWorkoutLanding } from '../src/features/workout/workoutService';
import { monthlyCompletion, planCalendar } from '../src/features/plan/scheduleData';
import { trainingCalendar } from '../src/domain/trainingCalendar';
import { PlanPage } from '../src/features/plan/PlanPage';
import { CalendarPage } from '../src/features/plan/CalendarPage';
import { ProgramDetailPage } from '../src/features/plan/ProgramDetailPage';
import { WorkoutPage } from '../src/features/workout/WorkoutPage';
import { programSchema } from '../src/domain/validation';
import { ProgressRepository } from '../src/features/progress/progressService';

const now = new Date(2026, 9, 7, 12);
afterEach(cleanupTestDatabases);

async function fixture(cycle = false) {
  const db = createTestDatabase('plan-responsibilities');
  const programs = new ProgramRepository(db);
  const workouts = new WorkoutRepository(db);
  const program = await programs.create({
    name: 'Strength',
    scheduleType: cycle ? 'cycle' : 'weekly',
  });
  await db.programs.update(program.id, {
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  });
  const day = await programs.addDay({
    programId: program.id,
    name: 'Upper A',
    weekday: cycle ? null : 2,
  });
  const rest = await programs.addDay({
    programId: program.id,
    name: 'Recovery',
    kind: 'recovery',
    weekday: cycle ? null : 3,
  });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Press',
    primaryMuscle: 'chest',
  });
  const prescription = await programs.addExercise({
    programDayId: day.id,
    exerciseId: exercise.id,
    targetSets: 3,
    minReps: 8,
    maxReps: 12,
    restSeconds: 90,
  });
  return { db, programs, workouts, program, day, rest, exercise, prescription };
}

it('shows one guided empty state without empty tabs or creating workouts', async () => {
  const db = createTestDatabase();
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/plan', element: <PlanPage />, loader: () => listPrograms(db, now) }],
        { initialEntries: ['/plan'] },
      )}
    />,
  );
  expect(
    await screen.findByRole('heading', { name: 'Build your training week' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Overview' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Scheduled week')).not.toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Details' })).not.toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: 'Build your training week' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Create your first plan with guided templates. Fully editable and saved on this device.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('Templates')).toBeInTheDocument();
  expect(await db.workoutSessions.count()).toBe(0);
});

it('derives scheduled, rest, missed and empty days using one date projection', async () => {
  const { db, program, day, programs } = await fixture();
  const { calendar } = planCalendar(await listPrograms(db, now));
  expect(calendar.getDayState('2026-10-07').status).toBe('scheduled');
  expect(calendar.getDayState('2026-10-08').status).toBe('rest');
  expect(calendar.getDayState('2026-09-30').status).toBe('unscheduled');
  const empty = await programs.addDay({ programId: program.id, name: 'Empty', weekday: 4 });
  expect(
    planCalendar(await listPrograms(db, now)).calendar.getDayState('2026-10-09'),
  ).toMatchObject({ status: 'empty', entry: { day: { id: empty.id } } });
  expect((await getWorkoutLanding(db, now)).todayDayId).toBe(day.id);
});

it('gives an older active session priority, reads real set totals, then shows completion', async () => {
  const { db, day, workouts } = await fixture();
  const session = await workouts.startPlannedWorkout(
    day.id,
    new Date(2026, 9, 6, 12).toISOString(),
  );
  await workouts.updateSet(session.exercises[0]!.sets[0]!.id, {
    completed: true,
    reps: 10,
    weight: 40,
  });
  const data = await listPrograms(db, now);
  expect(data.sessionProgress).toMatchObject({ completedSets: 1, totalSets: 3 });
  expect(planCalendar(data).calendar.getDayState('2026-10-07')).toMatchObject({
    status: 'active',
    session: { id: session.session.id },
  });
  await workouts.discard(session.session.id);
  const today = await workouts.startPlannedWorkout(day.id, new Date(2026, 9, 7, 10).toISOString());
  await workouts.finish(today.session.id, new Date(2026, 9, 7, 11));
  expect(planCalendar(await listPrograms(db, now)).calendar.getDayState('2026-10-07').status).toBe(
    'completed',
  );
  expect((await getWorkoutLanding(db, now)).state).toBe('completed-today');
});

it('projects an ordered cycle only after scheduling it, including rest and future anchors', async () => {
  const { db, program, day, rest } = await fixture(true);
  expect(planCalendar(await listPrograms(db, now)).calendar.getDayState('2026-10-07').status).toBe(
    'unscheduled',
  );
  await saveProgramSchedule(program.id, { cycleStartDate: '2026-10-07' }, db);
  const { calendar } = planCalendar(await listPrograms(db, now));
  expect(calendar.getScheduledWorkout('2026-10-07')?.day.id).toBe(day.id);
  expect(calendar.getDayState('2026-10-08')).toMatchObject({
    status: 'rest',
    entry: { day: { id: rest.id } },
  });
  expect(calendar.getScheduledWorkout('2026-10-09')?.day.id).toBe(day.id);
  expect((await getWorkoutLanding(db, new Date(2026, 9, 8, 12))).state).toBe('rest-day');
  await saveProgramSchedule(program.id, { cycleStartDate: '2026-11-01' }, db);
  expect(planCalendar(await listPrograms(db, now)).calendar.next?.date).toBe('2026-11-01');
  expect(programSchema.safeParse({ ...program, cycleStartDate: '2026-02-30' }).success).toBe(false);
});

it('renames and edits prescriptions through canonical records and preserves execution snapshots', async () => {
  const { db, day, program, prescription, programs, workouts } = await fixture();
  const original = await workouts.startPlannedWorkout(
    day.id,
    new Date(2026, 9, 6, 10).toISOString(),
  );
  await workouts.finish(original.session.id, new Date(2026, 9, 6, 11));
  await programs.update(program.id, { name: 'Updated Strength' });
  await programs.updateDay(day.id, { name: 'Upper Alpha' });
  await programs.updateExercise(prescription.id, { targetSets: 5, minReps: 6 });
  const plan = planCalendar(await listPrograms(db, now));
  expect(plan.graph?.program.name).toBe('Updated Strength');
  expect(plan.calendar.scheduledToday).toMatchObject({
    day: { name: 'Upper Alpha' },
    exercises: [{ targetSets: 5, minReps: 6 }],
  });
  expect((await getWorkoutLanding(db, now)).previews[0]).toMatchObject({
    day: { name: 'Upper Alpha' },
    entries: [{ prescription: { targetSets: 5, minReps: 6 } }],
  });
  expect((await workouts.get(original.session.id))!.exercises[0]!.exercise.plannedTargetSets).toBe(
    3,
  );
});

it('reschedules atomically, retains IDs and rejects collisions without stale partial writes', async () => {
  const { db, program, day, rest, prescription } = await fixture();
  await saveProgramSchedule(program.id, { weekdays: { [day.id]: '3', [rest.id]: '2' } }, db);
  expect(planCalendar(await listPrograms(db, now)).calendar.getDayState('2026-10-07').status).toBe(
    'rest',
  );
  expect((await getWorkoutLanding(db, now)).state).toBe('rest-day');
  await expect(
    saveProgramSchedule(program.id, { weekdays: { [day.id]: '4', [rest.id]: '4' } }, db),
  ).rejects.toThrow('only one');
  await expect(
    saveProgramSchedule(program.id, { weekdays: { [day.id]: '4', [rest.id]: '99' } }, db),
  ).rejects.toThrow();
  expect((await db.programDays.get(day.id))!.weekday).toBe(3);
  expect(await db.programExercises.get(prescription.id)).toBeDefined();
  db.close();
  await db.open();
  expect(
    planCalendar(await listPrograms(db, now)).calendar.getScheduledWorkout('2026-10-08')?.day.id,
  ).toBe(day.id);
});

it('routes Plan to Workout without creating a session and keeps Program free of execution state', async () => {
  const { db, day, program, programs } = await fixture();
  const router = createMemoryRouter(
    [
      { path: '/plan', element: <PlanPage />, loader: () => listPrograms(db, now) },
      { path: '/plan/calendar', element: <CalendarPage />, loader: () => listPrograms(db, now) },
      {
        path: '/plan/:programId',
        element: <ProgramDetailPage />,
        loader: async () => ({
          graph: await programs.get(program.id),
          activeProgramId: program.id,
          catalog: [],
        }),
      },
      { path: '/workout', element: <WorkoutPage />, loader: () => getWorkoutLanding(db, now) },
    ],
    { initialEntries: ['/plan'] },
  );
  render(<RouterProvider router={router} />);
  const view = await screen.findByRole('link', { name: /View in Workout/ });
  expect(view).toHaveAttribute('href', `/workout?day=${day.id}`);
  fireEvent.click(view);
  expect(await screen.findByRole('button', { name: 'Start Workout' })).toBeInTheDocument();
  expect(await db.workoutSessions.count()).toBe(0);
  await router.navigate('/plan?tab=program');
  expect(await screen.findByRole('link', { name: 'View program details' })).toBeInTheDocument();
  expect(screen.queryByText('Next workout')).toBeNull();
  expect(screen.queryByRole('link', { name: /View in Workout/ })).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'View program details' }));
  expect(await screen.findByRole('heading', { name: 'Program details' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Overview' })).toBeChecked();
  expect(screen.getByRole('link', { name: /Upper A/ })).toHaveAttribute(
    'href',
    `/plan/${program.id}/days/${day.id}?mode=preview`,
  );
});

it('renders the monthly summary and keeps the Monday-first 42-cell calendar', async () => {
  const { db } = await fixture();
  const data = await listPrograms(db, now);
  const streak = await new ProgressRepository(db).streak(now);
  const router = createMemoryRouter(
    [
      {
        path: '/plan/calendar',
        element: <CalendarPage />,
        loader: () => ({ ...data, streak }),
      },
    ],
    { initialEntries: ['/plan/calendar'] },
  );
  render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole('region', { name: 'Monthly workout streak summary' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('This week')).not.toBeInTheDocument();
  expect(document.querySelectorAll('.calendar-month-day')).toHaveLength(42);
  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Previous month' })).toBeInTheDocument();
  const today = screen.getByRole('link', {
    name: 'Wednesday, October 7, Workout day, today',
  });
  expect(today).toHaveAttribute('href', '/plan/calendar/day/2026-10-07?month=2026-10');
  expect(today).toHaveAttribute('aria-current', 'date');
  expect(today).toHaveClass('streak-day-scheduled');
  expect(today.querySelector('svg.lucide-dumbbell')).toBeInTheDocument();
  const futureWorkout = screen.getByRole('link', {
    name: 'Wednesday, October 14, Future workout',
  });
  expect(futureWorkout).toHaveClass('streak-day-future');
  expect(futureWorkout.querySelector('svg.lucide-dumbbell')).toBeInTheDocument();
  expect(today.querySelector('.calendar-month-current-star')).toBeInTheDocument();
  expect(
    document.querySelector('.calendar-legend-status.streak-day-scheduled svg.lucide-dumbbell'),
  ).toBeInTheDocument();
  expect(
    document.querySelector('.calendar-legend-status.streak-day-active svg.lucide-play'),
  ).toBeInTheDocument();
  expect(
    document.querySelector('.calendar-legend-status.streak-day-empty svg.lucide-list-x'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Previous month' }));
  expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Next month' }));
  expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  router.dispose();
});

it('calculates monthly adherence from eligible training dates and leaves today open', async () => {
  const { db, program, day } = await fixture();
  const graph = (await new ProgramRepository(db).get(program.id))!;
  const trackedGraph = {
    ...graph,
    program: { ...graph.program, createdAt: '2026-09-01T12:00:00.000Z' },
  };
  const now = new Date(2026, 9, 7, 18);
  const emptyCalendar = trainingCalendar(trackedGraph, [], now);
  expect(monthlyCompletion('2026-10', emptyCalendar, trackedGraph)).toMatchObject({
    percentage: 0,
    completed: 0,
    eligible: 0,
  });

  const completed = {
    id: 'monthly-completed',
    status: 'completed' as const,
    startedAt: new Date(2026, 9, 7, 10).toISOString(),
    endedAt: new Date(2026, 9, 7, 11).toISOString(),
    scheduledDate: '2026-10-07',
    programId: program.id,
    programDayId: day.id,
  } as import('../src/domain/entities').WorkoutSession;
  const calendar = trainingCalendar(trackedGraph, [completed], now);
  expect(monthlyCompletion('2026-10', calendar, trackedGraph)).toEqual({
    percentage: 100,
    completed: 1,
    eligible: 1,
  });
  expect(monthlyCompletion('2026-11', calendar, trackedGraph).percentage).toBe(0);
});

it('does not track dates before a weekly program becomes effective', async () => {
  const { db, program } = await fixture();
  const graph = (await new ProgramRepository(db).get(program.id))!;
  const trackedGraph = {
    ...graph,
    program: { ...graph.program, createdAt: '2026-10-04T12:00:00.000Z' },
  };
  const calendar = trainingCalendar(trackedGraph, [], new Date(2026, 9, 7, 18));

  expect(calendar.getDayState('2026-10-01').status).toBe('unscheduled');
  expect(calendar.getDayState('2026-10-02').status).toBe('unscheduled');
  expect(calendar.getDayState('2026-10-03').status).toBe('unscheduled');
  expect(calendar.getDayState('2026-10-07').status).toBe('scheduled');
  expect(monthlyCompletion('2026-10', calendar, trackedGraph)).toMatchObject({
    completed: 0,
    eligible: 0,
  });
});

it('connects consecutive completed workouts through rest days within each calendar week', async () => {
  const { db, programs, workouts, program, day, exercise } = await fixture();
  const friday = await programs.addDay({
    programId: program.id,
    name: 'Upper B',
    weekday: 4,
  });
  await programs.addExercise({ programDayId: friday.id, exerciseId: exercise.id, targetSets: 1 });

  const wednesdaySession = await workouts.startPlannedWorkout(
    day.id,
    new Date(2026, 9, 7, 8).toISOString(),
  );
  await workouts.finish(wednesdaySession.session.id, new Date(2026, 9, 7, 9));
  const fridaySession = await workouts.startPlannedWorkout(
    friday.id,
    new Date(2026, 9, 9, 8).toISOString(),
  );
  await workouts.finish(fridaySession.session.id, new Date(2026, 9, 9, 9));

  const data = await listPrograms(db, new Date(2026, 9, 10, 12));
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/plan/calendar', element: <CalendarPage />, loader: () => data }],
        { initialEntries: ['/plan/calendar'] },
      )}
    />,
  );

  const wednesday = await screen.findByRole('link', {
    name: 'Wednesday, October 7, Completed',
  });
  const fridayLink = screen.getByRole('link', { name: 'Friday, October 9, Completed' });
  expect(wednesday).toHaveClass('streak-day-connected', 'streak-day-connected-2');
  expect(fridayLink).not.toHaveClass('streak-day-connected');
});
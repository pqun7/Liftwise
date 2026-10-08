import { afterEach, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { listPrograms, saveProgramSchedule } from '../src/features/plan/programService';
import { getWorkoutLanding } from '../src/features/workout/workoutService';
import { planCalendar } from '../src/features/plan/scheduleData';
import { PlanPage } from '../src/features/plan/PlanPage';
import { CalendarPage } from '../src/features/plan/CalendarPage';
import { ProgramDetailPage } from '../src/features/plan/ProgramDetailPage';
import { WorkoutPage } from '../src/features/workout/WorkoutPage';
import { programSchema } from '../src/domain/validation';

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

it('keeps Schedule default and the existing Current Program empty state behind Program', async () => {
  const db = createTestDatabase();
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/plan', element: <PlanPage />, loader: () => listPrograms(db, now) }],
        { initialEntries: ['/plan'] },
      )}
    />,
  );
  expect(await screen.findByRole('heading', { name: 'No program yet' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Schedule' })).toBeChecked();
  expect(screen.queryByLabelText('Scheduled week')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Program' }));
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
  expect(calendar.getDayState('2026-09-30').status).toBe('missed');
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
  expect(await screen.findByRole('radio', { name: 'Overview' })).toBeChecked();
  expect(screen.getByRole('link', { name: /Upper A/ })).toHaveAttribute(
    'href',
    `/plan/${program.id}/days/${day.id}?mode=preview`,
  );
});

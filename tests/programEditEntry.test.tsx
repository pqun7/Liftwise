import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { PlanPage } from '../src/features/plan/PlanPage';
import { ProgramFormPage } from '../src/features/plan/ProgramFormPage';
import { TrainingDaysPage } from '../src/features/plan/TrainingDaysPage';
import { ProgramBuilderService, programBuilder } from '../src/features/plan/builderService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupTestDatabases();
});

async function fixture() {
  const db = createTestDatabase('saved-edit-entry');
  const repo = new ProgramRepository(db);
  const builder = new ProgramBuilderService(db);
  const program = await repo.create({ name: 'Saved program', splitTemplate: 'custom' });
  const day = await repo.addDay({
    programId: program.id,
    name: 'My push',
    weekday: 0,
    notes: 'Keep notes',
  });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Custom press',
    primaryMuscle: 'chest',
  });
  const target = await repo.addExercise({
    programDayId: day.id,
    exerciseId: exercise.id,
    targetSets: 4,
    restSeconds: 90,
  });
  vi.spyOn(programBuilder, 'saveBasics').mockImplementation(builder.saveBasics.bind(builder));
  const router = createMemoryRouter(
    [
      {
        path: '/plan',
        element: <PlanPage />,
        hydrateFallbackElement: <p>Loading</p>,
        loader: async () => ({
          programs: await repo.list(),
          graphs: [(await repo.get(program.id))!],
          activeProgramId: await repo.getActiveId(),
          now: new Date().toISOString(),
          completed: [],
          unfinished: null,
        }),
      },
      {
        path: '/plan/:id/edit',
        element: <ProgramFormPage mode="edit" />,
        loader: async () => ({ graph: await repo.get(program.id) }),
      },
      {
        path: '/plan/:id/build/days',
        element: <TrainingDaysPage />,
        loader: async () => ({
          graph: await repo.get(program.id),
          catalog: await db.exercises.toArray(),
        }),
      },
    ],
    { initialEntries: ['/plan'] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Saved program' });
  return { repo, program, day, target, router };
}

it('routes saved-program overflow editing through the new builder and preserves existing day/target IDs', async () => {
  const { repo, program, day, target, router } = await fixture();
  fireEvent.click(screen.getByRole('button', { name: 'Program settings' }));
  const dialog = screen.getByRole('dialog', { name: 'Program options' });
  fireEvent.click(within(dialog).getByRole('link', { name: 'Edit program' }));
  const name = await screen.findByRole('textbox', { name: 'Program name' });
  expect(screen.queryByRole('group', { name: 'Editor view' })).not.toBeInTheDocument();
  expect(
    screen
      .getByRole('navigation', { name: 'Program builder steps' })
      .querySelector('[aria-current="step"]'),
  ).toHaveTextContent('Basics');
  expect(router.state.location.pathname).toBe(`/plan/${program.id}/edit`);
  fireEvent.change(name, { target: { value: 'Updated program' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Program' }));
  await screen.findByRole('heading', { name: 'Choose a starting template' });
  expect(router.state.location.search).toBe('?stage=program');
  const graph = (await repo.get(program.id))!;
  expect(graph.program.name).toBe('Updated program');
  expect(graph.days[0]).toMatchObject({
    day: { id: day.id, name: 'My push', notes: 'Keep notes' },
    exercises: [{ id: target.id, targetSets: 4, restSeconds: 90 }],
  });
});

it('opens saved schedule editing directly on the Schedule step without the legacy editor', async () => {
  const { router, program } = await fixture();
  fireEvent.click(screen.getByRole('button', { name: 'Program settings' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Program options' })).getByRole('link', {
      name: 'Edit schedule',
    }),
  );
  await screen.findByRole('group', { name: 'Training weekdays' });
  expect(router.state.location.pathname).toBe(`/plan/${program.id}/build/days`);
  expect(router.state.location.search).toBe('?stage=schedule');
  expect(
    screen
      .getByRole('navigation', { name: 'Program builder steps' })
      .querySelector('[aria-current="step"]'),
  ).toHaveTextContent('Schedule');
  expect(screen.queryByRole('group', { name: 'Editor view' })).not.toBeInTheDocument();
  expect(screen.getByText('1 exercise · ~10 min')).toBeInTheDocument();
});

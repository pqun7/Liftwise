import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { TrainingDaysPage } from '../src/features/plan/TrainingDaysPage';
import { ProgramBuilderService, programBuilder } from '../src/features/plan/builderService';
import * as programService from '../src/features/plan/programService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { repdbCatalogArtifactSchema } from '../src/data/providers/repdb/schema';
import { seedRepdbCatalog } from '../src/data/providers/repdb/seeder';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupTestDatabases();
});

async function fixture(existing = false, cycle = false) {
  const db = createTestDatabase('schedule-ui');
  await seedRepdbCatalog(
    repdbCatalogArtifactSchema.parse(JSON.parse(readFileSync('public/repdb/catalog.json', 'utf8'))),
    db,
  );
  const builder = new ProgramBuilderService(db);
  const repo = new ProgramRepository(db);
  const program = await builder.saveBasics({
    name: 'Schedule UI',
    scheduleType: cycle ? 'cycle' : 'weekly',
    goal: 'strength',
    level: 'intermediate',
  });
  if (existing) await builder.applyTemplate(program.id, 'full-body-3');
  vi.spyOn(programBuilder, 'applyTemplate').mockImplementation(builder.applyTemplate.bind(builder));
  vi.spyOn(programBuilder, 'useCustomTemplate').mockImplementation(
    builder.useCustomTemplate.bind(builder),
  );
  vi.spyOn(programBuilder, 'chooseDays').mockImplementation(builder.chooseDays.bind(builder));
  vi.spyOn(programBuilder, 'addCycleWorkout').mockImplementation(
    builder.addCycleWorkout.bind(builder),
  );
  vi.spyOn(programService, 'getProgram').mockImplementation((id) => repo.get(id));
  vi.spyOn(programService, 'updateProgramDay').mockImplementation((id, input) =>
    repo.updateDay(id, input),
  );
  vi.spyOn(programService, 'createProgramDay').mockImplementation((id, input) =>
    repo.addDay({ ...input, programId: id, name: input.name ?? 'Workout' }),
  );
  const router = createMemoryRouter(
    [
      {
        path: '/plan/:id/build/days',
        element: <TrainingDaysPage />,
        hydrateFallbackElement: <p>Loading</p>,
        loader: async () => ({
          graph: await repo.get(program.id),
          catalog: await db.exercises.toArray(),
        }),
      },
      { path: '/plan/:id/days/:dayId', element: <h1>Exercises destination</h1> },
    ],
    { initialEntries: [`/plan/${program.id}/build/days`] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole('navigation', { name: 'Program builder steps' });
  return { db, builder, repo, program, router };
}

it('separates Program selection from Schedule and reaches Exercises with a truly blank Custom schedule', async () => {
  const { repo, program } = await fixture();
  expect(screen.getByRole('heading', { name: 'Choose a starting template' })).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Training weekdays' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Custom.*Build your own routine/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Custom Template' }));
  await screen.findByRole('group', { name: 'Training weekdays' });
  expect(
    screen.queryByRole('heading', { name: 'Choose a starting template' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next: Exercises' }));
  await screen.findByRole('heading', { name: 'Exercises destination' });
  const graph = (await repo.get(program.id))!;
  expect(graph.program.splitTemplate).toBe('custom');
  expect(graph.days).toHaveLength(4);
  expect(graph.days.every(({ exercises }) => exercises.length === 0)).toBe(true);
});

it('renames a preview day safely before the schedule loader has revalidated', async () => {
  const { repo, program } = await fixture();
  fireEvent.click(screen.getByRole('button', { name: /Custom.*Build your own routine/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Custom Template' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Rename Monday' }));
  const input = await screen.findByRole('textbox', { name: 'Workout name' });
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: 'My custom push' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('My custom push', { exact: true });
  expect((await repo.get(program.id))?.days[0]).toMatchObject({
    day: { name: 'My custom push' },
    exercises: [],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Next: Exercises' }));
  await screen.findByRole('heading', { name: 'Exercises destination' });
});

it('shows five distinct progress steps and preserves pending Custom state when stepping back to Program', async () => {
  const { repo, program, router } = await fixture();
  const nav = screen.getByRole('navigation', { name: 'Program builder steps' });
  expect(
    within(nav)
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual(['Basics', 'Program', 'Schedule', 'Exercises', 'Review']);
  expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent('Program');
  fireEvent.click(screen.getByRole('button', { name: /Custom.*Build your own routine/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Custom Template' }));
  await screen.findByRole('group', { name: 'Training weekdays' });
  expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent('Schedule');
  expect(router.state.location.search).toBe('?stage=schedule');
  fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
  fireEvent.click(within(nav).getByRole('link', { name: 'Program' }));
  await screen.findByRole('heading', { name: 'Choose a starting template' });
  expect(router.state.location.search).toBe('?stage=program');
  expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Custom.*Build your own routine/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Use Custom Template' }));
  await screen.findByRole('group', { name: 'Training weekdays' });
  expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Next: Exercises' }));
  await screen.findByRole('heading', { name: 'Exercises destination' });
  expect((await repo.get(program.id))?.days.every(({ exercises }) => exercises.length === 0)).toBe(
    true,
  );
});

it('keeps saved prescriptions after cancelled Custom replacement and removes them only after confirmation', async () => {
  const { repo, program, router } = await fixture(true);
  const before = await repo.get(program.id);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Change' }));
  fireEvent.click(await screen.findByRole('button', { name: /Custom.*Build your own routine/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Custom Template' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Next: Exercises' }));
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  expect(await repo.get(program.id)).toEqual(before);
  expect(router.state.location.pathname).toContain('/build/days');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Next: Exercises' })).toBeEnabled(),
  );
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Next: Exercises' }));
  await screen.findByRole('heading', { name: 'Exercises destination' });
  expect((await repo.get(program.id))?.days.every(({ exercises }) => exercises.length === 0)).toBe(
    true,
  );
});

it('adds custom cycle workouts without offering presets and keeps Next disabled for recovery-only cycles', async () => {
  const { repo, program } = await fixture(false, true);
  fireEvent.click(screen.getByRole('button', { name: /Custom.*Build your own routine/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Use Custom Template' }));
  expect(await screen.findByRole('button', { name: 'Next: Exercises' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add Recovery Day' }));
  await screen.findByText('Rest day', { exact: true });
  expect(screen.getByRole('button', { name: 'Next: Exercises' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add Workout Day' }));
  const input = screen.getByRole('textbox', { name: 'Workout name' });
  fireEvent.change(input, { target: { value: 'Arms' } });
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Add Workout Day',
    }),
  );
  await screen.findByText('Arms', { exact: true });
  const graph = (await repo.get(program.id))!;
  expect(graph.days).toHaveLength(2);
  expect(graph.days.every(({ exercises }) => exercises.length === 0)).toBe(true);
  expect(screen.getByRole('button', { name: 'Next: Exercises' })).toBeEnabled();
});

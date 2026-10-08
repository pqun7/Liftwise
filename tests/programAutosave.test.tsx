import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ProgramDetailPage } from '../src/features/plan/ProgramDetailPage';
import { updateProgram } from '../src/features/plan/programService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

vi.mock('../src/features/plan/programService', async (original) => ({
  ...(await original<typeof import('../src/features/plan/programService')>()),
  updateProgram: vi.fn(),
}));
afterEach(async () => {
  vi.clearAllMocks();
  await cleanupTestDatabases();
});

async function fixture() {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const program = await repo.create({ name: 'Initial', goal: 'strength' });
  vi.mocked(updateProgram).mockImplementation((id, input) => repo.update(id, input));
  const router = createMemoryRouter(
    [
      {
        path: '/plan/:id',
        element: <ProgramDetailPage />,
        loader: async () => ({
          graph: await repo.get(program.id),
          activeProgramId: null,
          catalog: [],
        }),
        hydrateFallbackElement: <p>Loading</p>,
      },
      { path: '/plan', element: <h1>Plans</h1> },
    ],
    { initialEntries: [`/plan/${program.id}?tab=edit`] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Initial' });
  fireEvent.click(screen.getByRole('button', { name: /Initial.*0 training days/ }));
  return { db, repo, program, router };
}

it('keeps the latest typed name, waits for persistence before departure and restores after reopen', async () => {
  const { db, repo, program, router } = await fixture();
  let resolve!: () => void;
  const slow = new Promise<void>((done) => {
    resolve = done;
  });
  vi.mocked(updateProgram).mockImplementationOnce(async (id, input) => {
    await slow;
    return repo.update(id, input);
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Program name' }), {
    target: { value: 'Push A' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Program name' }), {
    target: { value: 'Push Strength' },
  });
  expect(screen.getByRole('textbox', { name: 'Program name' })).toHaveValue('Push Strength');
  expect(screen.queryByText('✓ Saved')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Back to Programs' }));
  expect(router.state.location.pathname).toBe(`/plan/${program.id}`);
  act(() => {
    resolve();
  });
  await screen.findByRole('heading', { name: 'Plans' });
  db.close();
  await db.open();
  expect((await repo.get(program.id))!.program.name).toBe('Push Strength');
});

it('retains invalid input, blocks departure on failure and retries the latest value', async () => {
  const { repo, program } = await fixture();
  const field = screen.getByRole('textbox', { name: 'Program name' });
  fireEvent.change(field, { target: { value: '   ' } });
  await screen.findByText('Save failed — Retry');
  expect(field).toHaveValue('   ');
  expect((await repo.get(program.id))!.program.name).toBe('Initial');
  fireEvent.click(screen.getByRole('link', { name: 'Back to Programs' }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Plans' })).toBeNull());
  vi.mocked(updateProgram).mockRejectedValueOnce(new Error('Storage temporarily unavailable'));
  fireEvent.change(field, { target: { value: 'Recovered' } });
  await screen.findByText('Storage temporarily unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  await screen.findByText('✓ Saved');
  expect((await repo.get(program.id))!.program.name).toBe('Recovered');
});

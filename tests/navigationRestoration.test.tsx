import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useSearchParams } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ScreenStateProvider } from '../src/app/ScreenStateProvider';
import { ScreenStateStore, useScreenState } from '../src/app/useScreenState';
import { WorkoutSessionPage } from '../src/features/workout/WorkoutSessionPage';
import { ExerciseDetailPage } from '../src/features/exercises/ExerciseDetailPage';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

afterEach(async () => {
  vi.clearAllMocks();
  await cleanupTestDatabases();
});

it('restores overview and collapsed exercises through contextual Back without resetting scroll', async () => {
  const scrollSpy = vi.spyOn(window, 'scrollTo');
  const db = createTestDatabase('navigation');
  const exercises = new ExerciseRepository(db);
  const first = await exercises.create({ name: 'Bench', primaryMuscle: 'chest' });
  const second = await exercises.create({ name: 'Row', primaryMuscle: 'back' });
  const repo = new WorkoutRepository(db);
  const session = await repo.createSession({ name: 'Upper B' });
  for (const [index, source] of [first, second].entries()) {
    const entry = await repo.addExercise({ workoutSessionId: session.id, exerciseId: source.id });
    await repo.addSet({
      workoutExerciseId: entry.id,
      setType: 'working',
      weight: 20,
      reps: 10,
      completed: index === 0,
    });
  }
  const router = createMemoryRouter(
    [
      {
        element: (
          <ScreenStateProvider>
            <Outlet />
          </ScreenStateProvider>
        ),
        children: [
          {
            path: '/workout/:id',
            element: <WorkoutSessionPage />,
            loader: async () => {
              const graph = (await repo.get(session.id))!;
              return {
                workout: {
                  ...graph,
                  exercises: graph.exercises.map((entry) => ({
                    ...entry,
                    previous: null,
                    displayExercise: null,
                  })),
                },
              };
            },
          },
          {
            path: '/exercises/:id',
            element: <ExerciseDetailPage />,
            loader: () => ({ exercise: first }),
          },
        ],
      },
    ],
    { initialEntries: [`/workout/${session.id}`] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Upper B' });
  fireEvent.click(screen.getByRole('button', { name: 'Workout Overview', hidden: true }));
  await screen.findByRole('button', { name: 'Collapse completed exercise' });
  const bench = screen.getByRole('article', { name: 'Bench' });
  fireEvent.click(within(bench).getByRole('button', { name: 'Collapse completed exercise' }));
  expect(within(bench).getByRole('button', { name: 'Expand exercise' })).toBeVisible();
  fireEvent.click(within(bench).getByRole('link', { name: 'Bench' }));
  const back = await screen.findByRole('button', { name: 'Workout' });
  expect(screen.getByRole('heading', { name: 'Bench' })).toBeVisible();
  expect(screen.queryByRole('link', { name: /Exercise library/ })).toBeNull();
  scrollSpy.mockClear();
  fireEvent.click(back);
  await screen.findByRole('heading', { name: 'Upper B' });
  expect(screen.getByRole('button', { name: 'Expand exercise' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Close overview', hidden: true })).toBeInTheDocument();
  expect(scrollSpy).not.toHaveBeenCalled();
  expect((await repo.get(session.id))!.exercises[0]!.sets[0]).toMatchObject({
    weight: 20,
    reps: 10,
    completed: true,
  });
  await act(() => router.navigate('/exercises/direct'));
});

it('direct exercise links retain a safe library fallback', async () => {
  const db = createTestDatabase('direct');
  const exercise = await new ExerciseRepository(db).create({
    name: 'Squat',
    primaryMuscle: 'quads',
  });
  render(
    <RouterProvider
      router={createMemoryRouter(
        [{ path: '/exercises/:id', element: <ExerciseDetailPage />, loader: () => ({ exercise }) }],
        { initialEntries: ['/exercises/direct'] },
      )}
    />,
  );
  await screen.findByRole('heading', { name: 'Squat' });
  expect(screen.getByRole('link', { name: 'Exercise library' })).toHaveAttribute(
    'href',
    '/exercises',
  );
});

function Picker() {
  const [value, setValue] = useScreenState<string | null>('selection', 'default');
  return <button onClick={() => setValue(null)}>{value ?? 'cleared'}</button>;
}
it('preserves a deliberate null selection across route recreation', async () => {
  const router = createMemoryRouter(
    [
      {
        element: (
          <ScreenStateProvider>
            <Outlet />
          </ScreenStateProvider>
        ),
        children: [
          { path: '/picker', element: <Picker /> },
          { path: '/child', element: <h1>Child</h1> },
        ],
      },
    ],
    { initialEntries: ['/picker'] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole('button', { name: 'default' }));
  await act(() => router.navigate('/child'));
  await act(() => router.navigate(-1));
  expect(screen.getByRole('button', { name: 'cleared' })).toBeInTheDocument();
});

it('bounds presentation-state retention and scopes subscriptions to their screen', () => {
  const store = new ScreenStateStore();
  const listener = vi.fn();
  const stop = store.subscribe('/workout/a:overview', listener);
  store.write('/workout/b:overview', true);
  expect(listener).not.toHaveBeenCalled();
  store.write('/workout/a:overview', true);
  expect(listener).toHaveBeenCalledOnce();
  stop();
  store.write('/workout/a:overview', false);
  expect(listener).toHaveBeenCalledOnce();
  for (let index = 0; index < 110; index++) store.write(`route-${index}`, index);
  expect(store.read('/workout/a:overview', 'evicted')).toBe('evicted');
  expect(store.read('route-109', -1)).toBe(109);
});

function ScopedPicker() {
  const [params] = useSearchParams();
  const scope = params.get('scope') ?? 'one';
  const [value, setValue] = useScreenState(scope, scope);
  return <button onClick={() => setValue('chosen')}>{value}</button>;
}
it('seeds new query scopes independently when the router reuses the same screen', async () => {
  const router = createMemoryRouter(
    [
      {
        element: (
          <ScreenStateProvider>
            <Outlet />
          </ScreenStateProvider>
        ),
        children: [{ path: '/picker', element: <ScopedPicker /> }],
      },
    ],
    { initialEntries: ['/picker?scope=one'] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole('button', { name: 'one' }));
  await act(() => router.navigate('/picker?scope=two'));
  expect(screen.getByRole('button', { name: 'two' })).toBeInTheDocument();
  await act(() => router.navigate(-1));
  expect(screen.getByRole('button', { name: 'chosen' })).toBeInTheDocument();
});

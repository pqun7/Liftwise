import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutSessionPage } from '../src/features/workout/WorkoutSessionPage';
import { updateWorkoutSet, finishWorkout } from '../src/features/workout/workoutService';
import { CurrentExerciseCard } from '../src/features/workout/CurrentExerciseCard';
import { targetRange } from '../src/features/workout/workoutFormat';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

vi.mock('../src/features/workout/workoutService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/features/workout/workoutService')>()),
  updateWorkoutSet: vi.fn(),
  finishWorkout: vi.fn(),
}));
afterEach(async () => {
  vi.resetAllMocks();
  await cleanupTestDatabases();
});
async function fixture() {
  const db = createTestDatabase('experience');
  const repo = new WorkoutRepository(db);
  const source = await new ExerciseRepository(db).create({ name: 'Bench', primaryMuscle: 'chest' });
  const session = await repo.createSession();
  const exercise = await repo.addExercise({
    workoutSessionId: session.id,
    exerciseId: source.id,
    plannedTargetSets: 3,
    plannedMinReps: 8,
    plannedMaxReps: 10,
    plannedRirMin: 0,
    plannedRirMax: 2,
    plannedRestSeconds: 120,
  });
  const sets = await Promise.all(
    [1, 2, 3].map((setNumber) =>
      repo.addSet({ workoutExerciseId: exercise.id, setNumber, setType: 'working' }),
    ),
  );
  return { db, repo, source, session, exercise, sets };
}
async function renderSession(repo: WorkoutRepository, id: string) {
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            path: '/workout/:id',
            element: <WorkoutSessionPage />,
            hydrateFallbackElement: <p>Opening</p>,
            loader: async () => {
              const graph = (await repo.get(id))!;
              return {
                workout: {
                  ...graph,
                  exercises: graph.exercises.map((item) => ({
                    ...item,
                    previous: null,
                    displayExercise: null,
                  })),
                },
              };
            },
          },
          { path: '/', element: <h1>Home after save</h1> },
        ],
        { initialEntries: [`/workout/${id}`] },
      )}
    />,
  );
  await screen.findByRole('heading', { name: 'Bench' });
}
describe('workout targets, history and next set', () => {
  it('holds route departure until a slow draft commits to IndexedDB', async () => {
    const { repo, session, db, sets } = await fixture();
    let release!: () => void;
    const slow = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(updateWorkoutSet).mockImplementation(async (id, input) => {
      await slow;
      return repo.updateSet(id, input);
    });
    await renderSession(repo, session.id);
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '82.5' } });
    fireEvent.click(screen.getByRole('link', { name: 'Leave workout, keep session saved' }));
    expect(screen.queryByRole('heading', { name: 'Home after save' })).toBeNull();
    await act(async () => {
      release();
      await slow;
    });
    await screen.findByRole('heading', { name: 'Home after save' });
    expect(await db.workoutSets.get(sets[0]!.id)).toMatchObject({ weight: 82.5, completed: false });
  });
  it('keeps failed edits available through finish review and blocks leaving or finishing until saved', async () => {
    const { repo, session } = await fixture();
    vi.mocked(updateWorkoutSet)
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockImplementation((id, input) => repo.updateSet(id, input));
    vi.mocked(finishWorkout).mockImplementation((id) => repo.finish(id));
    await renderSession(repo, session.id);
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '77.5' } });
    await screen.findByRole('button', { name: 'Retry save' });
    fireEvent.click(screen.getByRole('link', { name: 'Leave workout, keep session saved' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Home after save' })).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Finish Workout', hidden: true }));
    expect(screen.getByText('3 sets are incomplete.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish anyway' }));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(finishWorkout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep training' }));
    expect(screen.getByLabelText('Set 1 weight')).toHaveValue('77.5');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull());
    expect((await repo.get(session.id))?.exercises[0]?.sets[0]?.weight).toBe(77.5);
  });
  it('shows snapshot targets and the current historical set rather than the last historical set', async () => {
    const { exercise, sets } = await fixture();
    render(
      <MemoryRouter>
        <CurrentExerciseCard
          entry={{
            exercise,
            sets: [{ ...sets[0]!, completed: true }, sets[1]!, sets[2]!],
            displayExercise: null,
            previous: {
              exercise,
              sets: sets.map((set, i) => ({
                ...set,
                completed: true,
                weight: 80 + i * 5,
                reps: 10 - i,
                rir: i,
              })),
            },
          }}
        />
      </MemoryRouter>,
    );
    const targets = screen.getByRole('region', { name: 'Target' });
    expect(targets).toHaveTextContent('Sets3');
    expect(targets).toHaveTextContent('Reps8–10');
    expect(targets).toHaveTextContent('RIR0–2');
    expect(targets).toHaveTextContent('Rest2:00');
    const previous = screen.getByRole('link', { name: 'Last workout' });
    expect(previous).toHaveTextContent('Previous · Set 2');
    expect(previous).toHaveTextContent('85 kg × 9 @ 1 RIR');
    expect(within(previous).queryByText(/90 kg/)).toBeNull();
  });
  it('formats absent, one-sided and zero targets explicitly', () => {
    expect(targetRange(null, null)).toBe('Not set');
    expect(targetRange(8, null)).toBe('≥ 8');
    expect(targetRange(null, 10)).toBe('≤ 10');
    expect(targetRange(0, 0)).toBe('0');
  });
  it('prepares untouched blank next sets without overwriting user edits, including deliberate clears', async () => {
    const { db, repo, sets } = await fixture();
    await repo.updateSet(sets[2]!.id, { weight: null });
    await repo.completeSet(sets[0]!.id, { weight: 0, reps: 15, rir: 0 });
    expect(await db.workoutSets.get(sets[1]!.id)).toMatchObject({
      weight: 0,
      reps: 15,
      rir: 0,
      completed: false,
    });
    await repo.completeSet(sets[1]!.id, { weight: 2.5, reps: 12, rir: null });
    expect(await db.workoutSets.get(sets[2]!.id)).toMatchObject({
      weight: null,
      reps: null,
      rir: null,
      completed: false,
    });
  });
  it('preserves existing historical prefill on the next set', async () => {
    const { db, repo, sets } = await fixture();
    await repo.updateSet(sets[1]!.id, { weight: 75, reps: 8, rir: 2 });
    await repo.completeSet(sets[0]!.id, { weight: 80, reps: 10, rir: 1 });
    expect(await db.workoutSets.get(sets[1]!.id)).toMatchObject({ weight: 75, reps: 8, rir: 2 });
  });
  it('finds older usable history past empty workouts and handles duplicate exercises', async () => {
    const { repo, source, session, sets } = await fixture();
    await repo.completeSet(sets[0]!.id, { weight: 62.5, reps: 8 });
    await repo.finish(session.id);
    const empty = await repo.createSession({
      startedAt: new Date(Date.now() + 1000).toISOString(),
    });
    const skipped = await repo.addExercise({ workoutSessionId: empty.id, exerciseId: source.id });
    await repo.skipExercise(skipped.id, true);
    await repo.finish(empty.id, new Date(Date.now() + 2000));
    expect((await repo.getPreviousCompletedExercise(source.id))?.sets[0]?.weight).toBe(62.5);
    const duplicateSession = await repo.createSession({
      startedAt: new Date(Date.now() + 3000).toISOString(),
    });
    await repo.addExercise({ workoutSessionId: duplicateSession.id, exerciseId: source.id });
    const duplicate = await repo.addExercise({
      workoutSessionId: duplicateSession.id,
      exerciseId: source.id,
    });
    await repo.addSet({
      workoutExerciseId: duplicate.id,
      setType: 'working',
      weight: 70,
      reps: 8,
      completed: true,
    });
    await repo.finish(duplicateSession.id, new Date(Date.now() + 4000));
    expect((await repo.getPreviousCompletedExercise(source.id))?.sets[0]?.weight).toBe(70);
  });
});

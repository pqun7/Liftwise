import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutSessionPage } from '../src/features/workout/WorkoutSessionPage';
import {
  updateWorkoutSet,
  finishWorkout,
  completeWorkoutSet,
  clearWorkoutRest,
  extendWorkoutRest,
  setCurrentWorkoutExercise,
  undoWorkoutCompletion,
} from '../src/features/workout/workoutService';
import { CurrentExerciseCard } from '../src/features/workout/CurrentExerciseCard';
import { targetRange } from '../src/features/workout/workoutFormat';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

vi.mock('../src/features/workout/workoutService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/features/workout/workoutService')>()),
  updateWorkoutSet: vi.fn(),
  finishWorkout: vi.fn(),
  completeWorkoutSet: vi.fn(),
  clearWorkoutRest: vi.fn(),
  extendWorkoutRest: vi.fn(),
  setCurrentWorkoutExercise: vi.fn(),
  undoWorkoutCompletion: vi.fn(),
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
async function renderSession(repo: WorkoutRepository, id: string, details = false) {
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
        { initialEntries: [`/workout/${id}${details ? '?details=1' : ''}`] },
      )}
    />,
  );
  await screen.findByRole('heading', { name: 'Quick Workout' });
}
describe('workout targets, history and next set', () => {
  it('opens calendar completion links directly into read-only session details', async () => {
    const { repo, session, sets } = await fixture();
    await repo.updateSet(sets[0]!.id, { completed: true, reps: 8, weight: 40 });
    await repo.finish(session.id);
    await renderSession(repo, session.id, true);
    expect(screen.getByRole('heading', { name: 'Session recap' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Start|Continue|Undo|Finish/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Set 1 weight')).not.toBeInTheDocument();
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect((await repo.get(session.id))!.session.status).toBe('completed');
  });
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
    fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Save & Exit' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Home after save' })).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue Workout' }));
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
    expect(targets).toHaveTextContent('RIR 0–2');
    expect(targets).toHaveTextContent('Rest 2:00');
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

describe('canonical workout V2 journey', () => {
  async function ready() {
    const data = await fixture();
    const { repo, sets } = data;
    await repo.updateSet(sets[0]!.id, { weight: 20, reps: 12, rir: 0 });
    vi.mocked(updateWorkoutSet).mockImplementation((id, input) => repo.updateSet(id, input));
    vi.mocked(completeWorkoutSet).mockImplementation((id, input) =>
      repo.completeSet(id, input, true),
    );
    vi.mocked(clearWorkoutRest).mockImplementation((id) => repo.clearRest(id));
    vi.mocked(extendWorkoutRest).mockImplementation((id) => repo.extendRest(id));
    vi.mocked(setCurrentWorkoutExercise).mockImplementation((id, exercise) =>
      repo.setCurrentExercise(id, exercise),
    );
    vi.mocked(undoWorkoutCompletion).mockImplementation((undo) => repo.undoCompletion(undo));
    return data;
  }
  it('completes once, restores Rest from storage, extends it, edits the next canonical set and starts without logging it', async () => {
    const { repo, session } = await ready();
    await renderSession(repo, session.id);
    const complete = screen.getByRole('button', { name: 'Complete set' });
    fireEvent.click(complete);
    fireEvent.click(complete);
    await screen.findByRole('region', { name: 'Rest timer' });
    expect(completeWorkoutSet).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Complete set' })).toBeNull();
    const before = (await repo.get(session.id))!.session.restEndsAt!;
    fireEvent.click(screen.getByRole('button', { name: '+30 sec' }));
    await waitFor(async () =>
      expect(
        Date.parse((await repo.get(session.id))!.session.restEndsAt!) - Date.parse(before),
      ).toBe(30000),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Set 2 weight'), { target: { value: '22.5' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Start Set 2/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Start Set 2/ }));
    await screen.findByRole('button', { name: 'Complete set' }, { timeout: 5000 });
    expect(screen.getByLabelText('Set 2 weight')).toHaveValue('22.5');
    expect((await repo.get(session.id))!.session.restEndsAt).toBeNull();
    expect((await repo.get(session.id))!.exercises[0]!.sets[1]!.completed).toBe(false);
  });
  it('restores an expired rest without auto-starting and undo restores prior rest', async () => {
    const { repo, session, sets } = await ready();
    await repo.startRest(session.id, 60);
    const prior = (await repo.get(session.id))!.session.restEndsAt;
    const undo = await repo.completeSet(sets[0]!.id, {}, true);
    await repo.startRest(session.id, 120, new Date(Date.now() - 200000));
    await renderSession(repo, session.id);
    expect(screen.getByText('Rest complete')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete set' })).toBeNull();
    // Restore the exact completion timer before exercising existing undo semantics.
    await repo.clearRest(session.id);
    await repo.undoCompletion({ ...undo, completionRestEndsAt: null });
    expect((await repo.get(session.id))!.session.restEndsAt).toBe(prior);
    expect((await repo.get(session.id))!.exercises[0]!.sets[0]!.completed).toBe(false);
  });
  it('shows exercise completion without rest and selects the next unfinished exercise', async () => {
    const { repo, session, source, sets } = await ready();
    const next = await repo.addExercise({ workoutSessionId: session.id, exerciseId: source.id });
    await repo.addSet({ workoutExerciseId: next.id, setType: 'working', weight: 0, reps: 10 });
    for (const set of sets) await repo.completeSet(set.id, { weight: 20, reps: 12 }, true);
    await renderSession(repo, session.id);
    expect(screen.getByRole('region', { name: 'Exercise complete' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Rest timer' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next Exercise' }));
    await screen.findByRole('button', { name: 'Complete set' }, { timeout: 5000 });
    expect((await repo.get(session.id))!.session.currentExerciseId).toBe(next.id);
  });
  it('commits the final set and workout together, skips rest, survives reopen, and supports final Undo', async () => {
    const { repo, session, sets } = await ready();
    await repo.completeSet(sets[0]!.id, {}, true);
    await repo.completeSet(sets[1]!.id, {}, true);
    await repo.clearRest(session.id);
    await renderSession(repo, session.id);
    fireEvent.click(screen.getByRole('button', { name: 'Complete set' }));
    await screen.findByRole('heading', { name: 'Workout complete' });
    expect((await repo.get(session.id))!.session).toMatchObject({
      status: 'completed',
      restEndsAt: null,
    });
    expect(await repo.getUnfinished()).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'View Workout Details' }));
    expect(screen.getByRole('region', { name: 'Exercise summaries' })).toHaveTextContent('3 of 3');
  });
  it('rejects paused completion and persists the source exercise when completing out of order', async () => {
    const { repo, session, source, sets } = await ready();
    await repo.pause(session.id);
    await expect(repo.completeSet(sets[0]!.id, {}, true)).rejects.toThrow('Resume the workout');
    expect((await repo.get(session.id))!.exercises[0]!.sets[0]!.completed).toBe(false);
    await repo.resume(session.id);
    const other = await repo.addExercise({ workoutSessionId: session.id, exerciseId: source.id });
    const set = await repo.addSet({
      workoutExerciseId: other.id,
      setType: 'working',
      weight: 0,
      reps: 10,
    });
    await repo.completeSet(set.id, {}, true);
    expect((await repo.get(session.id))!.session).toMatchObject({
      currentExerciseId: other.id,
      restEndsAt: null,
      status: 'active',
    });
  });
  it('omits zero-second rest and serializes competing repository completions', async () => {
    const { repo, session, sets, db, exercise } = await ready();
    await db.workoutExercises.update(exercise.id, { plannedRestSeconds: 0 });
    const results = await Promise.allSettled([
      repo.completeSet(sets[0]!.id, {}, true),
      repo.completeSet(sets[0]!.id, {}, true),
    ]);
    expect(results.filter((value) => value.status === 'fulfilled')).toHaveLength(1);
    expect((await repo.get(session.id))!.session.restEndsAt).toBeNull();
    await repo.completeSet(sets[1]!.id, {}, true);
    const undo = await repo.completeSet(sets[2]!.id, {}, true);
    await repo.undoCompletion(undo);
    expect((await repo.get(session.id))!.session.status).toBe('active');
    expect((await repo.get(session.id))!.exercises[0]!.sets[2]!.completed).toBe(false);
  });
});

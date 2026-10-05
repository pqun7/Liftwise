import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkoutSaveContext } from '../src/features/workout/WorkoutSaveContext';
import { WorkoutSaveQueue } from '../src/features/workout/workoutSaveQueue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SetLogger } from '../src/features/workout/SetLogger';
import { RestTimer } from '../src/features/workout/RestTimer';
import type { WorkoutSet } from '../src/domain/entities';
import { completeWorkoutSet, updateWorkoutSet } from '../src/features/workout/workoutService';

vi.mock('../src/features/workout/workoutService', () => ({
  updateWorkoutSet: vi.fn().mockResolvedValue({}),
  completeWorkoutSet: vi.fn().mockResolvedValue({ setId: 'set-1' }),
}));
afterEach(() => vi.clearAllMocks());
const set: WorkoutSet = {
  id: 'set-1',
  workoutExerciseId: 'exercise-1',
  setNumber: 1,
  setType: 'working',
  weight: 60,
  reps: 8,
  rir: 2,
  completed: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('focused workout logger', () => {
  it('saves rapid field changes before immediate completion despite a slow first write', async () => {
    let release!: () => void;
    vi.mocked(updateWorkoutSet).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({} as WorkoutSet);
        }),
    );
    render(<SetLogger sets={[set]} previous={[]} refresh={vi.fn()} onCompleted={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '82.5' } });
    fireEvent.change(screen.getByLabelText('Set 1 reps'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Set 1 RIR'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete set' }));
    await waitFor(() => expect(updateWorkoutSet).toHaveBeenCalled());
    expect(completeWorkoutSet).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(completeWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 82.5, reps: 10, rir: 0 }),
    );
  });
  it('retains failed draft text when switching editors and retry does not complete it', async () => {
    const queue = new WorkoutSaveQueue();
    vi.mocked(updateWorkoutSet).mockRejectedValueOnce(new Error('Storage unavailable'));
    const props = { sets: [set], previous: [], refresh: vi.fn(), onCompleted: vi.fn() };
    const view = render(
      <WorkoutSaveContext.Provider value={queue}>
        <SetLogger {...props} />
      </WorkoutSaveContext.Provider>,
    );
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '77.5' } });
    await waitFor(() => expect(queue.error).toBe('Storage unavailable'));
    view.rerender(
      <WorkoutSaveContext.Provider value={queue}>
        <div />
      </WorkoutSaveContext.Provider>,
    );
    view.rerender(
      <WorkoutSaveContext.Provider value={queue}>
        <SetLogger {...props} />
      </WorkoutSaveContext.Provider>,
    );
    expect(screen.getByLabelText('Set 1 weight')).toHaveValue('77.5');
    await act(async () => {
      await queue.retry();
    });
    expect(updateWorkoutSet).toHaveBeenLastCalledWith('set-1', { weight: 77.5, reps: 8, rir: 2 });
    expect(completeWorkoutSet).not.toHaveBeenCalled();
  });
  it('accepts zero weight/RIR and optional RIR, while explaining blank required values', async () => {
    render(
      <SetLogger
        sets={[{ ...set, weight: null, reps: null, rir: null }]}
        previous={[]}
        refresh={vi.fn()}
        onCompleted={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use 0 kg for bodyweight');
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Set 1 reps'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete set' }));
    await waitFor(() =>
      expect(completeWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 0, reps: 100, rir: null }),
    );
  });
  it('retries failed edits without implicitly completing a set', async () => {
    vi.mocked(updateWorkoutSet).mockRejectedValueOnce(new Error('Storage unavailable'));
    render(<SetLogger sets={[set]} previous={[]} refresh={vi.fn()} onCompleted={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '62.5' } });
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() =>
      expect(updateWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 62.5, reps: 8, rir: 2 }),
    );
    expect(completeWorkoutSet).not.toHaveBeenCalled();
  });
  it('persists decimal edits immediately and adjusts the same current draft', async () => {
    render(
      <SetLogger
        sets={[set, { ...set, id: 'set-2', setNumber: 2 }]}
        previous={[]}
        refresh={vi.fn()}
        onCompleted={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '62.5' } });
    await waitFor(() =>
      expect(updateWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 62.5, reps: 8, rir: 2 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Set 1 weight plus 2.5' }));
    expect(screen.getByLabelText('Set 1 weight')).toHaveValue('65');
    expect(screen.getByLabelText('Set 2 weight')).toHaveValue('60');
    await waitFor(() =>
      expect(updateWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 65, reps: 8, rir: 2 }),
    );
  });
  it('copies real history without completing and blocks a double completion', async () => {
    const refresh = vi.fn();
    const completed = vi.fn();
    render(
      <SetLogger
        sets={[set]}
        previous={[{ ...set, weight: 100, completed: true }]}
        refresh={refresh}
        onCompleted={completed}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy Previous Set' }));
    await waitFor(() =>
      expect(updateWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 100, reps: 8, rir: 2 }),
    );
    expect(completeWorkoutSet).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Complete set' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(completeWorkoutSet).toHaveBeenCalledOnce();
    expect(completeWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 100, reps: 8, rir: 2 });
  });
  it('advances from completed sets and removes completion action at the end', () => {
    const props = { previous: [], refresh: vi.fn(), onCompleted: vi.fn() };
    const { rerender } = render(
      <SetLogger
        {...props}
        sets={[
          { ...set, completed: true },
          { ...set, id: 'set-2', setNumber: 2 },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Set 2 reps plus 1' })).toBeEnabled();
    rerender(<SetLogger {...props} sets={[{ ...set, completed: true }]} />);
    expect(screen.queryByRole('button', { name: 'Complete set' })).not.toBeInTheDocument();
  });
  it('renders a timestamp-derived countdown and delegates rest actions', () => {
    const add = vi.fn();
    const skip = vi.fn();
    render(<RestTimer remaining={85} duration={180} nextSet={3} onAdd={add} onEnd={skip} />);
    expect(screen.getByText('1:25')).toBeInTheDocument();
    expect(screen.getByText('Up next: Set 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+30 sec' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(add).toHaveBeenCalledOnce();
    expect(skip).toHaveBeenCalledOnce();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    await waitFor(() => expect(updateWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 62.5 }));
    fireEvent.click(screen.getByRole('button', { name: 'Set 1 weight plus 2.5' }));
    expect(screen.getByLabelText('Set 1 weight')).toHaveValue('65');
    expect(screen.getByLabelText('Set 2 weight')).toHaveValue('60');
    await waitFor(() => expect(updateWorkoutSet).toHaveBeenCalledWith('set-1', { weight: 65 }));
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
    expect(screen.getByText('01:25')).toBeInTheDocument();
    expect(screen.getByText('Next: Set 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add 30 Seconds' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip Rest Timer' }));
    expect(add).toHaveBeenCalledOnce();
    expect(skip).toHaveBeenCalledOnce();
  });
});

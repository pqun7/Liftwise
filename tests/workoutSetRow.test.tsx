import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutSet } from '../src/domain/entities';
import { WorkoutSetRow } from '../src/features/workout/WorkoutSetRow';
import {
  completeWorkoutSet,
  duplicateWorkoutSet,
  updateWorkoutSet,
} from '../src/features/workout/workoutService';

vi.mock('../src/features/workout/workoutService', () => ({
  updateWorkoutSet: vi.fn().mockResolvedValue(undefined),
  completeWorkoutSet: vi.fn().mockResolvedValue({ setId: 'set', expiresAt: Date.now() + 10_000 }),
  duplicateWorkoutSet: vi.fn().mockResolvedValue(undefined),
  deleteWorkoutSet: vi.fn().mockResolvedValue(undefined),
}));

describe('Workout set speed controls', () => {
  it('copies previous values, adjusts, duplicates a draft, and requires explicit completion', async () => {
    const set: WorkoutSet = {
      id: 'set',
      workoutExerciseId: 'exercise',
      setNumber: 1,
      setType: 'working',
      weight: null,
      reps: null,
      rir: null,
      completed: false,
      createdAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    };
    const previous = { ...set, weight: 100, reps: 8, rir: 2, completed: true };
    const completed = vi.fn();
    render(
      <WorkoutSetRow
        set={set}
        today={[set]}
        previous={[previous]}
        mutable
        refresh={async () => {}}
        completed={completed}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Copy Previous Set' }));
    await waitFor(() => expect(screen.getByLabelText('Set 1 weight')).toHaveValue('100'));
    expect(updateWorkoutSet).toHaveBeenLastCalledWith('set', { weight: 100, reps: 8, rir: 2 });
    expect(completeWorkoutSet).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Set 1 weight plus 2.5 kg' }));
    await waitFor(() => expect(screen.getByLabelText('Set 1 weight')).toHaveValue('102.5'));
    await user.click(screen.getByRole('button', { name: 'Set 1 reps plus one' }));
    await waitFor(() => expect(screen.getByLabelText('Set 1 reps')).toHaveValue('9'));
    await user.clear(screen.getByLabelText('Set 1 weight'));
    await user.type(screen.getByLabelText('Set 1 weight'), '105');
    await user.click(screen.getByRole('button', { name: 'Duplicate Set' }));
    await waitFor(() => expect(duplicateWorkoutSet).toHaveBeenCalledWith('set'));
    expect(updateWorkoutSet).toHaveBeenLastCalledWith('set', { weight: 105, reps: 9, rir: 2 });
    await user.click(screen.getByRole('button', { name: 'Complete set' }));
    await waitFor(() =>
      expect(completeWorkoutSet).toHaveBeenCalledWith('set', { weight: 105, reps: 9, rir: 2 }),
    );
    expect(completed).toHaveBeenCalledOnce();
  });
});

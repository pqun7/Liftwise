import { useContext, useState, useSyncExternalStore } from 'react';
import type { WorkoutSet } from '../../domain/entities';
import { updateWorkoutSet } from './workoutService';
import { WorkoutSaveContext } from './WorkoutSaveContext';
import { WorkoutSaveQueue } from './workoutSaveQueue';

export type SetField = 'weight' | 'reps' | 'rir';
export type SetDraft = Record<SetField, string>;
export const draftFor = (set: Pick<WorkoutSet, SetField>): SetDraft => ({
  weight: set.weight?.toString() ?? '',
  reps: set.reps?.toString() ?? '',
  rir: set.rir?.toString() ?? '',
});
export const numeric = (value: string) => (value.trim() === '' ? null : Number(value));
export function valuesFor(draft: SetDraft, completing = false) {
  const weight = numeric(draft.weight),
    reps = numeric(draft.reps),
    rir = numeric(draft.rir);
  if (weight !== null && (!Number.isFinite(weight) || weight < 0))
    throw new Error('Weight must be zero or more. Use 0 kg for bodyweight.');
  if (reps !== null && (!Number.isInteger(reps) || reps < 0))
    throw new Error('Reps must be a whole number, zero or more.');
  if (rir !== null && (!Number.isFinite(rir) || rir < 0 || rir > 10))
    throw new Error('RIR must be between 0 and 10, or left blank.');
  if (completing && (weight === null || reps === null))
    throw new Error('Enter weight and reps before completing. Use 0 kg for bodyweight.');
  return { weight, reps, rir };
}

/** Same immediate save behavior in focused and overview editors; clean fields follow storage. */
export function useWorkoutSetDrafts(sets: WorkoutSet[]) {
  const shared = useContext(WorkoutSaveContext);
  const [local] = useState(() => new WorkoutSaveQueue());
  const queue = shared ?? local;
  useSyncExternalStore(queue.subscribe, queue.snapshot);
  const [, redraw] = useState(0);
  const read = (set: WorkoutSet) => queue.drafts.get(set.id)?.value ?? draftFor(set);
  const save = (set: WorkoutSet, draft: SetDraft) => {
    queue.drafts.set(set.id, {
      value: draft,
      base: queue.drafts.get(set.id)?.base ?? set.updatedAt,
    });
    redraw((value) => value + 1);
    void queue
      .save(set.id, async () => {
        await updateWorkoutSet(set.id, valuesFor(draft));
        // Once committed, repository refreshes (including another tab) can become authoritative.
        // Keep this draft until props reflect the write to avoid a flash of stale loader values.
      })
      .catch(() => {});
  };
  // A loader refresh is authoritative only once the latest draft has committed and matches it.
  for (const set of sets) {
    const draft = queue.drafts.get(set.id);
    const persisted = draftFor(set);
    if (
      draft &&
      !queue.unsettled &&
      (set.updatedAt !== draft.base ||
        Object.keys(persisted).every(
          (key) => persisted[key as SetField] === draft.value[key as SetField],
        ))
    )
      queue.drafts.delete(set.id);
  }
  return {
    queue,
    read,
    save,
    saveError: shared ? null : queue.error,
    change: (set: WorkoutSet, field: SetField, value: string) =>
      save(set, { ...read(set), [field]: value }),
    values: (set: WorkoutSet, completing = false) => valuesFor(read(set), completing),
  };
}

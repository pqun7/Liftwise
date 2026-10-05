import { SaveQueue } from '../../lib/storage/SaveQueue';

/** Session drafts must commit before completion, management or route departure. */
export class WorkoutSaveQueue extends SaveQueue {
  readonly drafts = new Map<
    string,
    { value: Record<'weight' | 'reps' | 'rir', string>; base: string }
  >();
}

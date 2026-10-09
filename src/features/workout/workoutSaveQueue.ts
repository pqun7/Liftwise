import { SaveQueue } from '../../lib/storage/SaveQueue';

/** Session drafts must commit before completion, management or route departure. */
export class WorkoutSaveQueue extends SaveQueue {
  departureCommitted = false;
  notesDraft: string | undefined;
  readonly committedRevisions = new Map<string, string>();
  readonly conflictingRevisions = new Map<string, string>();
  override async retry() {
    for (const [id, revision] of this.conflictingRevisions)
      this.committedRevisions.set(id, revision);
    this.conflictingRevisions.clear();
    await super.retry();
  }
  readonly drafts = new Map<
    string,
    { value: Record<'weight' | 'reps' | 'rir', string>; base: string }
  >();
}

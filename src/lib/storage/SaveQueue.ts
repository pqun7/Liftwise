/** Serialized durable writes with latest-revision failure tracking and retry. */
export class SaveQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private failures = new Map<
    string,
    { action: () => Promise<unknown>; error: Error; version: number }
  >();
  private versions = new Map<string, number>();
  private listeners = new Set<() => void>();
  private revision = 0;
  pending = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.revision;
  get error() {
    return this.failures.values().next().value?.error.message ?? null;
  }
  get unsettled() {
    return this.pending > 0 || this.failures.size > 0;
  }

  private notify() {
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }
  private append<T>(action: () => Promise<T>): Promise<T> {
    this.pending += 1;
    this.notify();
    const result = this.tail.then(action);
    this.tail = result
      .catch(() => {})
      .finally(() => {
        this.pending -= 1;
        this.notify();
      });
    return result;
  }
  save(key: string, action: () => Promise<unknown>): Promise<unknown> {
    const version = (this.versions.get(key) ?? 0) + 1;
    this.versions.set(key, version);
    return this.append(async () => {
      try {
        const result = await action();
        if (this.versions.get(key) === version) this.failures.delete(key);
        return result;
      } catch (failure) {
        if (this.versions.get(key) === version) {
          this.failures.set(key, {
            action,
            version,
            error:
              failure instanceof Error
                ? failure
                : new Error('Could not save. Retry before leaving.'),
          });
        }
        throw failure;
      }
    });
  }
  perform<T>(action: () => Promise<T>): Promise<T> {
    return this.append(async () => {
      if (this.error) throw new Error(this.error);
      return action();
    });
  }
  async flush() {
    // New edits can be queued while an earlier database write is completing.
    let tail;
    do {
      tail = this.tail;
      await tail;
    } while (tail !== this.tail);
    if (this.error) throw new Error(this.error);
  }
  async retry() {
    await this.tail;
    const failed = [...this.failures.entries()];
    await Promise.allSettled(
      failed
        .filter(([key, { version }]) => this.versions.get(key) === version)
        .map(([key, { action }]) => this.save(key, action)),
    );
    await this.flush();
  }
}

import { describe, expect, it, vi } from 'vitest';
import { WorkoutSaveQueue } from '../src/features/workout/workoutSaveQueue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
describe('session save coordination', () => {
  it('waits for slow edits before completion or departure and preserves rapid edit order', async () => {
    const queue = new WorkoutSaveQueue();
    const slow = deferred();
    const saved: number[] = [];
    const first = queue.save('set', async () => {
      await slow.promise;
      saved.push(60);
    });
    const second = queue.save('set', () => {
      saved.push(62.5);
      return Promise.resolve();
    });
    const complete = vi.fn().mockResolvedValue(undefined);
    const completion = queue.perform(complete);
    const leave = queue.flush();
    expect(queue.unsettled).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    slow.resolve();
    await Promise.all([first, second, completion, leave]);
    expect(saved).toEqual([60, 62.5]);
    expect(complete).toHaveBeenCalledOnce();
    expect(queue.unsettled).toBe(false);
  });
  it('retains failed writes across other-set successes and blocks finish until retry succeeds', async () => {
    const queue = new WorkoutSaveQueue();
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error('Storage full'))
      .mockResolvedValue(undefined);
    await expect(queue.save('one', write)).rejects.toThrow('Storage full');
    await queue.save('two', () => Promise.resolve());
    const finish = vi.fn();
    await expect(queue.perform(finish)).rejects.toThrow('Storage full');
    await expect(queue.flush()).rejects.toThrow('Storage full');
    expect(finish).not.toHaveBeenCalled();
    await queue.retry();
    await queue.perform(finish);
    expect(write).toHaveBeenCalledTimes(2);
    expect(finish).toHaveBeenCalledOnce();
  });
  it('retries only the latest failed draft rather than older values', async () => {
    const queue = new WorkoutSaveQueue();
    const old = vi.fn().mockRejectedValue(new Error('Old'));
    const latest = vi.fn().mockRejectedValueOnce(new Error('Latest')).mockResolvedValue(undefined);
    await Promise.allSettled([queue.save('one', old), queue.save('one', latest)]);
    expect(queue.error).toBe('Latest');
    await queue.retry();
    expect(old).toHaveBeenCalledOnce();
    expect(latest).toHaveBeenCalledTimes(2);
    expect(queue.error).toBeNull();
  });
  it('flush also waits for writes added while it is already waiting', async () => {
    const queue = new WorkoutSaveQueue();
    const slow = deferred();
    const later = deferred();
    void queue.save('one', () => slow.promise);
    const flush = vi.fn();
    const leaving = queue.flush().then(flush);
    void queue.save('two', () => later.promise);
    slow.resolve();
    await Promise.resolve();
    expect(flush).not.toHaveBeenCalled();
    later.resolve();
    await leaving;
    expect(flush).toHaveBeenCalledOnce();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { manageScreenLock, type ScreenLock } from '../src/features/workout/wakeLock';
import { UpdatePrompt } from '../src/app/shell/UpdatePrompt';
import { KeepAwake } from '../src/features/workout/KeepAwake';
import { appSettingsRepository } from '../src/lib/storage/repositories/appSettingsRepository';
import { getRecoverySummary } from '../src/features/workout/workoutService';
import {
  getStorageStatus,
  requestStoragePersistence,
} from '../src/features/dataSafety/storageStatus';

const state = vi.hoisted(() => ({
  update: vi.fn().mockResolvedValue(undefined),
  onReload: undefined as (() => void) | undefined,
}));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: { onNeedReload: () => void }) => {
    state.onReload = options.onNeedReload;
    return {
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: state.update,
    };
  },
}));
vi.mock('../src/features/workout/workoutService', () => ({ getRecoverySummary: vi.fn() }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const lock = (): ScreenLock => ({
  release: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
});

describe('release safety', () => {
  it('releases screen lock on pause and leaving the active workout', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(appSettingsRepository, 'get').mockResolvedValue({
      key: 'keepScreenAwake',
      value: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const first = lock(),
      second = lock();
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    vi.stubGlobal('navigator', { wakeLock: { request } });
    const view = render(<KeepAwake active />);
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    view.rerender(<KeepAwake active={false} />);
    await waitFor(() => expect(first.release).toHaveBeenCalledOnce());
    view.rerender(<KeepAwake active />);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    view.unmount();
    expect(second.release).toHaveBeenCalledOnce();
  });
  it('handles unsupported and denied wake lock without throwing', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const report = vi.fn();
    const stop = manageScreenLock(undefined, document, report);
    expect(report).toHaveBeenCalledWith('unsupported');
    stop();
    const denied = manageScreenLock(() => Promise.reject(new Error('denied')), document, report);
    await waitFor(() => expect(report).toHaveBeenCalledWith('denied'));
    denied();
  });
  it('releases on hide, reacquires on visibility and releases on exit', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const first = lock(),
      second = lock();
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const report = vi.fn();
    const stop = manageScreenLock(request, document, report);
    await waitFor(() => expect(report).toHaveBeenCalledWith('held'));
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(first.release).toHaveBeenCalledOnce();
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    stop();
    expect(second.release).toHaveBeenCalledOnce();
  });
  it('releases a late acquisition after unmount instead of leaking it', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const sentinel = lock();
    let resolve!: (value: ScreenLock) => void;
    const request = () =>
      new Promise<ScreenLock>((done) => {
        resolve = done;
      });
    const report = vi.fn();
    const stop = manageScreenLock(request, document, report);
    stop();
    resolve(sentinel);
    await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce());
    expect(report).not.toHaveBeenCalledWith('held');
  });
  it('fails closed on storage status errors and rejects non-finite estimates', async () => {
    const storage = {
      estimate: () => Promise.resolve({ usage: NaN, quota: -1 }),
      persisted: () => Promise.reject(new Error('unavailable')),
      persist: () => Promise.reject(new Error('denied')),
    };
    expect(await getStorageStatus(storage)).toEqual({
      usage: null,
      quota: null,
      persistence: 'unavailable',
    });
    expect(await requestStoragePersistence(storage)).toBe('unavailable');
  });
  it('defers update during unfinished workouts, then permits explicit safe update', async () => {
    vi.mocked(getRecoverySummary).mockResolvedValue({
      id: 'active',
      name: 'Quick',
      startedAt: new Date().toISOString(),
      completedSets: 2,
      totalSets: 3,
      status: 'active',
    });
    render(<UpdatePrompt />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Update' }));
    await screen.findByText(/Update deferred/);
    expect(state.update).not.toHaveBeenCalled();
    vi.mocked(getRecoverySummary).mockResolvedValue(null);
    await user.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(state.update).toHaveBeenCalledWith(true));
  });
  it('does not update when workout safety cannot be read', async () => {
    vi.mocked(getRecoverySummary).mockRejectedValue(new Error('database unavailable'));
    render(<UpdatePrompt />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update' }));
    await screen.findByRole('alert');
    expect(state.update).not.toHaveBeenCalled();
  });
  it('guards service-worker controlling events including updates from another tab', async () => {
    vi.mocked(getRecoverySummary).mockResolvedValue({
      id: 'active',
      name: 'Quick',
      startedAt: new Date().toISOString(),
      completedSets: 2,
      totalSets: 3,
      status: 'paused',
    });
    render(<UpdatePrompt />);
    state.onReload?.();
    await screen.findByText(/Update deferred/);
    expect(state.update).not.toHaveBeenCalled();
  });
});

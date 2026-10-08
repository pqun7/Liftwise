import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from 'react';
import { useLocation } from 'react-router-dom';

/** Presentation state only. Workout drafts and results remain in IndexedDB. */
export class ScreenStateStore {
  private values = new Map<string, unknown>();
  private listeners = new Map<string, Set<() => void>>();

  read<T>(key: string, fallback: T): T {
    return this.values.has(key) ? (this.values.get(key) as T) : fallback;
  }

  write<T>(key: string, value: T) {
    this.values.delete(key);
    this.values.set(key, value);
    if (this.values.size > 100) this.values.delete(this.values.keys().next().value!);
    this.listeners.get(key)?.forEach((listener) => listener());
  }

  subscribe(key: string, listener: () => void) {
    const listeners = this.listeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(key);
    };
  }
}

export const ScreenStateContext = createContext<ScreenStateStore | null>(null);

/** Survives child routes and tab switches, scoped to the screen/entity, never to app data. */
export function useScreenState<T>(
  name: string,
  initial: T | (() => T),
): [T, (value: SetStateAction<T>) => void] {
  const { pathname } = useLocation();
  const key = `${pathname}:${name}`;
  const store = useContext(ScreenStateContext);
  const resolveInitial = () => (typeof initial === 'function' ? (initial as () => T)() : initial);
  const [local, setLocal] = useState(() => ({ key, value: resolveInitial() }));
  // React can reuse a screen for another entity or query. Seed that scope independently.
  let seed = local;
  if (local.key !== key) {
    seed = { key, value: resolveInitial() };
    setLocal(seed);
  }
  const fallback = seed.value;
  const subscribe = useCallback(
    (listener: () => void) => store?.subscribe(key, listener) ?? (() => {}),
    [key, store],
  );
  const snapshot = useCallback(
    () => (store ? store.read(key, fallback) : fallback),
    [key, store, fallback],
  );
  const value = useSyncExternalStore(subscribe, snapshot, snapshot);
  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      if (!store)
        return setLocal((previous) => ({
          key,
          value: typeof next === 'function' ? (next as (value: T) => T)(previous.value) : next,
        }));
      const previous = store.read(key, fallback);
      store.write(key, typeof next === 'function' ? (next as (value: T) => T)(previous) : next);
    },
    [key, store, fallback],
  );
  return [value, setValue];
}

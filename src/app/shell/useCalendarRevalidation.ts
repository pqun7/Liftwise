import { useEffect } from 'react';
import { useRevalidator } from 'react-router-dom';
import { localDateKey } from '../../domain/localCalendar';

// One shell listener refreshes local derived data on midnight and resume.
// Schedule the next actual local midnight; do not assume it is 24 hours away.
export function watchCalendar(revalidate: () => unknown) {
  let day = localDateKey(new Date());
  let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let offset = new Date().getTimezoneOffset();
  let timer: number;
  const schedule = () => {
    window.clearTimeout(timer);
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 50);
    timer = window.setTimeout(refresh, midnight.getTime() - now.getTime());
  };
  const refresh = () => {
    if (document.visibilityState === 'visible') {
      day = localDateKey(new Date());
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      offset = new Date().getTimezoneOffset();
      void revalidate();
    }
    schedule();
  };
  const focus = () => {
    if (
      localDateKey(new Date()) !== day ||
      timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone ||
      offset !== new Date().getTimezoneOffset()
    )
      refresh();
    else schedule();
  };
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', focus);
  schedule();
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('focus', focus);
  };
}

export function useCalendarRevalidation(enabled = true) {
  const { revalidate } = useRevalidator();
  useEffect(() => {
    if (enabled) return watchCalendar(revalidate);
  }, [enabled, revalidate]);
}

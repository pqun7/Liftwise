import { useEffect } from 'react';
import { useRevalidator } from 'react-router-dom';
import { localDateKey } from '../../domain/localCalendar';

// One shell listener refreshes local derived data on midnight and resume.
// Schedule the next actual local midnight; do not assume it is 24 hours away.
export function useCalendarRevalidation(enabled = true) {
  const { revalidate } = useRevalidator();
  useEffect(() => {
    if (!enabled) return;
    let day = localDateKey(new Date());
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
        void revalidate();
      }
      schedule();
    };
    const focus = () => {
      if (localDateKey(new Date()) !== day) refresh();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', focus);
    schedule();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', focus);
    };
  }, [enabled, revalidate]);
}

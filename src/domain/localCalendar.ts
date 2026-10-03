import type { DateRange } from './analytics';

// Local calendar dates, never UTC day slices or elapsed 24-hour increments.
export function localDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year!, month! - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function addLocalCalendarDays(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function weekStart(now: Date): Date {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

// Progress periods include whole local dates. Month ends clamp, rather than overflow.
export function localPeriodStart(range: DateRange, now: Date): string {
  if (range === 'ALL') return '0000-01-01';
  if (range === '7D') return addLocalCalendarDays(localDateKey(now), -6);
  const date = new Date(now);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() - { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range]);
  const end = new Date(date);
  end.setMonth(end.getMonth() + 1, 0);
  date.setDate(Math.min(day, end.getDate()));
  return localDateKey(date);
}

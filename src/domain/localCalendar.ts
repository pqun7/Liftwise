import type { DateRange } from './analytics';

// Persisted domain indexes are Monday-first. Only this module converts JavaScript weekdays.
export const Weekday = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
} as const;
export const weekdayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export function weekdayOf(date: Date): number {
  return [
    Weekday.SUNDAY,
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
    Weekday.SATURDAY,
  ][date.getDay()]!;
}

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
  monday.setDate(monday.getDate() - weekdayOf(now));
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

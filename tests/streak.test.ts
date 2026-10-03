import { describe, expect, it } from 'vitest';
import {
  calculateStreakStats,
  completionDate,
  scheduledTrainingWeekdays,
} from '../src/domain/streak';
import {
  addLocalCalendarDays,
  localDateKey,
  localPeriodStart,
  weekStart,
} from '../src/domain/localCalendar';

const now = new Date(2026, 9, 8, 18);
const session = (
  day: string,
  status: 'completed' | 'active' | 'paused' | 'discarded' = 'completed',
) => ({
  status,
  startedAt: new Date(`${day}T10:00:00`).toISOString(),
  endedAt: new Date(`${day}T11:00:00`).toISOString(),
});

describe('scheduled rest days', () => {
  const weekdays = [0, 2, 4]; // Monday / Wednesday / Friday.
  const scheduled = (days: string[], at = now, start = '2026-09-01', week = weekdays) =>
    calculateStreakStats(
      days.map((day) => session(day)),
      start,
      at,
      week,
    );

  it('excludes rest days from missed counts and bridges them without adding workout days', () => {
    const result = scheduled(['2026-10-05', '2026-10-07']);
    expect(result).toMatchObject({ currentStreak: 2, bestStreak: 2, missedDays: 0 });
    expect(result.week.map((day) => day.status)).toEqual([
      'completed',
      'rest',
      'completed',
      'rest',
      'future',
      'rest',
      'rest',
    ]);
    expect(result.week[3]?.isToday).toBe(true);
  });
  it('keeps a Friday streak alive over the weekend and through open Monday', () => {
    for (const day of [10, 11, 12]) {
      expect(scheduled(['2026-10-09'], new Date(2026, 9, day, 18))).toMatchObject({
        currentStreak: 1,
        bestStreak: 1,
        missedDays: 0,
      });
    }
    expect(scheduled(['2026-10-09'], new Date(2026, 9, 13, 0, 1))).toMatchObject({
      currentStreak: 0,
      bestStreak: 1,
      missedDays: 1,
    });
  });
  it('breaks on a missed scheduled training day, even when surrounded by rest', () => {
    const result = scheduled(['2026-10-05', '2026-10-09'], new Date(2026, 9, 9, 18));
    expect(result).toMatchObject({ currentStreak: 1, bestStreak: 1, missedDays: 1 });
    expect(result.week[2]?.status).toBe('missed');
    expect(result.week[1]?.status).toBe('rest');
    expect(result.week[3]?.status).toBe('rest');
  });
  it('gives real completions priority over rest and counts duplicate sessions once', () => {
    const result = scheduled(['2026-10-05', '2026-10-06', '2026-10-06', '2026-10-07']);
    expect(result).toMatchObject({ currentStreak: 3, bestStreak: 3, missedDays: 0 });
    expect(result.week[1]?.status).toBe('completed');
  });
  it('does not create history before tracking, including with no completions', () => {
    const empty = scheduled([]);
    expect(empty).toMatchObject({
      currentStreak: 0,
      bestStreak: 0,
      missedDays: 0,
      trackingStartDate: null,
    });
    expect(empty.week.slice(0, 3).every((day) => day.status === 'not-tracked')).toBe(true);
    expect(empty.week[3]).toMatchObject({ status: 'rest', isToday: true });
    const first = scheduled(['2026-10-08']);
    expect(first).toMatchObject({ currentStreak: 1, bestStreak: 1, missedDays: 0 });
    expect(first.week[3]?.status).toBe('completed');
  });
  it('does not infer rest for unknown, empty, invalid, or daily schedules', () => {
    const days = ['2026-10-05', '2026-10-07'];
    for (const week of [[], [-1, 7, NaN, 1.5], [0, 1, 2, 3, 4, 5, 6]]) {
      expect(scheduled(days, now, '2026-09-01', week)).toEqual(stats(days));
    }
  });
  it('handles a once-weekly plan and a missed week without manufacturing streak increments', () => {
    expect(scheduled(['2026-09-28', '2026-10-05'], now, '2026-09-01', [0])).toMatchObject({
      currentStreak: 2,
      bestStreak: 2,
      missedDays: 0,
    });
    expect(scheduled(['2026-09-21', '2026-10-05'], now, '2026-09-01', [0])).toMatchObject({
      currentStreak: 1,
      bestStreak: 1,
      missedDays: 1,
    });
  });
  it('keeps current and best global while missed training days change with the period', () => {
    const days = ['2026-09-28', '2026-10-05', '2026-10-07'];
    expect(scheduled(days, now)).toMatchObject({ currentStreak: 2, bestStreak: 2, missedDays: 2 });
    expect(scheduled(days, now, '2026-10-03')).toMatchObject({
      currentStreak: 2,
      bestStreak: 2,
      missedDays: 0,
    });
  });
  it.each([
    [2026, 2, 6],
    [2026, 9, 30],
  ])('bridges DST weekends (%s/%s/%s)', (year, month, day) => {
    const friday = localDateKey(new Date(year, month, day, 12));
    const monday = new Date(year, month, day + 3, 18);
    expect(
      scheduled([friday, localDateKey(monday)], monday, friday, [0, 1, 2, 3, 4]),
    ).toMatchObject({ currentStreak: 2, bestStreak: 2, missedDays: 0 });
  });
  it('selects only meaningful weekdays from a valid active program', () => {
    const graph = {
      program: { archived: false, draft: false },
      days: [
        { day: { weekday: 0 }, exercises: [{}] },
        { day: { weekday: 0 }, exercises: [{}] },
        { day: { weekday: 2 }, exercises: [] },
        { day: { weekday: null }, exercises: [{}] },
      ],
    };
    expect(scheduledTrainingWeekdays(graph)).toEqual([0]);
    expect(scheduledTrainingWeekdays({ ...graph, program: { archived: true } })).toBeNull();
    expect(
      scheduledTrainingWeekdays({ ...graph, program: { archived: false, draft: true } }),
    ).toBeNull();
    expect(scheduledTrainingWeekdays(undefined)).toBeNull();
    expect(
      scheduledTrainingWeekdays({ ...graph, days: [{ day: {}, exercises: [{}] }] }),
    ).toBeNull();
  });
});
const stats = (days: string[], start = '2026-09-01', at = now) =>
  calculateStreakStats(
    days.map((day) => session(day)),
    start,
    at,
  );

describe('calendar workout streaks', () => {
  it('keeps never-trained history neutral, today open, and future dates neutral', () => {
    const result = stats([]);
    expect(result).toMatchObject({
      currentStreak: 0,
      bestStreak: 0,
      missedDays: 0,
      trackingStartDate: null,
      hasEverTrained: false,
    });
    expect(result.week.map((day) => day.status)).toEqual([
      'not-tracked',
      'not-tracked',
      'not-tracked',
      'today',
      'future',
      'future',
      'future',
    ]);
  });
  it('starts tracking on the first completion today, with a completed today identity', () => {
    const result = stats(['2026-10-08']);
    expect(result).toMatchObject({
      currentStreak: 1,
      bestStreak: 1,
      missedDays: 0,
      trackingStartDate: '2026-10-08',
    });
    expect(result.week[3]).toEqual({ date: '2026-10-08', status: 'completed', isToday: true });
    expect(result.week.slice(0, 3).every((day) => day.status === 'not-tracked')).toBe(true);
  });
  it('anchors at yesterday while today is still open, then increments on completion', () => {
    expect(stats(['2026-10-06', '2026-10-07']).currentStreak).toBe(2);
    expect(stats(['2026-10-06', '2026-10-07', '2026-10-08']).currentStreak).toBe(3);
  });
  it('breaks only after an ended missed day and restarts at one', () => {
    expect(stats(['2026-10-05'])).toMatchObject({ currentStreak: 0, bestStreak: 1, missedDays: 2 });
    expect(stats(['2026-10-05', '2026-10-08'])).toMatchObject({
      currentStreak: 1,
      bestStreak: 1,
      missedDays: 2,
    });
    expect(stats(['2026-10-07'], '2026-09-01', new Date(2026, 9, 9, 0, 1))).toMatchObject({
      currentStreak: 0,
      missedDays: 1,
    });
  });
  it('finds the longest global run across gaps regardless of input order or duplicate sessions', () => {
    const days = [
      '2026-10-03',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-02',
      '2026-10-03',
    ];
    expect(stats(days, '2026-10-02', new Date(2026, 9, 4, 18))).toMatchObject({
      currentStreak: 2,
      bestStreak: 3,
      missedDays: 0,
    });
  });
  it('changes only missed days with the selected period and reconstructs from serialized history', () => {
    const history = ['2026-09-20', '2026-09-21', '2026-10-07'].map((day) => session(day));
    const recent = calculateStreakStats(history, localPeriodStart('7D', now), now);
    const long = calculateStreakStats(
      JSON.parse(JSON.stringify(history)) as typeof history,
      localPeriodStart('1M', now),
      now,
    );
    expect(recent).toMatchObject({ currentStreak: 1, bestStreak: 2, missedDays: 5 });
    expect(long).toMatchObject({ currentStreak: 1, bestStreak: 2, missedDays: 15 });
    expect(recent.week).toEqual(long.week);
  });
  it('counts canonical completed status only, ignoring invalid timestamps and future completions', () => {
    const invalid = { ...session('2026-10-08'), endedAt: 'invalid' };
    const reversed = { ...session('2026-10-08'), endedAt: session('2026-10-07').endedAt };
    const sessions = ['active', 'paused', 'discarded'].map((status) =>
      session('2026-10-07', status as 'active'),
    );
    expect(
      calculateStreakStats(
        [...sessions, invalid, reversed, session('2026-10-09')],
        '2026-09-01',
        now,
      ).hasEverTrained,
    ).toBe(false);
    expect(completionDate({ ...session('2026-10-07'), endedAt: null }, now)).toBe('2026-10-07');
  });
  it('uses completion rather than start date for workouts spanning local midnight', () => {
    const startedAt = new Date(2026, 9, 7, 23, 45).toISOString();
    const endedAt = new Date(2026, 9, 8, 0, 15).toISOString();
    expect(completionDate({ status: 'completed', startedAt, endedAt }, now)).toBe('2026-10-08');
    expect(localDateKey(new Date(startedAt))).toBe('2026-10-07');
  });
  it('crosses month, leap-day, and year boundaries by calendar adjacency', () => {
    expect(addLocalCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addLocalCalendarDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(
      stats(['2025-12-30', '2025-12-31', '2026-01-01'], '2025-12-01', new Date(2026, 0, 1, 18)),
    ).toMatchObject({ currentStreak: 3, bestStreak: 3 });
    expect(localDateKey(weekStart(new Date(2026, 0, 1)))).toBe('2025-12-29');
  });
  it('clamps local month ends and includes exactly seven dates for 7D', () => {
    expect(localPeriodStart('1M', new Date(2026, 2, 31))).toBe('2026-02-28');
    expect(localPeriodStart('1Y', new Date(2024, 1, 29))).toBe('2023-02-28');
    expect(localPeriodStart('7D', now)).toBe('2026-10-02');
  });
  it.each([
    [2026, 2, 7],
    [2026, 9, 31],
  ])('keeps local dates consecutive across DST transitions (%s/%s/%s)', (year, month, day) => {
    const first = new Date(year, month, day, 12);
    const second = new Date(year, month, day + 1, 12);
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York') {
      expect((second.getTime() - first.getTime()) / 3600000).toBe(month === 2 ? 23 : 25);
      expect(localDateKey(new Date('2026-10-08T03:30:00Z'))).toBe('2026-10-07');
    }
    const third = new Date(year, month, day + 2, 18);
    expect(
      calculateStreakStats(
        [session(localDateKey(first)), session(localDateKey(second))],
        localDateKey(first),
        third,
      ),
    ).toMatchObject({ currentStreak: 2, bestStreak: 2, missedDays: 0 });
  });
});

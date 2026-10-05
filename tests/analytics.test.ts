import { describe, expect, it } from 'vitest';
import { localDateKey } from '../src/domain/localCalendar';
import {
  detectPrs,
  estimated1RM,
  exercisePoints,
  exerciseSummary,
  rangeStart,
  setMetrics,
  weeklySummary,
  type AnalyticsWorkout,
} from '../src/domain/analytics';
import type { WorkoutSet } from '../src/domain/entities';
import {
  calendarDays,
  comparison,
  periodSummary,
  trainingDays,
  weekdayActivity,
} from '../src/features/progress/overviewAnalytics';

const stamp = '2026-10-01T10:00:00.000Z';
function set(values: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set',
    workoutExerciseId: 'entry',
    setNumber: 1,
    setType: 'working',
    weight: 100,
    reps: 8,
    rir: 2,
    completed: true,
    createdAt: stamp,
    updatedAt: stamp,
    ...values,
  };
}
function graph(
  id: string,
  sets: WorkoutSet[],
  values: Partial<AnalyticsWorkout['session']> = {},
): AnalyticsWorkout {
  return {
    session: {
      id,
      programId: null,
      programDayId: null,
      name: 'Snapshot workout',
      status: 'completed',
      startedAt: stamp,
      endedAt: '2026-10-01T11:00:00.000Z',
      pausedAt: null,
      pausedDurationSeconds: 60,
      currentExerciseId: null,
      restStartedAt: null,
      restEndsAt: null,
      notes: null,
      createdAt: stamp,
      updatedAt: stamp,
      ...values,
    },
    exercises: [
      {
        exercise: {
          id: 'entry',
          workoutSessionId: id,
          exerciseId: 'repdb:bench',
          exerciseName: 'Snapshot Bench',
          programExerciseId: null,
          order: 1,
          plannedTargetSets: 3,
          plannedMinReps: 8,
          plannedMaxReps: 8,
          plannedRirMin: 1,
          plannedRirMax: 2,
          plannedRestSeconds: 180,
          plannedNotes: null,
          notes: null,
          createdAt: stamp,
          updatedAt: stamp,
        },
        sets,
      },
    ],
  };
}
describe('deterministic analytics', () => {
  it('uses Epley, actual singles, and explicit applicability limits', () => {
    expect(estimated1RM(set())).toBeCloseTo(126.6667);
    expect(estimated1RM(set({ reps: 1 }))).toBe(100);
    for (const input of [
      { weight: 0 },
      { weight: NaN },
      { weight: null },
      { reps: 0 },
      { reps: 11 },
      { reps: 1.5 },
      { rir: 4 },
      { rir: NaN },
      { completed: false },
      { setType: 'warmup' as const },
      { setType: 'drop' as const },
    ])
      expect(estimated1RM(set(input))).toBeNull();
    expect(estimated1RM(set({ rir: null, setType: 'failure' }))).toBeCloseTo(126.6667);
  });
  it('excludes warmups/drafts; includes failure/drop; averages known RIR only', () => {
    const result = setMetrics([
      set(),
      set({ setType: 'warmup', weight: 999 }),
      set({ completed: false }),
      set({ setType: 'drop', weight: 50, reps: 10, rir: null }),
      set({ setType: 'failure', weight: 80, reps: 5, rir: 0 }),
    ]);
    expect(result).toMatchObject({
      weight: 100,
      reps: 10,
      volume: 1700,
      totalReps: 23,
      workingSets: 3,
      averageRir: 1,
    });
    expect(setMetrics([])).toMatchObject({
      weight: null,
      e1rm: null,
      averageRir: null,
      volume: 0,
      workingSets: 0,
    });
    expect(setMetrics([set({ weight: 0, rir: null })])).toMatchObject({
      volume: 0,
      totalReps: 8,
      averageRir: null,
    });
  });
  it('detects weight, reps at identical weight, e1RM and both volume PRs without ties/first awards', () => {
    const first = graph('a', [set()]);
    const second = graph('b', [set({ reps: 10 })]);
    const third = graph('c', [set({ weight: 102.5, reps: 10 })]);
    expect(detectPrs([first])).toEqual([]);
    const events = detectPrs([third, first, second]);
    expect(events.filter((event) => event.sessionId === 'b').map((event) => event.type)).toEqual([
      'Estimated 1RM PR',
      'Set Volume PR',
      'Exercise-session Volume PR',
      'Rep PR',
    ]);
    expect(events.find((event) => event.type === 'Rep PR')).toMatchObject({
      value: 10,
      previous: 8,
      weight: 100,
    });
    expect(events.some((event) => event.type === 'Weight PR')).toBe(true);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(detectPrs([first, graph('b', [set()])])).toEqual([]);
    expect(
      detectPrs([first, graph('b', [set({ weight: 100.1, reps: 8 })])]).some(
        (event) => event.type === 'Weight PR',
      ),
    ).toBe(false);
  });
  it('recomputes after corrections and excludes unfinished/discarded workouts', () => {
    const first = graph('a', [set()]);
    const second = graph('b', [set({ weight: 105 })]);
    expect(detectPrs([first, second]).length).toBeGreaterThan(0);
    expect(
      detectPrs([
        first,
        { ...second, exercises: [{ ...second.exercises[0]!, sets: [set({ weight: 90 })] }] },
      ]),
    ).toEqual([]);
    expect(
      exercisePoints(
        [
          first,
          graph('b', [set({ weight: 999 })], { status: 'active' }),
          graph('c', [set()], { status: 'discarded' }),
        ],
        'repdb:bench',
      ),
    ).toHaveLength(1);
  });
  it('aggregates repeated exercise entries within one session and derives lifetime stats', () => {
    const first = graph('a', [set()]);
    first.exercises.push({
      ...first.exercises[0]!,
      exercise: { ...first.exercises[0]!.exercise, id: 'other' },
      sets: [set({ id: 'other-set', weight: 80 })],
    });
    expect(exercisePoints([first], 'repdb:bench')[0]).toMatchObject({
      workingSets: 2,
      volume: 1440,
    });
    expect(exerciseSummary([first], 'repdb:bench')).toMatchObject({
      sessions: 1,
      lifetimeWorkingSets: 2,
      bestWeight: 100,
      bestSet: { weight: 100 },
    });
    expect(exerciseSummary([], 'missing')).toMatchObject({
      sessions: 0,
      last: null,
      bestSet: null,
    });
  });
  it('handles calendar ranges and week boundaries with timestamp-derived duration', () => {
    const now = new Date(2026, 2, 31, 12);
    expect(localDateKey(new Date(rangeStart('1M', now)))).toBe('2026-02-28');
    expect(localDateKey(new Date(rangeStart('3M', now)))).toBe('2025-12-31');
    expect(localDateKey(new Date(rangeStart('6M', now)))).toBe('2025-09-30');
    expect(localDateKey(new Date(rangeStart('1Y', now)))).toBe('2025-03-31');
    expect(rangeStart('ALL', now)).toMatch(/^0000/);
    const summary = weeklySummary(
      [
        graph('a', [set()]),
        graph('b', [set()], {
          startedAt: '2026-09-20T10:00:00.000Z',
          endedAt: '2026-09-20T11:00:00.000Z',
        }),
        graph('c', [set()], { status: 'active' }),
      ],
      new Date('2026-10-02T12:00:00.000Z'),
    );
    expect(summary).toEqual({ workouts: 1, workingSets: 1, volume: 800, durationSeconds: 3540 });
  });
});

describe('progress overview derivation', () => {
  it('excludes active sessions, warmups and incomplete sets from period totals', () => {
    const complete = graph('done', [
      set(),
      set({ id: 'warmup', setType: 'warmup' }),
      set({ id: 'unfinished', completed: false }),
    ]);
    const active = graph('active', [set()], { status: 'active' });
    const summary = periodSummary([complete, active]);
    expect(summary).toEqual({ workouts: 1, duration: 3540, sets: 1, volume: 800 });
    expect(comparison(2, 0)).toBeNull();
    expect(comparison(4, 3)).toBe('↑ 33%');
    expect(comparison(2, 4)).toBe('↓ 50%');
  });
  it('counts distinct actual training days and weekday sessions without assuming a schedule', () => {
    const workouts = [
      graph('one', [set()]),
      graph('two', [set()]),
      graph('active', [set()], { status: 'active' }),
    ];
    expect(trainingDays(workouts)).toBe(1);
    const activity = weekdayActivity(workouts);
    expect(activity.reduce((sum, n) => sum + n, 0)).toBe(2);
    expect(activity[(new Date(stamp).getDay() + 6) % 7]).toBe(2);
  });
  it('uses the same rolling seven-day boundary for all progress calculations', () => {
    expect(calendarDays('2026-09-26T12:34:56.000Z', '2026-10-03T12:34:56.000Z')).toBe(8);
    const now = new Date(2026, 9, 3, 12);
    const start = rangeStart('7D', now);
    expect(localDateKey(new Date(start))).toBe('2026-09-27');
    expect(new Date(start).getHours()).toBe(0);
    expect(calendarDays(start, now.toISOString())).toBe(7);
  });
});

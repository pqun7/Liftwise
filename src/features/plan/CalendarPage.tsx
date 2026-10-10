import { Link, useLoaderData, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import { BuilderHeader } from './BuilderChrome';
import { ScheduleView } from './ScheduleView';
import { planCalendar, scheduleLabels } from './scheduleData';
import type { ProgramListData } from './programService';
import {
  addLocalCalendarDays,
  dateFromKey,
  isLocalDateKey,
  localDateKey,
  weekdayOf,
  weekdayNames,
} from '../../domain/localCalendar';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Card } from '../../components/ui/Card';
import type { StreakStats } from '../../domain/streak';
import { monthlyCompletion } from './scheduleData';
import { StreakDayIcon, type StreakVisualStatus } from '../progress/StreakDayIcon';

export function CalendarPage() {
  const data = useLoaderData<ProgramListData & { streak?: StreakStats | null }>();
  const { calendar, graph } = planCalendar(data);
  const [params] = useSearchParams();
  const month = isLocalDateKey(`${params.get('month') ?? ''}-01`)
    ? params.get('month')!
    : calendar.today.slice(0, 7);
  const first = dateFromKey(`${month}-01`);
  const monthly = monthlyCompletion(calendar.today.slice(0, 7), calendar, graph);
  const start = addLocalCalendarDays(localDateKey(first), -weekdayOf(first));
  const gridDates = Array.from({ length: 42 }, (_, index) => addLocalCalendarDays(start, index));
  const dayStates = gridDates.map((date) => calendar.getDayState(date));
  const connectedForward = new Map<number, number>();
  dayStates.forEach((state, index) => {
    if (state.status !== 'completed') return;
    const rowEnd = Math.min(Math.floor(index / 7) * 7 + 7, dayStates.length);
    for (let next = index + 1; next < rowEnd; next++) {
      const nextState = dayStates[next]!;
      if (nextState.status === 'completed') {
        connectedForward.set(index, next - index);
        break;
      }
      if (nextState.status !== 'rest') break;
    }
  });
  const move = (offset: number) => {
    const date = new Date(first);
    date.setMonth(date.getMonth() + offset);
    return `/plan/calendar?month=${localDateKey(date).slice(0, 7)}`;
  };
  return (
    <section className="grid gap-4 font-ui">
      <BuilderHeader title="Calendar" back="/plan" backLabel="Back to Schedule" />
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-section-title">
          {first.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <Link
            aria-label="Previous month"
            className={buttonClasses('secondary', '', 'icon')}
            to={move(-1)}
          >
            <ChevronLeft size={20} />
          </Link>
          <Link
            aria-label="Next month"
            className={buttonClasses('secondary', '', 'icon')}
            to={move(1)}
          >
            <ChevronRight size={20} />
          </Link>
        </div>
      </div>
      <Card
        className="flex min-h-[88px] items-center justify-between gap-3 rounded-2xl border-border bg-surface-2 px-4 py-3 sm:px-5"
        aria-label="Monthly workout streak summary"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <Flame size={25} fill="currentColor" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-1.5 leading-tight">
              <strong className="text-2xl tabular-nums text-primary">
                {data.streak?.currentStreak ?? '—'}
              </strong>
              <span className="text-sm font-semibold text-secondary">days streak</span>
            </p>
            <span className="text-xs text-secondary">Current streak</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <strong className="text-xl tabular-nums text-primary">{monthly.percentage}%</strong>
          <p className="text-xs text-secondary">this month</p>
        </div>
      </Card>
      <div className="grid grid-cols-7 gap-0.5" aria-label="Monthly schedule">
        {weekdayNames.map((name) => (
          <span key={name} className="py-2 text-center type-caption text-secondary">
            {name.slice(0, 3)}
          </span>
        ))}
        <div className="calendar-month-days">
          {gridDates.map((date, index) => {
            const state = dayStates[index]!;
            const isToday = date === calendar.today;
            const status = state.status as StreakVisualStatus;
            const iconStatus = status === 'future' ? 'scheduled' : status;
            return (
              <Link
                key={date}
                to={`/plan/calendar/day/${date}?month=${month}`}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${dateFromKey(date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}, ${scheduleLabels[state.status]}${isToday ? ', today' : ''}`}
                className={`calendar-month-day streak-day streak-day-${status}${connectedForward.has(index) ? ` streak-day-connected streak-day-connected-${connectedForward.get(index)} calendar-month-streak-connected` : ''}${isToday ? ' streak-day-current calendar-month-day-current' : ''}${date.slice(0, 7) !== month ? ' calendar-month-day-outside' : ''}`}
              >
                <span className="calendar-month-day-number">{dateFromKey(date).getDate()}</span>
                <span className="streak-day-circle">
                  <StreakDayIcon status={iconStatus} />
                </span>
                {isToday ? (
                  <span className="calendar-month-current-star" aria-hidden="true">
                    <Star size={10} fill="currentColor" />
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
      <div
        className="flex flex-wrap gap-x-4 gap-y-2 type-caption text-secondary"
        aria-label="Calendar legend"
      >
        {(['scheduled', 'active', 'completed', 'rest', 'missed', 'empty'] as const).map((state) => (
          <span key={state} className={`calendar-legend-status streak-day-${state}`}>
            <span className="streak-day-circle calendar-legend-circle">
              <StreakDayIcon status={state} />
            </span>
            {scheduleLabels[state]}
          </span>
        ))}
      </div>
      {!calendar.dated ? (
        <p className="type-body-small text-secondary">
          No dated schedule yet.{' '}
          <Link to="/plan/schedule" className="text-mint">
            Set Schedule
          </Link>{' '}
          to display your training days here.
        </p>
      ) : null}
    </section>
  );
}

export function CalendarDayPage() {
  const { date } = useParams();
  const [params] = useSearchParams();
  const valid = date && isLocalDateKey(date);
  return (
    <section className="grid gap-4 font-ui">
      <BuilderHeader
        title={
          valid
            ? dateFromKey(date).toLocaleDateString('en', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
            : 'Day details'
        }
        back={`/plan/calendar?month=${params.get('month') ?? date?.slice(0, 7) ?? ''}`}
        backLabel="Back to Calendar"
      />
      {valid ? (
        <ScheduleView date={date} showWeek={false} />
      ) : (
        <p role="alert">Invalid calendar date.</p>
      )}
    </section>
  );
}

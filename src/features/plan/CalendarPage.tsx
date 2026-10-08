import { CalendarDayMarker, type CalendarDayStatus } from '../../components/ui/CalendarDayButton';
import { Link, useLoaderData, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export function CalendarPage() {
  const data = useLoaderData<ProgramListData>();
  const { calendar } = planCalendar(data);
  const [params] = useSearchParams();
  const month = isLocalDateKey(`${params.get('month') ?? ''}-01`)
    ? params.get('month')!
    : calendar.today.slice(0, 7);
  const first = dateFromKey(`${month}-01`);
  const start = addLocalCalendarDays(localDateKey(first), -weekdayOf(first));
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
      <div className="grid grid-cols-7 gap-0.5" aria-label="Monthly schedule">
        {weekdayNames.map((name) => (
          <span key={name} className="py-2 text-center type-caption text-secondary">
            {name.slice(0, 3)}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, index) => {
          const date = addLocalCalendarDays(start, index);
          const state = calendar.getDayState(date);
          return (
            <Link
              key={date}
              to={`/plan/calendar/day/${date}?month=${month}`}
              aria-current={date === calendar.today ? 'date' : undefined}
              aria-label={`${dateFromKey(date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}, ${scheduleLabels[state.status]}`}
              className={`calendar-day-link ${date === calendar.today ? 'border-mint bg-mint/10 text-mint' : 'border-border text-primary'} ${date.slice(0, 7) !== month ? 'opacity-70' : ''}`}
            >
              <span className="type-body-small">{dateFromKey(date).getDate()}</span>
              <CalendarDayMarker status={state.status} />
            </Link>
          );
        })}
      </div>
      <div
        className="flex flex-wrap gap-x-4 gap-y-2 type-caption text-secondary"
        aria-label="Calendar legend"
      >
        {(
          ['scheduled', 'active', 'completed', 'rest', 'missed', 'empty'] as CalendarDayStatus[]
        ).map((state) => (
          <span key={state} className="inline-flex items-center gap-2">
            <CalendarDayMarker status={state} />
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

import { WeekSelector } from '../../components/home/WeekSelector';
import recoveryArtwork from '../../assets/images/plan/recovery-bed.webp';
import { Link, useLoaderData, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, Dumbbell, Moon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { buttonClasses } from '../../components/ui/controlStyles';
import { planCalendar, scheduleLabels } from './scheduleData';
import { dateFromKey, isLocalDateKey } from '../../domain/localCalendar';
import type { ProgramListData } from './programService';
import { estimatedProgramMinutes } from './programDisplay';

export function ScheduleEmpty({
  title,
  description,
  to,
  action,
}: {
  title: string;
  description: string;
  to: string;
  action: string;
}) {
  return (
    <Card variant="glass" padding="spacious" radius="hero" className="grid gap-4 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-mint/10 text-mint">
        <CalendarDays size={28} aria-hidden="true" />
      </span>
      <h2 className="type-section-title text-[21px] leading-tight">{title}</h2>
      <p className="mx-auto max-w-[265px] text-[15px] leading-relaxed text-secondary">
        {description}
      </p>
      <Link className={buttonClasses('primary')} to={to}>
        {action}
        <ArrowRight size={19} />
      </Link>
    </Card>
  );
}

export function ScheduleView({
  date,
  showWeek = true,
  overview = false,
}: {
  date?: string;
  showWeek?: boolean;
  overview?: boolean;
}) {
  const data = useLoaderData<ProgramListData>();
  const { graph, calendar } = planCalendar(data);
  const [params, setParams] = useSearchParams();
  const requested = date ?? params.get('date');
  const selected = requested && isLocalDateKey(requested) ? requested : calendar.today;
  const day = calendar.getDayState(selected);
  const entry = day.entry;
  const minutes = entry ? estimatedProgramMinutes(entry.exercises) : null;
  const session = day.session;
  const title =
    day.status === 'active' || day.status === 'completed'
      ? (session?.name ?? 'Workout')
      : day.status === 'rest'
        ? 'Recovery Day'
        : (entry?.day.name ?? scheduleLabels[day.status]);
  return (
    <div className={`grid ${overview ? 'gap-3' : 'gap-4'}`}>
      {day.status === 'no-program' ? (
        <ScheduleEmpty
          title="No program yet"
          description="Create a program to build your training schedule."
          to={data.programs.length ? '/plan?tab=program' : '/plan/new'}
          action={data.programs.length ? 'Choose Program' : 'Create Program'}
        />
      ) : day.status === 'unscheduled' ? (
        <ScheduleEmpty
          title="Program ready"
          description="Set a schedule to see workouts on your calendar. Your program cycle stays in Program."
          to="/plan/schedule"
          action="Set Schedule"
        />
      ) : (
        <Card
          variant="glass"
          padding="spacious"
          radius="hero"
          className={`grid gap-2 ${overview ? 'plan-today-card' : ''}`}
        >
          {overview && day.status === 'rest' ? (
            <img
              className="plan-recovery-art"
              src={recoveryArtwork}
              width={384}
              height={384}
              decoding="async"
              alt=""
            />
          ) : null}
          <p className={`flex items-center gap-2 type-label uppercase schedule-copy-${day.status}`}>
            {day.status === 'rest' ? (
              <Moon size={20} />
            ) : day.status === 'completed' ? (
              <CheckCircle2 size={20} />
            ) : day.status === 'missed' ? (
              <CircleAlert size={20} />
            ) : (
              <Dumbbell size={20} />
            )}
            {selected === calendar.today ? 'Today · ' : ''}
            {scheduleLabels[day.status]}
          </p>
          <h2 className="type-page-title wrap-anywhere">{title}</h2>
          <p className="text-secondary">
            {day.status === 'active'
              ? data.sessionProgress
                ? `${data.sessionProgress.completedSets} / ${data.sessionProgress.totalSets} sets · ${session?.status === 'paused' ? 'Paused' : 'In progress'}`
                : 'Your session is saved. Continue in Workout.'
              : day.status === 'rest'
                ? 'No workout scheduled. Focus on recovery and come back stronger.'
                : day.status === 'completed'
                  ? 'Your workout is complete and saved on this device.'
                  : day.status === 'empty'
                    ? 'Add exercises to this training day in Program.'
                    : `${entry?.exercises.length ?? 0} exercises${minutes == null ? '' : ` · ~${minutes} min`}${day.status === 'missed' ? ' · No completed session on this date.' : ''}`}
          </p>
          {day.status === 'rest' ? null : (
            <Link
              className={buttonClasses('primary', 'w-full')}
              to={
                day.status === 'active' || day.status === 'completed'
                  ? `/workout/${session!.id}`
                  : day.status === 'empty'
                    ? `/plan/${graph!.program.id}/days/${entry!.day.id}/exercises`
                    : `/workout?day=${entry!.day.id}`
              }
            >
              {day.status === 'active'
                ? 'Continue in Workout'
                : day.status === 'completed'
                  ? 'View Summary'
                  : day.status === 'empty'
                    ? 'Add exercises'
                    : 'View in Workout'}
              <ArrowRight size={19} />
            </Link>
          )}
        </Card>
      )}
      {showWeek ? (
        <Card variant="glass" className="grid gap-3 plan-week-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 type-card-title">
              <CalendarDays size={20} aria-hidden="true" />
              Weekly Schedule
            </h2>
            <Link
              to="/plan/schedule"
              className="flex min-h-11 items-center gap-1 type-caption text-secondary no-underline"
            >
              This week <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <WeekSelector
            calendar={calendar}
            selected={selected}
            variant="detailed"
            onSelect={(key) => {
              const next = new URLSearchParams(params);
              if (key === calendar.today) next.delete('date');
              else next.set('date', key);
              void setParams(next);
            }}
          />
        </Card>
      ) : null}
      {calendar.next ? (
        <Card variant="glass" className="grid gap-2">
          <h2 className="flex items-center gap-2 type-card-title">
            <span className="grid size-8 place-items-center rounded-full bg-mint/10 text-mint">
              <Dumbbell size={20} aria-hidden="true" />
            </span>
            {calendar.dated ? 'Next workout' : 'Next in program'}
          </h2>
          <Link
            className="flex min-h-11 items-center justify-between gap-3 text-primary no-underline"
            to={`/workout?day=${calendar.next.entry.day.id}`}
          >
            <span>
              <strong className="type-card-title">{calendar.next.entry.day.name}</strong>
              <small className="mt-1 block type-body-small text-secondary">
                {calendar.next.date
                  ? dateFromKey(calendar.next.date).toLocaleDateString('en', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Flexible cycle · no date assigned'}
              </small>
            </span>
            <ArrowRight size={19} />
          </Link>
        </Card>
      ) : null}
      {!overview && graph && calendar.dated ? (
        <Link className={buttonClasses('secondary')} to="/plan/schedule">
          <CalendarDays size={19} />
          Schedule settings
        </Link>
      ) : null}
    </div>
  );
}

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  Clock3,
  Dumbbell,
  Info,
  Layers3,
  Pencil,
  ChevronRight,
} from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter } from './BuilderChrome';
import { programBuilder, weekdays } from './builderService';
import { estimatedProgramMinutes } from './programDisplay';
import { programTemplates } from './programTemplates';
import { buttonClasses } from '../../components/ui/controlStyles';

export function ProgramReviewPage() {
  const { graph, activeProgramId } = useLoaderData<{
    graph: ProgramGraph;
    activeProgramId: string | null;
  }>();
  const { program, days } = graph;
  const first = days[0]?.day;
  const base = `/plan/${program.id}`;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [activate, setActivate] = useState(
    params.has('activate')
      ? params.get('activate') === 'true'
      : activeProgramId === program.id || !activeProgramId,
  );
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const cycle = program.scheduleType === 'cycle';
  const workouts = days.filter(({ day }) => day.kind !== 'recovery');
  const recoveryCount = cycle ? days.length - workouts.length : 7 - workouts.length;
  const estimates = workouts.map(({ exercises }) => estimatedProgramMinutes(exercises));
  const total =
    estimates.length && estimates.every((value) => value != null)
      ? estimates.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  const template = programTemplates.find(({ split }) => split === program.splitTemplate);
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await programBuilder.finish(program.id, activate);
      await navigate('/plan', { replace: true });
    } catch (failure) {
      pending.current = false;
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save. Your draft is still available.',
      );
    } finally {
      setBusy(false);
    }
  };
  const edit = (path: string, label: string) => (
    <Link
      className={buttonClasses('secondary')}
      aria-label={label}
      to={`${path}?return=review&activate=${activate}`}
    >
      <Pencil size={16} />
      Edit
    </Link>
  );
  const overview = cycle
    ? days
    : weekdays.map((_, weekday) => days.find(({ day }) => day.weekday === weekday) ?? null);
  return (
    <section className="builder-page review-page">
      <BuilderHeader
        title={program.draft ? 'Create Program' : 'Edit Program'}
        step={4}
        programId={program.id}
        back={first ? `${base}/days/${days.at(-1)!.day.id}` : `${base}/build/days`}
      />
      <div className="review-intro">
        <h2>Review &amp; {program.draft ? 'create' : 'save'}</h2>
        <p className="text-secondary">
          Check your program before {program.draft ? 'creating' : 'saving'} it.
        </p>
      </div>
      <Card className="review-details">
        <div className="plan-section-heading">
          <h2>Program details</h2>
          {edit(`${base}/edit`, 'Edit program details')}
        </div>
        <div className="review-program-name">
          <span className="template-icon">
            <Layers3 size={30} />
          </span>
          <div>
            <h3>{program.name}</h3>
            <span className="review-chip">{cycle ? 'Flexible Cycle' : 'Weekly Schedule'}</span>
          </div>
        </div>
        {program.description ? <p>{program.description}</p> : null}
        <div className="review-goals">
          <div>
            <Dumbbell />
            <span>
              <strong className="capitalize">{program.goal ?? 'General'}</strong>
              <small>Goal</small>
            </span>
          </div>
          <div>
            <Layers3 />
            <span>
              <strong className="capitalize">{program.level ?? 'Intermediate'}</strong>
              <small>Experience</small>
            </span>
          </div>
        </div>
        <div className="review-template">
          <span>Template: {template?.name ?? 'Custom'}</span>
          {edit(`${base}/build/template`, 'Edit template')}
        </div>
        <div className="review-stats">
          <div>
            <CalendarDays />
            <strong>{cycle ? days.length : 7} days</strong>
            <small>{cycle ? 'Cycle length' : 'Weekly schedule'}</small>
          </div>
          <div>
            <Dumbbell />
            <strong>{workouts.length} workouts</strong>
            <small>Total workouts</small>
          </div>
          <div>
            <BedDouble />
            <strong>{recoveryCount} recovery days</strong>
            <small>Included rest days</small>
          </div>
        </div>
        {total != null ? (
          <p className="review-time">
            <Clock3 size={20} />~{total} min training time per {cycle ? 'cycle' : 'week'}
          </p>
        ) : (
          <p className="text-secondary">
            Training time appears after exercise targets are configured.
          </p>
        )}
      </Card>
      <Card className="review-overview">
        <div className="plan-section-heading">
          <h2>{cycle ? 'Cycle' : 'Weekly'} overview</h2>
          {edit(`${base}/build/days`, 'Edit schedule')}
        </div>
        {overview.map((entry, index) => {
          const rest = !entry || entry.day.kind === 'recovery';
          const minutes = entry ? estimatedProgramMinutes(entry.exercises) : null;
          const content = (
            <>
              <span className="day-number">{cycle ? index + 1 : weekdays[index]?.slice(0, 3)}</span>
              <span className={`day-icon day-color-${index % 6}`}>
                {rest ? <BedDouble /> : <Dumbbell />}
              </span>
              <span className="day-copy">
                <strong>{rest ? (entry?.day.name ?? 'Recovery') : entry.day.name}</strong>
                <small>
                  {rest
                    ? 'Rest day'
                    : `${entry.exercises.length} exercises${minutes == null ? '' : ` · ~${minutes} min`}`}
                </small>
              </span>
              {entry ? <ChevronRight size={18} /> : null}
            </>
          );
          return entry ? (
            <Link
              key={entry.day.id}
              aria-label={rest ? `View ${entry.day.name} day` : `Edit ${entry.day.name} exercises`}
              className={`review-day ${rest ? 'is-recovery' : ''}`}
              to={`${base}/days/${entry.day.id}?return=review&activate=${activate}`}
            >
              {content}
            </Link>
          ) : (
            <div key={index} className="review-day is-recovery">
              {content}
            </div>
          );
        })}
        {days
          .filter(({ day }) => !cycle && day.weekday == null)
          .map(({ day, exercises }) => (
            <Link key={day.id} className="review-day" to={`${base}/days/${day.id}`}>
              <span className="day-copy">
                <strong>{day.name}</strong>
                <small>Unscheduled · {exercises.length} exercises</small>
              </span>
              <ChevronRight />
            </Link>
          ))}
      </Card>
      <Card className="review-after">
        <h2>
          <Info size={20} />
          After {program.draft ? 'creating' : 'saving'}
        </h2>
        <label>
          <input
            type="radio"
            name="activate"
            checked={activate}
            onChange={() => setActivate(true)}
          />
          <span>
            <strong>{program.draft ? 'Create' : 'Save'} and set as active</strong>
            <small>
              {activeProgramId && activeProgramId !== program.id
                ? 'This will replace your current active program.'
                : 'Use this as your active training plan.'}
            </small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="activate"
            checked={!activate}
            onChange={() => setActivate(false)}
          />
          <span>
            <strong>
              {program.draft ? 'Save as another program' : 'Keep current active selection'}
            </strong>
            <small>Your current active program won’t change.</small>
          </span>
        </label>
      </Card>
      <p className="builder-info">
        <Info size={20} />
        {first ? `Your plan starts with Day 1 · ${first.name}. ` : ''}Saving does not start a
        workout. Recovery days stay in your schedule. Any workout already in progress keeps its
        recorded exercises and targets.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <BuilderFooter>
        <Button
          variant="primary"
          className="w-full"
          disabled={busy || !workouts.length}
          onClick={() => void save()}
        >
          {busy
            ? 'Saving…'
            : program.draft
              ? activate
                ? 'Create & Activate Program'
                : 'Create Program'
              : 'Save Program'}
        </Button>
        <p className="review-reassurance">
          Saved on this device{activate ? ' and set as active' : ''}.
        </p>
      </BuilderFooter>
    </section>
  );
}

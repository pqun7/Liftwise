import { useEffect, useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import { CalendarDays, Clock3, Dumbbell, Pencil, Play } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { buttonClasses } from '../../components/ui/controlStyles';
import { startPlannedWorkout } from '../workout/workoutService';
import { weekdays } from './builderService';
import { estimatedProgramMinutes, nextProgramWorkout } from './programDisplay';
import { WeeklySchedule } from './WeeklySchedule';
import type { ProgramListData } from './programService';

export function PlanPage() {
  const { programs, graphs, activeProgramId, completed = [] } = useLoaderData<ProgramListData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      setNow(new Date());
      void revalidator.revalidate();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [revalidator]);
  const active = graphs.find(
    ({ program }) => program.id === activeProgramId && !program.draft && !program.archived,
  );
  const next = active ? nextProgramWorkout(active, completed, now) : null;
  const minutes = next ? estimatedProgramMinutes(next.exercises) : null;
  const total = active?.days.reduce((sum, entry) => sum + entry.exercises.length, 0) ?? 0;
  const estimates = active?.days.map(({ exercises }) => estimatedProgramMinutes(exercises)) ?? [];
  return (
    <section className="plan-experience grid gap-5" aria-labelledby="plan-title">
      <header>
        <p className="plan-eyebrow">Programs</p>
        <h1 id="plan-title" className="type-page-title mt-1">
          My Training Plan
        </h1>
      </header>
      {active ? (
        <>
          <Card className="plan-active-card grid gap-4">
            <div className="flex justify-between items-center">
              <span className="plan-active-badge">● Active</span>
              <Link
                className="plan-overflow"
                aria-label="Program settings"
                to={`/plan/${active.program.id}?tab=settings`}
              >
                •••
              </Link>
            </div>
            <div>
              <h2 className="text-xl font-bold">{active.program.name}</h2>
              <p className="text-sm text-secondary mt-1">
                {active.days.length} training days · {total} exercises
              </p>
            </div>
            {next ? (
              <div className="plan-next">
                <p className="flex items-center gap-2 text-xs text-secondary">
                  <CalendarDays size={14} />
                  Next workout
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="plan-detail-icon text-mint">
                    <CalendarDays size={22} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{next.day.name}</h3>
                    <p className="text-xs text-secondary mt-1">
                      {next.day.weekday == null ? 'Unscheduled' : weekdays[next.day.weekday]} ·{' '}
                      {next.exercises.length} exercises{minutes == null ? '' : ` · ~${minutes} min`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-secondary">
                {active.days.length
                  ? 'Add exercises to a training day to start your next workout.'
                  : 'Build your weekly schedule. Add your first training day.'}
              </p>
            )}
            {error ? (
              <p role="alert" className="text-sm text-secondary">
                {error}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Button
                variant="primary"
                className="w-full min-h-14"
                disabled={busy || !next}
                onClick={() => {
                  if (!next || pending.current) return;
                  pending.current = true;
                  setBusy(true);
                  setError(null);
                  void startPlannedWorkout(next.day.id)
                    .then((id) => navigate(`/workout/${id}`))
                    .catch((failure: unknown) => {
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : 'Could not start workout. Try again.',
                      );
                    })
                    .finally(() => {
                      pending.current = false;
                      setBusy(false);
                    });
                }}
              >
                <Play size={16} fill="currentColor" />
                {busy ? 'Starting…' : 'Start Workout'}
              </Button>
              <Link
                className={buttonClasses('outline', '!text-primary !border-border')}
                to={`/plan/${active.program.id}`}
              >
                <Pencil size={16} />
                Edit Program
              </Link>
            </div>
          </Card>
          <WeeklySchedule graph={active} />
          <Card className="grid gap-4">
            <h2 className="font-bold">Program Details</h2>
            <div className="plan-detail-row">
              <span className="plan-detail-icon">
                <Dumbbell size={21} />
              </span>
              <div>
                <p>Muscle split</p>
                <strong className="capitalize">
                  {active.program.splitTemplate?.replaceAll('-', ' ') ?? 'Custom'}
                </strong>
              </div>
            </div>
            <div className="plan-detail-row">
              <span className="plan-detail-icon">
                <Clock3 size={21} />
              </span>
              <div>
                <p>Estimated time</p>
                <strong>
                  {estimates.length && estimates.every((value) => value != null)
                    ? `~${estimates.reduce<number>((sum, value) => sum + (value ?? 0), 0)} min / week`
                    : 'Set targets for an estimate'}
                </strong>
              </div>
            </div>
            <div className="plan-detail-row">
              <span className="plan-detail-icon">
                <CalendarDays size={21} />
              </span>
              <div>
                <p>Last updated</p>
                <strong>
                  {new Date(active.program.updatedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="grid gap-3">
          <h2 className="text-lg font-bold">Build your training week</h2>
          <p className="text-sm text-secondary">
            {programs.length
              ? 'Choose a program and set it active to see your next workout.'
              : 'Create your first plan. Your programs stay on this device.'}
          </p>
          <Link className={buttonClasses('primary')} to="/plan/new">
            Create program
          </Link>
        </Card>
      )}
      {programs
        .filter(({ id }) => id !== active?.program.id)
        .map((program) => (
          <Card as="article" key={program.id}>
            <h2 className="font-bold">
              {program.name}
              {program.draft ? ' · Draft' : ''}
            </h2>
            <p className="text-xs text-secondary mt-1">
              {program.description ?? 'Training program'}
            </p>
            <Link
              className="flex min-h-11 items-center text-sm text-secondary"
              aria-label={`Open ${program.name}`}
              to={`/plan/${program.id}`}
            >
              {program.draft ? 'Continue building' : 'Open program'} →
            </Link>
          </Card>
        ))}
      {active ? (
        <Link className={buttonClasses('secondary')} to="/plan/new">
          Create another program
        </Link>
      ) : null}
    </section>
  );
}

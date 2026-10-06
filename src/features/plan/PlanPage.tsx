import { useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Eye,
  FileText,
  Pencil,
  Play,
  Plus,
  SlidersHorizontal,
  Smartphone,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Button } from '../../components/ui/Button';
import { startPlannedWorkout } from '../workout/workoutService';
import { setActiveProgram, type ProgramListData } from './programService';
import { trainingCalendar } from '../../domain/trainingCalendar';
import { EmptyDumbbell, WeekPreview } from './PlanPrimitives';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { ProgramOptionsSheet } from './ProgramOptionsSheet';

export function PlanPage() {
  const {
    programs,
    graphs,
    activeProgramId,
    completed = [],
    now,
    unfinished,
  } = useLoaderData<ProgramListData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ProgramGraph | null>(null);
  const active = graphs.find(
    ({ program }) => program.id === activeProgramId && !program.draft && !program.archived,
  );
  const calendar = trainingCalendar(active, completed, new Date(now));
  const startable = calendar.startableToday ?? calendar.next?.entry;
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await revalidator.revalidate();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save. Try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const summary = (graph: ProgramGraph) => {
    const workouts = graph.days.filter(({ day }) => day.kind !== 'recovery').length;
    const exercises = graph.days.reduce((sum, entry) => sum + entry.exercises.length, 0);
    return `${workouts} training ${workouts === 1 ? 'day' : 'days'} · ${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}`;
  };
  const other = programs.filter(({ id }) => id !== active?.program.id);
  return (
    <section className="plan-experience plan-landing" aria-labelledby="plan-title">
      <header>
        <p className="plan-eyebrow">PROGRAMS</p>
        <h1 id="plan-title">My Training Plan</h1>
      </header>
      {error && <p role="alert">{error}</p>}
      {active ? (
        <Card className="plan-active-card">
          <div className="plan-card-heading">
            <span className="plan-active-badge">● Active</span>
            <button
              className="plan-overflow"
              aria-label="Program settings"
              onClick={() => setOptions(active)}
            >
              •••
            </button>
          </div>
          <h2>{active.program.name}</h2>
          <p className="plan-summary">{summary(active)}</p>
          <div className="plan-structure">
            <p>
              <CalendarDays size={20} />
              {active.program.scheduleType === 'cycle' ? 'Cycle Structure' : 'Weekly Structure'}
            </p>
            <WeekPreview graph={active} />
          </div>
          <Link
            className={buttonClasses('primary', 'w-full')}
            to={`/plan/${active.program.id}/edit`}
          >
            <Pencil size={21} />
            Edit program
          </Link>
          <Link
            className={buttonClasses('outline', 'w-full')}
            to={`/plan/${active.program.id}?tab=preview`}
          >
            <Eye size={22} />
            View program details
          </Link>
          <details className="plan-start-disclosure" open={Boolean(unfinished)}>
            <summary>Workout actions</summary>
            {calendar.next && (
              <div className="plan-next">
                <p>Next scheduled workout</p>
                <h3>{calendar.next.entry.day.name}</h3>
              </div>
            )}
            <Button
              disabled={busy || (!startable && !unfinished)}
              onClick={() =>
                void run(async () => {
                  if (unfinished) await navigate(`/workout/${unfinished.id}`);
                  else if (startable)
                    await navigate(`/workout/${await startPlannedWorkout(startable.day.id)}`);
                })
              }
            >
              <Play size={16} />
              {unfinished ? `Resume ${unfinished.name ?? 'Workout'}` : 'Start next workout'}
            </Button>
          </details>
        </Card>
      ) : (
        <Card className="plan-empty">
          <div className="plan-empty-art">
            <span>+</span>
            <EmptyDumbbell />
            <span>+</span>
          </div>
          <h2>{programs.length ? 'Choose your training program' : 'Build your training week'}</h2>
          <p>
            {programs.length
              ? 'Choose a program and set it active to see your next workout.'
              : 'Create your first plan with guided templates. Fully editable and saved on this device.'}
          </p>
          <Link className={buttonClasses('primary', 'w-full')} to="/plan/new">
            Create program
            <ArrowRight size={20} />
          </Link>
          <div className="plan-features">
            <div>
              <FileText size={22} />
              <span>Templates</span>
            </div>
            <div>
              <SlidersHorizontal size={22} />
              <span>Fully editable</span>
            </div>
            <div>
              <Smartphone size={22} />
              <span>
                Stored on
                <br />
                this device
              </span>
            </div>
          </div>
        </Card>
      )}
      {other.length > 0 && <h2 className="other-programs-title">Other Programs</h2>}
      {other.map((program) => {
        const graph = graphs.find((item) => item.program.id === program.id);
        return (
          <Card as="article" key={program.id} className="plan-other-card">
            <div className="plan-other-heading">
              <span className="program-card-icon">
                <Dumbbell size={30} />
              </span>
              <div>
                <h2>
                  {program.name}
                  {program.draft ? ' · Draft' : ''}
                </h2>
                <p className="plan-summary">{graph ? summary(graph) : program.description}</p>
              </div>
              <button
                className="plan-overflow"
                aria-label={`Options for ${program.name}`}
                disabled={!graph}
                onClick={() => graph && setOptions(graph)}
              >
                •••
              </button>
            </div>
            {graph && <WeekPreview graph={graph} />}
            {program.draft || program.archived ? (
              <Link
                className={buttonClasses('outline', 'w-full')}
                to={program.draft ? `/plan/${program.id}/edit` : `/plan/${program.id}`}
              >
                {program.draft ? 'Continue building' : 'Open program'}
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Button
                className="w-full"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => setActiveProgram(program.id))}
              >
                <Play size={20} fill="currentColor" />
                Set as active
              </Button>
            )}
          </Card>
        );
      })}
      {active && (
        <Link className={buttonClasses('outline', 'w-full')} to="/plan/new">
          <Plus size={23} />
          Create another program
        </Link>
      )}
      {options && (
        <ProgramOptionsSheet
          graph={options}
          activeProgramId={activeProgramId}
          close={() => setOptions(null)}
          changed={() => revalidator.revalidate()}
        />
      )}
    </section>
  );
}

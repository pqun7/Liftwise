import { Button } from '../../components/ui/Button';
import { useRef, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Dumbbell,
  Bed,
  Info,
  Pencil,
  ChartNoAxesColumnIncreasing,
} from 'lucide-react';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter } from './BuilderChrome';
import { programBuilder } from './builderService';
import { estimatedProgramMinutes } from './programDisplay';
import { ProgramIcon, DayOverview } from './PlanPrimitives';

export function ProgramReviewPage() {
  const { graph, activeProgramId } = useLoaderData<{
    graph: ProgramGraph;
    activeProgramId: string | null;
  }>();
  const first = graph.days[0]?.day;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [activate, setActivate] = useState(
    activeProgramId === graph.program.id || !activeProgramId,
  );
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const cycle = graph.program.scheduleType === 'cycle';
  const workouts = graph.days.filter(({ day }) => day.kind !== 'recovery');
  const recovery = cycle ? graph.days.length - workouts.length : 7 - workouts.length;
  const estimates = workouts.map(({ exercises }) => estimatedProgramMinutes(exercises));
  const total =
    estimates.length && estimates.every((value) => value != null)
      ? estimates.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await programBuilder.finish(graph.program.id, activate);
      await navigate('/plan', { replace: true });
    } catch (failure) {
      pending.current = false;
      setError(
        failure instanceof Error
          ? failure.message
          : 'The program could not be finalized. Your saved draft is still available.',
      );
    } finally {
      setBusy(false);
    }
  };
  const base = `/plan/${graph.program.id}`;
  const back = first ? `${base}/days/${first.id}` : `${base}/build/days`;
  return (
    <section className="builder-page review-page">
      <BuilderHeader
        title={graph.program.draft ? 'Review Program' : 'Edit Program'}
        step={4}
        programId={graph.program.id}
        back={back}
        exercisesPath={back}
      />
      <div className="review-heading">
        <h2>Review &amp; {graph.program.draft ? 'create' : 'save'}</h2>
        <p>Check your program before {graph.program.draft ? 'creating' : 'saving'} it.</p>
      </div>
      <section className="builder-card review-details">
        <header>
          <h2>Program details</h2>
          <Link to={`${base}/edit`}>
            <Pencil size={19} />
            Edit
          </Link>
        </header>
        <div className="review-program-name">
          <ProgramIcon />
          <div>
            <h3>{graph.program.name}</h3>
            <span>{cycle ? 'Flexible Cycle' : 'Weekly Schedule'}</span>
          </div>
        </div>
        {graph.program.description && <p>{graph.program.description}</p>}
        <div className="review-preferences">
          <div>
            <Dumbbell size={26} />
            <span>
              <strong>{graph.program.goal ?? 'General'}</strong>
              <small>Goal</small>
            </span>
          </div>
          <div>
            <ChartNoAxesColumnIncreasing size={26} />
            <span>
              <strong>{graph.program.level ?? 'Intermediate'}</strong>
              <small>Experience</small>
            </span>
          </div>
        </div>
        <div className="review-stats">
          <div>
            <CalendarDays size={24} />
            <span>
              <strong>{cycle ? graph.days.length : 7} days</strong>
              <small>{cycle ? 'Cycle length' : 'Weekly schedule'}</small>
            </span>
          </div>
          <div>
            <Dumbbell size={24} />
            <span>
              <strong>{workouts.length} workouts</strong>
              <small>Total workouts</small>
            </span>
          </div>
          <div>
            <Bed size={24} />
            <span>
              <strong>{recovery} recovery days</strong>
              <small>Included rest days</small>
            </span>
          </div>
        </div>
        <div className="review-time">
          <Clock3 size={25} />
          <span>
            <strong>
              {total == null
                ? 'Set targets for a time estimate'
                : `~${Math.floor(total / 60)}h ${total % 60}m training time`}
            </strong>
            <small>Total estimated time per {cycle ? 'cycle' : 'week'}</small>
          </span>
        </div>
      </section>
      <section className="builder-card review-overview">
        <header>
          <h2>{cycle ? 'Cycle overview' : 'Weekly overview'}</h2>
          <Link to={`${base}/build/days`}>
            <Pencil size={19} />
            Edit
          </Link>
        </header>
        <DayOverview graph={graph} />
      </section>
      <section className="builder-card after-creating">
        <h2>
          <Info size={23} />
          After {graph.program.draft ? 'creating' : 'saving'}
        </h2>
        <label>
          <input
            type="radio"
            name="activation"
            checked={activate}
            onChange={() => setActivate(true)}
          />
          <span>
            <strong>{graph.program.draft ? 'Create' : 'Save'} and set as active</strong>
            <small>
              This will{' '}
              {activeProgramId
                ? 'replace your current active program'
                : 'become your active program'}
              .
            </small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="activation"
            checked={!activate}
            onChange={() => setActivate(false)}
          />
          <span>
            <strong>
              {graph.program.draft
                ? 'Save as another program'
                : 'Save without changing active program'}
            </strong>
            <small>Your current active program won’t change.</small>
          </span>
        </label>
      </section>
      <p className="builder-info">
        <Info size={26} />
        <span>
          {first
            ? `You’ll start with Day 1 · ${first.name}.`
            : 'Add a workout day before creating.'}
          <br />
          Recovery days remain part of your {cycle ? 'cycle' : 'schedule'}.
        </span>
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <BuilderFooter>
        <Button
          variant="primary"
          className="w-full"
          disabled={busy || !workouts.length}
          onClick={() => void save()}
        >
          {busy
            ? 'Saving…'
            : graph.program.draft
              ? activate
                ? 'Create & Start Program'
                : 'Create Program'
              : 'Save Program'}
        </Button>
        <p className="review-reassurance">
          Your {cycle ? `${graph.days.length}-day cycle` : 'weekly plan'} will be saved
          {activate ? ' and set as active' : ' on this device'}.
        </p>
      </BuilderFooter>
    </section>
  );
}

import { IconButton } from '../../components/ui/IconButton';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Card } from '../../components/ui/Card';
import { useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';
import {
  Plus,
  GripVertical,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  FileText,
  Pencil,
  ChevronLeft,
  Bed,
  ArrowLeft,
} from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { ExerciseImage } from '../exercises/ExerciseImage';
import {
  deletePrescription,
  getProgram,
  movePrescription,
  type HydratedProgramDay,
} from './programService';
import { estimatedProgramMinutes } from './programDisplay';
import { builderPrescription } from './prescriptionFormat';
import { DayIcon, DayMetadata } from './PlanPrimitives';
import { DaySheet } from './DaySheet';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';

export function ProgramDayPage() {
  const { day: data, graph } = useLoaderData<{ day: HydratedProgramDay; graph: ProgramGraph }>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [options, setOptions] = useState(false);
  const dayIndex = graph.days.findIndex(({ day }) => day.id === data.day.id);
  const previous = graph.days[dayIndex - 1];
  const next = graph.days[dayIndex + 1];
  const recovery = data.day.kind === 'recovery';
  const minutes = estimatedProgramMinutes(data.exercises.map(({ prescription }) => prescription));
  const base = `/plan/${data.program.id}`;
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await revalidator.revalidate();
    } catch {
      setError('The change could not be saved. Your existing program is unchanged. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="builder-page" aria-label={`${data.day.name} exercise management`}>
      <BuilderHeader
        title={data.program.draft ? 'Create Program' : 'Edit Program'}
        step={3}
        programId={data.program.id}
        back={`${base}/build/days`}
        exercisesPath={`${base}/days/${data.day.id}`}
      />
      <nav className="builder-day-navigation" aria-label="Program days">
        <Link
          aria-label="Previous day"
          to={previous ? `${base}/days/${previous.day.id}` : `${base}/build/days`}
        >
          <ChevronLeft size={25} />
        </Link>
        <span>
          Day {dayIndex + 1} of {graph.days.length}
        </span>
        <Link
          aria-label={next ? 'Next day' : 'Review program'}
          to={next ? `${base}/days/${next.day.id}` : `${base}/build/review`}
        >
          <ChevronRight size={25} />
        </Link>
      </nav>
      {recovery ? (
        <section className="recovery-content">
          <h2>
            <DayIcon name="Recovery" recovery />
            Recovery Day
          </h2>
          <div className="recovery-art">
            <span>z</span>
            <Bed size={94} />
          </div>
          <h3>Take the day off</h3>
          <p>
            Rest and recover as part of your training cycle. This helps you build strength, prevent
            injury, and perform better in the days ahead.
          </p>
          {next && (
            <div className="recovery-up-next">
              <p className="builder-eyebrow">Up next</p>
              <div>
                <DayIcon name={next.day.name} recovery={next.day.kind === 'recovery'} />
                <span>
                  <strong>
                    Day {dayIndex + 2} · {next.day.name}
                  </strong>
                  <DayMetadata entry={next} />
                </span>
                <Link to={`${base}/days/${next.day.id}`}>
                  View Day {dayIndex + 2}
                  <ChevronRight size={17} />
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="workout-day-heading">
            <h2>
              {data.day.name}
              <button aria-label="Rename workout" onClick={() => setOptions(true)}>
                <Pencil size={21} />
              </button>
            </h2>
            <p>
              {data.exercises.length} exercises{minutes == null ? '' : ` · ~${minutes} min`}
            </p>
          </div>
          {error ? (
            <p role="alert" className="form-error">
              {error}
            </p>
          ) : null}
          <div className="builder-exercises">
            {data.exercises.map(({ prescription, exercise }, index) => (
              <Card as="article" key={prescription.id} padding="none" className="builder-exercise">
                <div className="builder-exercise-row">
                  <IconButton
                    className="rounded-xl"
                    type="button"
                    aria-label={`Reorder ${exercise.name}`}
                    aria-expanded={expanded === prescription.id}
                    onClick={() =>
                      setExpanded((current) =>
                        current === prescription.id ? null : prescription.id,
                      )
                    }
                  >
                    <GripVertical size={19} aria-hidden="true" />
                  </IconButton>
                  <Link
                    className="builder-exercise-main"
                    to={`${base}/days/${data.day.id}/exercises/${prescription.id}/edit`}
                  >
                    <ExerciseImage
                      key={exercise.id}
                      image={exercise.images.start ?? exercise.images.main ?? null}
                      className="builder-exercise-image"
                    />
                    <div>
                      <h2>{exercise.name}</h2>
                      <p>{builderPrescription(prescription)}</p>
                    </div>
                    <ChevronRight size={19} aria-hidden="true" />
                  </Link>
                </div>
                {expanded === prescription.id ? (
                  <div className="builder-row-actions" aria-label={`${exercise.name} actions`}>
                    <Button
                      type="button"
                      disabled={busy || index === 0}
                      aria-label={`Move ${exercise.name} up`}
                      onClick={() =>
                        void run(() => movePrescription(data.day.id, prescription.id, -1))
                      }
                    >
                      <ArrowUp size={17} aria-hidden="true" />
                      Up
                    </Button>
                    <Button
                      type="button"
                      disabled={busy || index === data.exercises.length - 1}
                      aria-label={`Move ${exercise.name} down`}
                      onClick={() =>
                        void run(() => movePrescription(data.day.id, prescription.id, 1))
                      }
                    >
                      <ArrowDown size={17} aria-hidden="true" />
                      Down
                    </Button>
                    <Button
                      type="button"
                      className="danger-text"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Remove ${exercise.name} from this day?`))
                          void run(() => deletePrescription(prescription.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
          {!data.exercises.length ? <p className="builder-empty">No exercises added yet.</p> : null}
          <Link className="builder-add" to={`${base}/days/${data.day.id}/exercises`}>
            <Plus size={21} aria-hidden="true" />
            Add exercise
          </Link>
          <Link className="day-note-link" to={`${base}/days/${data.day.id}/edit`}>
            <FileText size={23} />
            <span>{data.day.notes ?? 'Add day note'}</span>
            <ChevronRight size={20} />
          </Link>
        </>
      )}
      {options && (
        <DaySheet
          graph={graph}
          initialView="rename"
          dayId={data.day.id}
          close={() => setOptions(false)}
          changed={async () => {
            const updated = await getProgram(data.program.id);
            if (!updated?.days.some(({ day }) => day.id === data.day.id))
              await navigate(`${base}/build/days`);
            else await revalidator.revalidate();
          }}
        />
      )}
      <BuilderFooter>
        <div className="builder-day-footer">
          <Link to={previous ? `${base}/days/${previous.day.id}` : `${base}/build/days`}>
            <ArrowLeft size={20} />
            Previous
          </Link>
          <Link
            className={buttonClasses('primary')}
            to={next ? `${base}/days/${next.day.id}` : `${base}/build/review`}
          >
            <NextLabel>{next ? `Next: Day ${dayIndex + 2}` : 'Next: Review'}</NextLabel>
          </Link>
        </div>
      </BuilderFooter>
    </section>
  );
}

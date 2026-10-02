import { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router-dom';
import {
  Plus,
  GripVertical,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { deletePrescription, movePrescription, type HydratedProgramDay } from './programService';
import { formatPrescription, formatRest } from './prescriptionFormat';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';

export function ProgramDayPage() {
  const { day: data, graph } = useLoaderData<{ day: HydratedProgramDay; graph: ProgramGraph }>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
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
        title="Add Exercises"
        step={2}
        programId={data.program.id}
        back={`${base}/build/days`}
        exercisesPath={`${base}/days/${data.day.id}`}
      />
      <Link className="builder-program-link" to={base}>
        {data.program.name}
      </Link>
      <nav className="builder-tabs" aria-label="Program days">
        {graph.days.map(({ day }) => (
          <Link
            key={day.id}
            to={`${base}/days/${day.id}`}
            aria-current={day.id === data.day.id ? 'page' : undefined}
          >
            {day.name}
          </Link>
        ))}
        <Link to={`${base}/days/new`} aria-label="Add training day">
          <Plus size={20} aria-hidden="true" />
        </Link>
      </nav>
      <h2 className="builder-day-caption">{data.day.name}</h2>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <div className="builder-exercises">
        {data.exercises.map(({ prescription, exercise }, index) => (
          <article key={prescription.id} className="builder-exercise">
            <div className="builder-exercise-row">
              <button
                className="builder-reorder"
                type="button"
                aria-label={`Reorder ${exercise.name}`}
                aria-expanded={expanded === prescription.id}
                onClick={() =>
                  setExpanded((current) => (current === prescription.id ? null : prescription.id))
                }
              >
                <GripVertical size={19} aria-hidden="true" />
              </button>
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
                  <p>{formatPrescription(prescription)}</p>
                </div>
                <ChevronRight size={19} aria-hidden="true" />
              </Link>
            </div>
            {expanded === prescription.id ? (
              <div className="builder-row-actions" aria-label={`${exercise.name} actions`}>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  aria-label={`Move ${exercise.name} up`}
                  onClick={() => void run(() => movePrescription(data.day.id, prescription.id, -1))}
                >
                  <ArrowUp size={17} aria-hidden="true" />
                  Up
                </button>
                <button
                  type="button"
                  disabled={busy || index === data.exercises.length - 1}
                  aria-label={`Move ${exercise.name} down`}
                  onClick={() => void run(() => movePrescription(data.day.id, prescription.id, 1))}
                >
                  <ArrowDown size={17} aria-hidden="true" />
                  Down
                </button>
                <button
                  type="button"
                  className="danger-text"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Remove ${exercise.name} from this day?`))
                      void run(() => deletePrescription(prescription.id));
                  }}
                >
                  Remove
                </button>
              </div>
            ) : null}
            <p className="builder-exercise-rest">{formatRest(prescription.restSeconds)}</p>
          </article>
        ))}
      </div>
      {!data.exercises.length ? <p className="builder-empty">No exercises added yet.</p> : null}
      <Link className="builder-add" to={`${base}/days/${data.day.id}/exercises`}>
        <Plus size={21} aria-hidden="true" />
        Add exercise
      </Link>
      <section className="builder-card builder-day-settings">
        <h2>Day settings</h2>
        <Link to={`${base}/days/${data.day.id}/edit`}>
          <SlidersHorizontal size={24} aria-hidden="true" />
          <div>
            <strong>Edit day</strong>
            <span>
              {data.day.defaultRestSeconds != null
                ? `${data.day.defaultRestSeconds} seconds default rest`
                : 'Name, notes and default rest'}
            </span>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
        {data.day.notes ? <p>{data.day.notes}</p> : null}
      </section>
      <BuilderFooter>
        <Link className="builder-primary" to={`${base}/build/review`}>
          <NextLabel>Next: Review</NextLabel>
        </Link>
      </BuilderFooter>
    </section>
  );
}

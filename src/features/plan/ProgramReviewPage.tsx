import { useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter } from './BuilderChrome';
import { programBuilder, weekdays } from './builderService';
import { formatPrescription, formatRest } from './prescriptionFormat';
import type { Exercise } from '../../domain/entities';

export function ProgramReviewPage() {
  const { graph, exercises } = useLoaderData<{ graph: ProgramGraph; exercises: Exercise[] }>();
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const first = graph.days[0]?.day;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await programBuilder.finish(graph.program.id);
      await navigate(`/plan/${graph.program.id}`, { replace: true });
    } catch {
      setError('The program could not be finalized. Your saved draft is still available.');
    } finally {
      setBusy(false);
    }
  };
  const back = first
    ? `/plan/${graph.program.id}/days/${first.id}`
    : `/plan/${graph.program.id}/build/days`;
  return (
    <section className="builder-page">
      <BuilderHeader
        title="Review Program"
        step={3}
        programId={graph.program.id}
        back={back}
        exercisesPath={back}
      />
      <section className="builder-card">
        <p className="builder-eyebrow">Your training plan</p>
        <h2>{graph.program.name}</h2>
        {graph.program.description ? <p>{graph.program.description}</p> : null}
        <div className="builder-tags">
          {graph.program.goal ? <span>{graph.program.goal}</span> : null}
          {graph.program.level ? <span>{graph.program.level}</span> : null}
        </div>
        <Link to={`/plan/${graph.program.id}/edit`}>Edit details</Link>
      </section>
      <h2 className="builder-section-title">Training schedule</h2>
      {graph.days.map(({ day, exercises: prescriptions }) => (
        <section key={day.id} className="builder-card builder-review-day">
          <div>
            <p className="builder-eyebrow">
              {day.weekday != null ? weekdays[day.weekday] : 'Unscheduled'}
            </p>
            <Link to={`/plan/${graph.program.id}/days/${day.id}`}>
              <h2>{day.name}</h2>
            </Link>
          </div>
          <p>
            {prescriptions.length} exercise{prescriptions.length === 1 ? '' : 's'}
            {day.defaultRestSeconds != null ? ` · ${day.defaultRestSeconds} sec default rest` : ''}
          </p>
          {prescriptions.length ? (
            <ul>
              {prescriptions.map((prescription) => (
                <li key={prescription.id}>
                  <strong>
                    {byId.get(prescription.exerciseId)?.name ?? 'Unavailable exercise'}
                  </strong>
                  <span>{formatPrescription(prescription)}</span>
                  <span>{formatRest(prescription.restSeconds)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No exercises yet. You can add them later.</p>
          )}
        </section>
      ))}
      <p className="builder-info">
        Saving a program does not start a workout. Actual sets remain separate.
      </p>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <BuilderFooter>
        <button
          className="builder-primary"
          type="button"
          disabled={busy || !graph.days.length}
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Save Program'}
        </button>
      </BuilderFooter>
    </section>
  );
}

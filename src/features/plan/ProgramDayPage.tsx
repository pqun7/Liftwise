import { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router-dom';

import { deletePrescription, movePrescription, type HydratedProgramDay } from './programService';
import { formatPrescription, formatRest } from './prescriptionFormat';

export function ProgramDayPage() {
  const { day: data } = useLoaderData<{ day: HydratedProgramDay }>();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await revalidator.revalidate();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="page-stack" aria-labelledby="day-title">
      <Link className="back-link" to={`/plan/${data.program.id}`}>
        ← {data.program.name}
      </Link>
      <header className="program-header">
        <p className="section-kicker">Day {data.day.order}</p>
        <h1 id="day-title">{data.day.name}</h1>
        {data.day.notes ? <p>{data.day.notes}</p> : null}
      </header>
      <div className="program-actions">
        <Link to={`/plan/${data.program.id}/days/${data.day.id}/edit`}>Edit day</Link>
        <Link
          className="primary-action"
          to={`/plan/${data.program.id}/days/${data.day.id}/exercises`}
        >
          Add exercise
        </Link>
      </div>
      <div className="prescription-list">
        {data.exercises.map(({ prescription, exercise }, index) => (
          <article className="prescription-card" key={prescription.id}>
            <div className="prescription-number">{prescription.order}</div>
            <div className="prescription-copy">
              <h2>{exercise.name}</h2>
              <p>{formatPrescription(prescription)}</p>
              <p>{formatRest(prescription.restSeconds)}</p>
              {prescription.notes ? <small>{prescription.notes}</small> : null}
            </div>
            <div
              className="row-actions prescription-actions"
              aria-label={`${exercise.name} actions`}
            >
              <button
                type="button"
                disabled={busy || index === 0}
                aria-label={`Move ${exercise.name} up`}
                onClick={() => void run(() => movePrescription(data.day.id, prescription.id, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || index === data.exercises.length - 1}
                aria-label={`Move ${exercise.name} down`}
                onClick={() => void run(() => movePrescription(data.day.id, prescription.id, 1))}
              >
                ↓
              </button>
              <Link
                to={`/plan/${data.program.id}/days/${data.day.id}/exercises/${prescription.id}/edit`}
              >
                Edit
              </Link>
              <button
                className="danger-text"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove ${exercise.name} from this day?`))
                    void run(() => deletePrescription(prescription.id));
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      {data.exercises.length === 0 ? (
        <div className="empty-state">
          <h2>No exercises yet</h2>
          <p>Add a built-in or custom exercise, then set its prescription.</p>
        </div>
      ) : null}
    </section>
  );
}

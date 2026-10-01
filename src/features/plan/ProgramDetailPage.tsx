import { useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom';

import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import {
  deleteProgram,
  deleteProgramDay,
  duplicateProgram,
  duplicateProgramDay,
  moveProgramDay,
  setActiveProgram,
} from './programService';

interface LoaderData {
  graph: ProgramGraph;
  activeProgramId: string | null;
}

export function ProgramDetailPage() {
  const { graph, activeProgramId } = useLoaderData<LoaderData>();
  const { program, days } = graph;
  const navigate = useNavigate();
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
  const removeProgram = async () => {
    if (!window.confirm(`Delete ${program.name} and all of its planned days?`)) return;
    await deleteProgram(program.id);
    await navigate('/plan', { replace: true });
  };
  return (
    <section className="page-stack program-detail" aria-labelledby="program-title">
      <Link className="back-link" to="/plan">
        ← Programs
      </Link>
      <header className="program-header">
        <p className="section-kicker">Training program</p>
        <div className="card-title-row">
          <h1 id="program-title">{program.name}</h1>
          {activeProgramId === program.id ? <span className="source-chip">Active</span> : null}
        </div>
        {program.description ? <p>{program.description}</p> : null}
      </header>
      <div className="program-actions">
        {activeProgramId !== program.id ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => setActiveProgram(program.id))}
          >
            Set active
          </button>
        ) : null}
        <Link to={`/plan/${program.id}/edit`}>Edit</Link>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const copy = await duplicateProgram(program.id);
              await navigate(`/plan/${copy.program.id}`);
            })
          }
        >
          Duplicate
        </button>
        <button
          className="danger-action"
          type="button"
          disabled={busy}
          onClick={() => void removeProgram()}
        >
          Delete
        </button>
      </div>
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Schedule</p>
          <h2>Program days</h2>
        </div>
        <Link className="compact-link" to={`/plan/${program.id}/days/new`}>
          + Day
        </Link>
      </div>
      <div className="day-list">
        {days.map(({ day, exercises }, index) => (
          <article className="day-card" key={day.id}>
            <Link className="day-card-main" to={`/plan/${program.id}/days/${day.id}`}>
              <span className="order-badge">{day.order}</span>
              <div>
                <h3>{day.name}</h3>
                <p>
                  {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
            <div className="row-actions" aria-label={`${day.name} actions`}>
              <button
                type="button"
                disabled={busy || index === 0}
                aria-label={`Move ${day.name} up`}
                onClick={() => void run(() => moveProgramDay(program.id, day.id, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || index === days.length - 1}
                aria-label={`Move ${day.name} down`}
                onClick={() => void run(() => moveProgramDay(program.id, day.id, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => duplicateProgramDay(day.id))}
              >
                Copy
              </button>
              <button
                className="danger-text"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Delete ${day.name}?`))
                    void run(() => deleteProgramDay(day.id));
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {days.length === 0 ? (
        <div className="empty-state">
          <h2>Add your first day</h2>
          <p>Rest days do not need placeholder exercises.</p>
        </div>
      ) : null}
    </section>
  );
}

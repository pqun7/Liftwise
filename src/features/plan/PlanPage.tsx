import { Link, useLoaderData } from 'react-router-dom';

import { PageIntro } from '../../components/PageIntro';
import type { ProgramListData } from './programService';

export function PlanPage() {
  const { programs, activeProgramId } = useLoaderData<ProgramListData>();
  return (
    <section className="page-stack" aria-labelledby="plan-title">
      <PageIntro
        titleId="plan-title"
        eyebrow="Programs"
        title="Shape your training"
        description="Build a clear prescription now, so gym-floor decisions stay simple later."
      />
      <Link className="primary-action" to="/plan/new">
        Create program
      </Link>
      <div className="program-list">
        {programs.map((program) => (
          <article className="program-card" key={program.id}>
            <div>
              <div className="card-title-row">
                <h2>{program.name}</h2>
                {program.id === activeProgramId ? (
                  <span className="source-chip">Active</span>
                ) : null}
              </div>
              <p>{program.description ?? 'No program notes yet.'}</p>
            </div>
            <Link to={`/plan/${program.id}`} aria-label={`Open ${program.name}`}>
              Open program <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
      {programs.length === 0 ? (
        <div className="empty-state program-empty">
          <h2>No programs yet</h2>
          <p>Create your first training week. It will be stored on this device.</p>
        </div>
      ) : null}
    </section>
  );
}

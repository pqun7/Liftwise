import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { discardWorkout, getRecoverySummary, type WorkoutRecoverySummary } from './workoutService';

function minutesSince(timestamp: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000));
}

export function ActiveWorkoutBanner() {
  const [summary, setSummary] = useState<WorkoutRecoverySummary | null>(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    void getRecoverySummary()
      .then((nextSummary) => {
        if (active) setSummary(nextSummary);
      })
      .catch(() => {
        if (active) setSummary(null);
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (!summary || location.pathname === `/workout/${summary.id}`) return null;
  return (
    <aside className="recovery-banner" aria-labelledby="unfinished-workout-title">
      <div>
        <p className="section-kicker">Unfinished workout found</p>
        <h2 id="unfinished-workout-title">{summary.name}</h2>
        <p>
          Started {minutesSince(summary.startedAt)} minutes ago · {summary.completedSets} /{' '}
          {summary.totalSets} sets completed
        </p>
      </div>
      <div className="recovery-actions">
        <Link className="primary-action" to={`/workout/${summary.id}`}>
          Resume
        </Link>
        <Link to={`/workout/${summary.id}`}>View</Link>
        <button
          className="danger-text"
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                'Discard this unfinished workout? Its saved sets will remain as a discarded record.',
              )
            )
              return;
            void discardWorkout(summary.id).then(() => setSummary(null));
          }}
        >
          Discard
        </button>
      </div>
    </aside>
  );
}

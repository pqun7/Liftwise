import { useState } from 'react';
import { Link, useLoaderData, useSearchParams, useRevalidator } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { ranges, weeklySummary, setMetrics, type DateRange } from '../../domain/analytics';
import { formatDuration, workoutElapsedSeconds } from '../../domain/workoutTime';
import type { progressLoader } from './loaders';
import { BodyMetrics } from './BodyMetrics';
import { dataSafetyRepository } from '../../lib/storage/repositories/dataSafetyRepository';
import { progressCsv } from './exports';
import { downloadTextFile } from '../dataSafety/downloads';

export function RangeControl({ range }: Readonly<{ range: DateRange }>) {
  const [params, setParams] = useSearchParams();
  return (
    <label className="filter-field">
      Date range
      <select
        aria-label="Date range"
        value={range}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          next.set('range', event.target.value);
          void setParams(next);
        }}
      >
        {ranges.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );
}
export function ProgressPage() {
  const { workouts, bodyMetrics, range, now } =
    useLoaderData<Awaited<ReturnType<typeof progressLoader>>>();
  const revalidator = useRevalidator();
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const summary = weeklySummary(workouts, new Date(now));
  const exercises = [
    ...new Map(
      workouts.flatMap((graph) =>
        graph.exercises.map(
          ({ exercise }) => [exercise.exerciseId, exercise.exerciseName] as const,
        ),
      ),
    ).entries(),
  ];
  const exportCsv = async (filename: keyof ReturnType<typeof progressCsv>) => {
    setExporting(true);
    setError(null);
    try {
      const files = progressCsv(await dataSafetyRepository.exportUserData());
      downloadTextFile(files[filename], filename, 'text/csv;charset=utf-8');
    } catch {
      setError('Export failed. Your data is unchanged.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <section className="page-stack" aria-labelledby="progress-title">
      <PageIntro
        titleId="progress-title"
        eyebrow="Progress"
        title="See the work add up"
        description="History and explainable trends, calculated only on this device."
      />
      <section className="session-exercise-card" aria-labelledby="weekly-title">
        <h2 id="weekly-title">This week</h2>
        <p>
          {summary.workouts} completed workouts · {summary.workingSets} working sets
        </p>
        <p>
          {formatDuration(summary.durationSeconds)} training · {Math.round(summary.volume)} kg·reps
          logged load volume
        </p>
      </section>
      <RangeControl range={range} />
      <section aria-labelledby="history-title">
        <h2 id="history-title">Workout history</h2>
        {!workouts.length ? (
          <p>No completed workouts in this range.</p>
        ) : (
          <ul className="progress-history">
            {workouts.map((graph) => {
              const values = setMetrics(graph.exercises.flatMap((entry) => entry.sets));
              return (
                <li key={graph.session.id}>
                  <Link to={`/workout/${graph.session.id}`}>
                    <strong>{graph.session.name ?? 'Workout'}</strong>
                    <span>
                      {new Date(graph.session.startedAt).toLocaleDateString()} ·{' '}
                      {values.workingSets} sets ·{' '}
                      {formatDuration(workoutElapsedSeconds(graph.session))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2>Exercise history</h2>
        <p>Choose an exercise performed in this range.</p>
        <ul className="progress-history">
          {exercises.map(([id, name]) => (
            <li key={id}>
              <Link to={`/progress/exercises/${encodeURIComponent(id)}`}>{name}</Link>
            </li>
          ))}
        </ul>
      </section>
      <BodyMetrics
        entries={bodyMetrics}
        refresh={async () => {
          await revalidator.revalidate();
        }}
      />
      <section>
        <h2>Export user data</h2>
        <p>
          CSV includes your records, not the RepDB catalog. JSON backups remain the restore format.
        </p>
        <div className="row-actions">
          {(['workouts.csv', 'sets.csv', 'body_metrics.csv'] as const).map((filename) => (
            <button
              type="button"
              disabled={exporting}
              key={filename}
              onClick={() => void exportCsv(filename)}
            >
              Export {filename}
            </button>
          ))}
        </div>
        {error ? <p role="alert">{error}</p> : null}
        <Link to="/settings/data-safety">Backup and restore</Link>
      </section>
    </section>
  );
}

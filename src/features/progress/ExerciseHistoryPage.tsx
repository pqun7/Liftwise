import { lazy, Suspense, useState } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import {
  metrics,
  metricLabels,
  rangeStart,
  exercisePoints,
  exerciseSummary,
  detectPrs,
  type Metric,
} from '../../domain/analytics';
import type { exerciseHistoryLoader } from './loaders';
import { RangeControl } from './ProgressPage';
import { formatPreviousSets } from '../workout/workoutFormat';
const TrendChart = lazy(() => import('./TrendChart'));
const display = (value: number | null) =>
  value === null ? '—' : Number(value.toFixed(1)).toString();
export function ExerciseHistoryPage() {
  const { workouts, exerciseId, range, now } =
    useLoaderData<Awaited<ReturnType<typeof exerciseHistoryLoader>>>();
  const [metric, setMetric] = useState<Metric>('e1rm');
  const summary = exerciseSummary(workouts, exerciseId);
  const allPoints = exercisePoints(workouts, exerciseId);
  const start = rangeStart(range, new Date(now));
  const points = allPoints.filter((point) => point.date >= start && point.date <= now);
  const prs = detectPrs(workouts)
    .filter((event) => event.date >= start && event.date <= now)
    .reverse();
  const name = allPoints.at(-1)?.name ?? 'Exercise history';
  return (
    <section className="page-stack" aria-labelledby="exercise-history-title">
      <Link className="back-link" to="/progress">
        ← Progress
      </Link>
      <PageIntro
        titleId="exercise-history-title"
        eyebrow="Exercise history"
        title={name}
        description="Completed-session records and snapshots. Estimates are not measured maximums."
      />
      <section className="session-exercise-card">
        <h2>Last performance</h2>
        <p>
          {summary.last ? new Date(summary.last.date).toLocaleDateString() : 'Not performed yet'}
        </p>
        <p>{formatPreviousSets(summary.last?.sets.filter((set) => set.completed) ?? [])}</p>
        <p>
          Best weight: {display(summary.bestWeight)} kg · Best estimated 1RM:{' '}
          {display(summary.bestE1rm)} kg
        </p>
        <details>
          <summary>More lifetime statistics</summary>
          <p>
            {summary.sessions} sessions · {summary.lifetimeWorkingSets} working sets
          </p>
          <p>
            Best set by load volume: {summary.bestSet ? formatPreviousSets([summary.bestSet]) : '—'}
          </p>
          <p>
            Most recent estimated 1RM:{' '}
            {display(allPoints.filter((point) => point.e1rm !== null).at(-1)?.e1rm ?? null)} kg
          </p>
        </details>
      </section>
      <RangeControl range={range} />
      <label className="filter-field">
        Chart metric
        <select
          aria-label="Chart metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value as Metric)}
        >
          {metrics.map((key) => (
            <option key={key} value={key}>
              {metricLabels[key]}
            </option>
          ))}
        </select>
      </label>
      <section aria-label={metricLabels[metric]}>
        <h2>{metricLabels[metric]}</h2>
        <Suspense fallback={<p>Loading local chart…</p>}>
          <TrendChart
            metric={metric}
            points={points.map((point) => ({ date: point.date, value: point[metric] }))}
          />
        </Suspense>
        {!points.length ? (
          <p>No completed performances in this range.</p>
        ) : (
          <details>
            <summary>Chart values and session links</summary>
            <ul className="progress-history">
              {points.map((point) => (
                <li key={point.sessionId}>
                  <Link to={`/workout/${point.sessionId}`}>
                    {new Date(point.date).toLocaleDateString()} — {display(point[metric])}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <section>
        <h2>Personal records</h2>
        <p>First performances establish a baseline. Ties are not PRs.</p>
        {!prs.length ? (
          <p>No qualifying improvements in this range.</p>
        ) : (
          <ul className="progress-history">
            {prs.map((pr) => (
              <li key={pr.id}>
                <Link to={`/workout/${pr.sessionId}`}>
                  <strong>{pr.type}</strong>
                  <span>
                    {display(pr.value)}{' '}
                    {pr.type === 'Rep PR'
                      ? `reps at ${pr.weight} kg`
                      : pr.type.includes('Volume')
                        ? 'kg·reps'
                        : 'kg'}{' '}
                    · Previous best: {display(pr.previous)} ·{' '}
                    {new Date(pr.date).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <details>
        <summary>How metrics work</summary>
        <p>
          Working, failure and drop sets count when completed with valid load and positive reps.
          Warmups and unfinished sessions are excluded. Epley: weight × (1 + reps/30), with singles
          using actual weight. Estimates use 1–10 reps, excluding drop sets and known RIR above 3.
          Missing RIR is permitted; estimates are approximate. Load volume does not estimate
          bodyweight work or physiological stimulus.
        </p>
        <p>
          PR improvements: weight ≥0.5 kg, estimated 1RM ≥1 kg, reps at identical load ≥1,
          set/session load volume ≥1 kg·rep. Metrics are derived again after corrections, not stored
          awards.
        </p>
      </details>
    </section>
  );
}

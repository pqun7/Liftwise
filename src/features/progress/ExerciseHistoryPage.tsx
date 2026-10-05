import { number } from './format';
import { lazy, Suspense, useState } from 'react';
import { Link, useLoaderData, useNavigate, useLocation } from 'react-router-dom';
import { ChartNoAxesColumnIncreasing, Dumbbell, Info, Target, Trophy } from 'lucide-react';
import { MobilePage } from '../../components/layout/MobilePage';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/FormControl';
import {
  detectPrs,
  exercisePoints,
  exerciseSummary,
  metricLabels,
  qualifiedSet,
  rangeStart,
  type Metric,
} from '../../domain/analytics';
import type { exerciseHistoryLoader } from './loaders';
import {
  focus,
  MetricCard,
  ProgressHeader,
  progressLayout,
  RangeControl,
  surface,
} from './ProgressUI';
const TrendChart = lazy(() => import('./TrendChart'));
export function ExerciseHistoryPage() {
  const { workouts, exerciseId, exercises, range, now } =
    useLoaderData<Awaited<ReturnType<typeof exerciseHistoryLoader>>>();
  const navigate = useNavigate();
  const location = useLocation();
  const [metric, setMetric] = useState<Metric>('weight');
  const allPoints = exercisePoints(workouts, exerciseId),
    start = rangeStart(range, new Date(now));
  const filtered = workouts.filter(
    ({ session }) =>
      (session.endedAt ?? session.startedAt) >= start &&
      (session.endedAt ?? session.startedAt) <= now,
  );
  const points = allPoints.filter((point) => point.date >= start && point.date <= now);
  const summary = exerciseSummary(filtered, exerciseId);
  const sets = points.flatMap((point) => point.sets).filter(qualifiedSet);
  const top = [...sets].sort((a, b) => b.weight! - a.weight! || b.reps! - a.reps!)[0];
  const topDate = points.find((point) => point.sets.some((set) => set.id === top?.id))?.date;
  const prs = detectPrs(workouts)
    .filter((pr) => pr.date >= start && pr.date <= now)
    .reverse();
  const name =
    allPoints.at(-1)?.name ??
    exercises.find((exercise) => exercise.id === exerciseId)?.name ??
    'Unknown exercise';
  return (
    <MobilePage className={progressLayout}>
      <ProgressHeader
        title="Exercise Insights"
        description="Analyze performance and trends for each exercise."
      />
      <label className={`${surface} flex items-center gap-2 px-2`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint">
          <Dumbbell size={22} />
        </span>
        <Select
          aria-label="Exercise"
          value={exerciseId}
          className="border-0 bg-transparent px-1 font-semibold"
          onChange={(e) =>
            void navigate(
              `/progress/exercises/${encodeURIComponent(e.target.value)}?range=${range}`,
            )
          }
        >
          {!exercises.some((e) => e.id === exerciseId) && (
            <option value={exerciseId}>{name}</option>
          )}
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </Select>
      </label>
      <RangeControl range={range} />
      <Card padding="none" className="rounded-[16px] p-3" aria-label={metricLabels[metric]}>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <h2 className="text-xs font-bold">
            {metric === 'weight' ? 'Top Set Weight (kg)' : metricLabels[metric]}
          </h2>
          <Select
            aria-label="Chart metric"
            value={metric}
            className="w-[145px]! max-w-full px-2 text-base"
            onChange={(e) => setMetric(e.target.value as Metric)}
          >
            {(['weight', 'e1rm', 'volume', 'reps'] as const).map((key) => (
              <option key={key} value={key}>
                {key === 'weight'
                  ? 'Top Weight'
                  : key === 'e1rm'
                    ? 'Est. 1RM'
                    : key === 'volume'
                      ? 'Volume'
                      : 'Reps'}
              </option>
            ))}
          </Select>
        </div>
        <Suspense
          fallback={
            <div role="status" className="h-[205px] rounded-xl bg-surface-2">
              Loading local chart…
            </div>
          }
        >
          <TrendChart
            metric={metric}
            points={points.map((point) => {
              const best = point.sets
                .filter(qualifiedSet)
                .sort((a, b) => b.weight! - a.weight! || b.reps! - a.reps!)[0];
              return {
                date: point.date,
                value: point[metric],
                weight: best?.weight,
                reps: best?.reps,
                rir: best?.rir,
              };
            })}
          />
        </Suspense>
        {!points.some((point) => point[metric] !== null && point.workingSets! > 0) ? (
          <p className="text-xs text-secondary">No qualifying performances in this period.</p>
        ) : (
          <details className="mt-2 text-xs text-secondary">
            <summary className={`${focus} flex min-h-11 cursor-pointer items-center`}>
              Chart values and session links
            </summary>
            <ul className="grid list-none gap-1 p-0">
              {points.map((point) => (
                <li key={point.sessionId}>
                  <Link
                    className={`${focus} flex min-h-11 items-center justify-between text-secondary`}
                    to={`/workout/${point.sessionId}`}
                  >
                    <span>{new Date(point.date).toLocaleDateString()}</span>
                    <span>{number(point[metric])}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Trophy}
          label="Best Top Set"
          value={top ? `${number(top.weight)} kg × ${top.reps}` : '—'}
          caption={
            topDate
              ? new Date(topDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'In this period'
          }
        />
        <MetricCard
          icon={ChartNoAxesColumnIncreasing}
          label="Estimated 1RM"
          value={`${number(summary.bestE1rm)} kg`}
          caption="Existing Epley estimate"
        />
        <MetricCard
          icon={ChartNoAxesColumnIncreasing}
          label="Total Sessions"
          value={number(summary.sessions)}
          caption="In this period"
        />
        <MetricCard
          icon={Target}
          label="Average Reps"
          value={
            sets.length ? number(sets.reduce((sum, set) => sum + set.reps!, 0) / sets.length) : '—'
          }
          caption="Per completed working set"
        />
      </div>
      <div className={`${surface} flex items-start gap-2.5 p-3`}>
        <Info className="mt-0.5 shrink-0 text-mint" size={21} />
        <div>
          <h2 className="text-sm font-semibold">About this chart</h2>
          <p className="mt-1! text-xs text-secondary">
            Shows completed working-set performance for {name}. Warmups and unfinished sessions are
            excluded.
          </p>
        </div>
      </div>
      <details
        id="personal-records"
        open={location.hash === '#personal-records' ? true : undefined}
        className={`${surface} scroll-mt-4 p-3`}
      >
        <summary
          className={`${focus} flex min-h-11 cursor-pointer items-center text-sm font-semibold`}
        >
          Personal records
        </summary>
        <p className="text-xs text-secondary">
          First performances establish a baseline. Ties are not PRs.
        </p>
        {!prs.length ? (
          <p className="mt-2! text-xs text-secondary">No qualifying improvements in this range.</p>
        ) : (
          <ul className="grid list-none gap-2 p-0">
            {prs.map((pr) => (
              <li key={pr.id}>
                <Link
                  className={`${focus} block min-h-11 py-2 text-xs text-secondary`}
                  to={`/workout/${pr.sessionId}`}
                >
                  <strong className="text-mint">{pr.type}</strong>
                  <p>
                    {number(pr.value)}{' '}
                    {pr.type === 'Rep PR'
                      ? `reps at ${pr.weight} kg`
                      : pr.type.includes('Volume')
                        ? 'kg·reps'
                        : 'kg'}{' '}
                    · {new Date(pr.date).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </details>
      <details className="text-xs text-secondary">
        <summary className={`${focus} flex min-h-11 cursor-pointer items-center`}>
          How metrics work
        </summary>
        <p>
          Working, failure and drop sets count when completed with valid load and positive reps.
          Epley estimates use 1–10 reps, excluding drop sets and known RIR above 3. Singles use
          actual weight. Estimates are approximate. Load volume is weight × reps and does not
          estimate bodyweight work or physiological stimulus.
        </p>
      </details>
    </MobilePage>
  );
}

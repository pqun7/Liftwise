import { useScreenState } from '../../app/useScreenState';
import { number } from './format';
import { useState } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronRight,
  Clock,
  Download,
  Dumbbell,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { MobilePage } from '../../components/layout/MobilePage';
import { Select } from '../../components/ui/FormControl';
import { Button } from '../../components/ui/Button';
import { setMetrics } from '../../domain/analytics';
import { formatDuration, workoutElapsedSeconds } from '../../domain/workoutTime';
import type { workoutHistoryLoader } from './loaders';
import { focus, ProgressHeader, progressLayout, surface } from './ProgressUI';
import { dataSafetyRepository } from '../../lib/storage/repositories/dataSafetyRepository';
import { progressCsv } from './exports';
import { downloadTextFile } from '../dataSafety/downloads';
import { completedSessionDate } from '../../domain/completedSessionDate';
import { dateFromKey } from '../../domain/localCalendar';

const metricChip =
  'inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium leading-5';

export function WorkoutHistoryPage() {
  const { workouts } = useLoaderData<Awaited<ReturnType<typeof workoutHistoryLoader>>>();
  const [filter, setFilter] = useScreenState('filter', 'All');
  const [order, setOrder] = useScreenState('order', 'newest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const names = [...new Set(workouts.map(({ session }) => session.name ?? 'Workout'))];

  const counts = workouts.reduce<Record<string, number>>((acc, { session }) => {
    const name = session.name ?? 'Workout';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  counts.All = workouts.length;

  const filtered = workouts
    .filter(({ session }) => filter === 'All' || (session.name ?? 'Workout') === filter)
    .sort((a, b) =>
      order === 'newest'
        ? (b.session.endedAt ?? b.session.startedAt).localeCompare(
          a.session.endedAt ?? a.session.startedAt,
        )
        : (a.session.endedAt ?? a.session.startedAt).localeCompare(
          b.session.endedAt ?? b.session.startedAt,
        ),
    );

  const groups = new Map<string, typeof workouts>();
  for (const graph of filtered) {
    const date = completedSessionDate(graph.session, new Date());
    if (!date) continue;
    const month = dateFromKey(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const group = groups.get(month) ?? [];
    group.push(graph);
    groups.set(month, group);
  }

  async function exportCsv(filename: keyof ReturnType<typeof progressCsv>) {
    setBusy(true);
    setError(null);
    try {
      const files = progressCsv(await dataSafetyRepository.exportUserData());
      downloadTextFile(files[filename], filename, 'text/csv;charset=utf-8');
    } catch {
      setError('Export failed. Your data is unchanged.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobilePage
      className={`${progressLayout} max-w-full overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
    >      <ProgressHeader
        title="Workout History"
        description="View your past workouts and track progress over time."
      />

      <div
        className="flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Workout filters"
      >        {['All', ...names].map((name) => {
        const active = filter === name;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            onClick={() => setFilter(name)}
            className={`${focus} flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors ${active
              ? 'border-mint bg-mint text-app'
              : 'border-border bg-surface text-secondary hover:border-mint/40'
              }`}
          >
            <span>{name}</span>
            <span
              className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? 'bg-app/15 text-app' : 'bg-surface-3 text-secondary'
                }`}
            >
              {counts[name] ?? 0}
            </span>
          </button>
        );
      })}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="shrink-0 inline-flex items-center rounded-full bg-surface-3 px-2.5 py-1 text-xs font-semibold text-secondary">
          {filtered.length} {filtered.length === 1 ? 'workout' : 'workouts'}
        </span>
        <div className="relative flex min-w-0 items-center">
          <ArrowUpDown
            size={14}
            className="pointer-events-none absolute left-2.5 text-secondary"
            aria-hidden
          />
          <Select
            aria-label="Sort workouts"
            className="pl-8! text-sm"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>
      </div>

      {!filtered.length && (
        <div className={`${surface} flex flex-col items-center gap-3 p-8 text-center`}>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-mint/10 text-mint">
            <Dumbbell size={26} />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              {filter === 'All' ? 'No completed workouts yet' : `No “${filter}” workouts`}
            </p>
            <p className="mt-1 text-xs text-secondary">
              {filter === 'All'
                ? 'Finish a workout and it will appear here.'
                : 'Try a different filter to see more history.'}
            </p>
          </div>
        </div>
      )}

      {[...groups].map(([month, graphs]) => {
        const monthVolume = graphs.reduce((sum, g) => {
          const v = setMetrics(g.exercises.flatMap((entry) => entry.sets));
          return sum + (v.volume ?? 0);
        }, 0);

        return (
          <section key={month} aria-label={month}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-bold">{month}</h2>
              <span className="text-xs tabular-nums text-secondary">
                {graphs.length} · {number(monthVolume)} kg
              </span>
            </div>
            <ul className="grid list-none gap-2 p-0">
              {graphs.map((graph) => {
                const values = setMetrics(graph.exercises.flatMap((entry) => entry.sets));
                const exerciseCount = graph.exercises.filter((entry) =>
                  entry.sets.some((set) => set.completed),
                ).length;
                const completedOn = completedSessionDate(graph.session, new Date());
                if (!completedOn) return null;
                const when = dateFromKey(completedOn);

                return (
                  <li key={graph.session.id}>
                    <Link
                      to={`/workout/${graph.session.id}`}
                      className={`${surface} ${focus} group flex min-h-[88px] items-center gap-3 px-3 py-3 text-primary no-underline transition-colors hover:border-mint/40 active:bg-surface-3`}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint">
                        <Dumbbell size={22} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm leading-5 font-bold">
                          {graph.session.name ?? 'Workout'}
                        </h3>
                        <p className="mt-0.5 text-xs text-secondary">
                          {when.toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-secondary">
                          <span className={metricChip}>
                            <Clock size={11} aria-hidden />
                            {formatDuration(workoutElapsedSeconds(graph.session))}
                          </span>
                          <span className={metricChip}>
                            <Layers size={11} aria-hidden />
                            {exerciseCount} exercises
                          </span>
                          <span className={metricChip}>
                            <TrendingUp size={11} aria-hidden />
                            {values.workingSets} sets
                          </span>
                          <span className={metricChip}>{number(values.volume)} kg</span>
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        aria-hidden
                        className="shrink-0 text-secondary transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <details className={`${surface} group overflow-hidden p-0`}>
        <summary
          className={`${focus} flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold`}
        >
          <Download size={16} className="text-mint" aria-hidden />
          <span className="flex-1">Export user data</span>
          <ChevronRight
            size={16}
            aria-hidden
            className="text-secondary transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="border-t border-border px-4 py-3">
          <p className="mb-3 text-xs text-secondary">
            CSV contains your records. JSON backups remain the restore format.
          </p>
          <div className="grid gap-2">
            {(['workouts.csv', 'sets.csv', 'body_metrics.csv'] as const).map((filename) => (
              <Button key={filename} disabled={busy} onClick={() => void exportCsv(filename)}>
                {busy ? 'Exporting…' : `Export ${filename}`}
              </Button>
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-500">
              {error}
            </p>
          )}
        </div>
      </details>
    </MobilePage>
  );
}

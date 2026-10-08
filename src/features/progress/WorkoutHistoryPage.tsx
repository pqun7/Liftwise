import { useScreenState } from '../../app/useScreenState';
import { number } from './format';
import { useState } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
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

export function WorkoutHistoryPage() {
  const { workouts } = useLoaderData<Awaited<ReturnType<typeof workoutHistoryLoader>>>();
  const [filter, setFilter] = useScreenState('filter', 'All');
  const [order, setOrder] = useScreenState('order', 'newest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = [...new Set(workouts.map(({ session }) => session.name ?? 'Workout'))];
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
    const month = new Date(graph.session.endedAt ?? graph.session.startedAt).toLocaleDateString(
      undefined,
      {
        month: 'long',
        year: 'numeric',
      },
    );
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
    <MobilePage className={progressLayout}>
      <ProgressHeader
        title="Workout History"
        description="View your past workouts and track progress over time."
      />
      <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Workout filters">
        {['All', ...names].map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
            className={`${focus} min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${filter === name ? 'border-mint bg-mint text-app' : 'border-border bg-surface text-secondary'}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{filtered.length} completed workouts</h2>
        <Select
          aria-label="Sort workouts"
          className="w-[148px]! text-base"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>
      {!filtered.length && (
        <div className={`${surface} p-5 text-secondary`}>No completed workouts yet.</div>
      )}
      {[...groups].map(([month, graphs]) => (
        <section key={month} aria-label={month}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">{month}</h2>
            <span className="text-xs text-secondary">{graphs.length} workouts</span>
          </div>
          <ul className="grid list-none gap-2 p-0">
            {graphs.map((graph) => {
              const values = setMetrics(graph.exercises.flatMap((entry) => entry.sets));
              return (
                <li key={graph.session.id}>
                  <Link
                    to={`/workout/${graph.session.id}`}
                    className={`${surface} ${focus} flex min-h-[82px] items-center gap-3 px-2.5 py-2.5 text-primary no-underline transition-colors hover:border-mint/40 active:bg-surface-3`}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint">
                      <Dumbbell size={23} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm leading-5 font-bold">
                        {graph.session.name ?? 'Workout'}
                      </h3>
                      <p className="mt-1! type-caption text-secondary">
                        {new Date(
                          graph.session.endedAt ?? graph.session.startedAt,
                        ).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        · {formatDuration(workoutElapsedSeconds(graph.session))}
                      </p>
                    </div>
                    <div className="shrink-0 type-caption text-secondary">
                      <p>
                        {
                          graph.exercises.filter((entry) => entry.sets.some((set) => set.completed))
                            .length
                        }{' '}
                        exercises
                      </p>
                      <p>{values.workingSets} sets</p>
                      <p>{number(values.volume)} kg</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-secondary" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <details className={`${surface} p-3`}>
        <summary className={`${focus} min-h-11 cursor-pointer text-sm font-semibold`}>
          Export user data
        </summary>
        <p className="mb-2! text-xs text-secondary">
          CSV contains your records. JSON backups remain the restore format.
        </p>
        <div className="grid gap-2">
          {(['workouts.csv', 'sets.csv', 'body_metrics.csv'] as const).map((filename) => (
            <Button key={filename} disabled={busy} onClick={() => void exportCsv(filename)}>
              Export {filename}
            </Button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </details>
    </MobilePage>
  );
}

import { Link, useLoaderData, useSearchParams } from 'react-router-dom';
import { ChevronRight, Pencil } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { buttonClasses } from '../../components/ui/controlStyles';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { BuilderHeader } from './BuilderChrome';
import { estimatedProgramMinutes } from './programDisplay';
import { ScheduleEmpty } from './ScheduleView';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';

/** Program definition only: no date state, sessions or execution actions. */
export function ProgramOverview() {
  const { graph, activeProgramId } = useLoaderData<{
    graph: ProgramGraph;
    activeProgramId: string | null;
  }>();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'workouts' ? 'Training Days' : 'Overview';
  const { program } = graph;
  const days = [...graph.days].sort((a, b) => a.day.order - b.day.order);
  const training = days.filter(({ day }) => day.kind !== 'recovery');
  return (
    <section className="grid gap-4 font-ui">
      <BuilderHeader title="Program details" back="/plan?tab=program" backLabel="Back to Program" />
      <SegmentedControl
        legend="Program details"
        options={['Overview', 'Training Days'] as const}
        value={tab}
        onChange={(value) => void setParams(value === 'Overview' ? {} : { tab: 'workouts' })}
      />
      {tab === 'Overview' ? (
        <Card variant="glass" padding="spacious" radius="hero" className="grid gap-3">
          {activeProgramId === program.id ? (
            <span className="type-label text-mint">● Active</span>
          ) : (
            <span className="type-label text-secondary">
              {program.archived ? 'Archived' : 'Saved program'}
            </span>
          )}
          <h2 className="type-page-title wrap-anywhere">{program.name}</h2>
          <p className="text-secondary">
            {training.length} training days ·{' '}
            {days.reduce((sum, entry) => sum + entry.exercises.length, 0)} exercises
          </p>
          {program.description ? (
            <p className="type-body-small text-secondary">{program.description}</p>
          ) : null}
          <p className="type-label text-secondary">
            {program.scheduleType === 'cycle'
              ? 'Flexible cycle · ordered training and rest days'
              : 'Weekly program'}
          </p>
          <Link
            className={buttonClasses('secondary')}
            to={
              program.scheduleType === 'cycle'
                ? `/plan/${program.id}/edit`
                : `/plan/${program.id}?tab=edit`
            }
          >
            <Pencil size={19} />
            Edit program
          </Link>
        </Card>
      ) : null}
      <h2 className="type-section-title">
        {program.scheduleType === 'cycle' ? 'Program Cycle' : 'Training Days'}
      </h2>
      {days.length ? (
        <div className="grid gap-2">
          {days.map(({ day, exercises }, index) => {
            const minutes = estimatedProgramMinutes(exercises);
            return (
              <Card key={day.id} variant="glass">
                <Link
                  className="flex items-center gap-3 text-primary no-underline"
                  to={`/plan/${program.id}/days/${day.id}?mode=preview`}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface-2 type-label">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="type-card-title wrap-anywhere">{day.name}</strong>
                    <small className="mt-1 block type-body-small text-secondary">
                      {day.kind === 'recovery'
                        ? 'Rest day'
                        : `${exercises.length} exercises${minutes == null ? '' : ` · ~${minutes} min`}`}
                    </small>
                  </span>
                  <ChevronRight size={19} />
                </Link>
              </Card>
            );
          })}
        </div>
      ) : (
        <ScheduleEmpty
          title="No training days yet"
          description="Add your first training day, then choose exercises."
          to={`/plan/${program.id}/build/days`}
          action="Add training days"
        />
      )}
    </section>
  );
}

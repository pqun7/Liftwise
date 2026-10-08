import { useRef, useState } from 'react';
import { Link, useLoaderData, useRevalidator, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  FileText,
  Pencil,
  Play,
  Plus,
  Eye,
  SlidersHorizontal,
  Smartphone,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { buttonClasses } from '../../components/ui/controlStyles';
import { weekdays } from './builderService';
import { setActiveProgram, type ProgramListData } from './programService';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { ScheduleView } from './ScheduleView';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import planArtwork from '../../assets/images/plan/plan-empty-transparent.png';

function ProgramStructurePreview({ graph }: { graph: ProgramGraph }) {
  const cycle = graph.program.scheduleType === 'cycle';
  const entries = cycle
    ? graph.days
    : weekdays.map((_, weekday) => graph.days.find(({ day }) => day.weekday === weekday));
  return (
    <div className={`my-2 gap-1 ${cycle ? 'flex overflow-x-auto py-1' : 'grid grid-cols-7'}`}>
      {entries.map((entry, index) => (
        <div
          key={index}
          className={`grid min-w-0 justify-items-center gap-2 text-center type-label ${cycle ? 'w-12 shrink-0' : ''}`}
        >
          <span>{cycle ? index + 1 : weekdays[index]?.slice(0, 3)}</span>
          <i
            aria-hidden="true"
            className={`size-2.5 rounded-full ${entry && entry.day.kind !== 'recovery' ? 'bg-mint' : 'bg-muted/70'}`}
          />
          <small className="w-full truncate type-caption text-secondary" title={entry?.day.name}>
            {entry?.day.kind !== 'recovery' && entry ? entry.day.name : 'Rest'}
          </small>
        </div>
      ))}
    </div>
  );
}

export function PlanPage() {
  const { programs, graphs, activeProgramId } = useLoaderData<ProgramListData>();
  const active = graphs.find(
    ({ program }) => program.id === activeProgramId && !program.draft && !program.archived,
  );
  const others = graphs.filter(({ program }) => program.id !== active?.program.id);
  const revalidator = useRevalidator();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'program' ? 'Program' : 'Schedule';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const activate = async (id: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await setActiveProgram(id);
      await revalidator.revalidate();
    } catch {
      setError('Could not change your active program. Try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const summary = (graph: ProgramGraph) =>
    `${graph.days.filter(({ day }) => day.kind !== 'recovery').length} training days · ${graph.days.reduce((sum, entry) => sum + entry.exercises.length, 0)} exercises`;
  return (
    <section className="grid gap-4 font-ui type-body" aria-labelledby="plan-title">
      <SegmentedControl
        legend="Plan view"
        options={['Schedule', 'Program'] as const}
        value={tab}
        onChange={(value) => void setParams(value === 'Program' ? { tab: 'program' } : {})}
      />
      {tab === 'Schedule' ? (
        <ScheduleView showWeek={false} />
      ) : (
        <>
          <h2 className="px-1 type-section-title">Current Program</h2>
          {active ? (
            <Card
              variant="glass"
              padding="spacious"
              radius="hero"
              className="plan-active-card grid gap-3"
            >
              <div className="flex justify-between items-center">
                <span className="inline-flex items-center gap-2 justify-self-start rounded-full bg-mint/20 px-4 py-2 type-button">
                  <span className="size-2 rounded-full bg-mint" aria-hidden="true" /> Active
                </span>
                <Link
                  className="grid size-11 shrink-0 place-items-center rounded-full text-primary no-underline hover:bg-mint/10"
                  aria-label="Program settings"
                  to={`/plan/${active.program.id}?tab=settings`}
                >
                  •••
                </Link>
              </div>
              <h2 className="type-page-title wrap-anywhere">{active.program.name}</h2>
              <p className="text-secondary">{summary(active)}</p>
              <div className="mt-2 flex items-center gap-2.5 border-t border-border pt-4 text-secondary">
                <CalendarDays size={19} />
                {active.program.scheduleType === 'cycle' ? 'Flexible Cycle' : 'Weekly Structure'}
              </div>
              <ProgramStructurePreview graph={active} />
              <div className="grid gap-2">
                <Link
                  className={buttonClasses('secondary', '', 'large')}
                  to={`/plan/${active.program.id}/edit`}
                >
                  <Pencil size={19} />
                  Edit program
                </Link>
                <Link
                  className={buttonClasses('primary', '', 'large')}
                  to={`/plan/${active.program.id}`}
                >
                  <Eye size={19} />
                  View program details
                </Link>
              </div>
            </Card>
          ) : (
            <Card
              variant="glass"
              padding="spacious"
              radius="hero"
              className="grid gap-4 text-center"
            >
              <img
                className="plan-empty-artwork mx-auto block h-auto w-[var(--artwork-width)] max-w-full object-contain"
                src={planArtwork}
                width={1448}
                height={1086}
                alt=""
                decoding="async"
              />
              <h2 className="type-section-title text-[21px] leading-tight">
                {programs.length ? 'Choose your training program' : 'Build your training week'}
              </h2>
              <p className="mx-auto max-w-[265px] text-[15px] leading-relaxed text-secondary">
                {programs.length
                  ? 'Set a saved program active, or create a new training plan.'
                  : 'Create your first plan with guided templates. Fully editable and saved on this device.'}
              </p>
              <Link className={buttonClasses('primary')} to="/plan/new">
                Create program
                <ArrowRight size={19} />
              </Link>
              <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-5 text-secondary [&>span]:grid [&>span]:content-start [&>span]:justify-items-center [&>span]:gap-2 [&>span]:type-label [&_svg]:size-6">
                <span>
                  <FileText />
                  Templates
                </span>
                <span>
                  <SlidersHorizontal />
                  Fully editable
                </span>
                <span>
                  <Smartphone />
                  Stored on
                  <br />
                  this device
                </span>
              </div>
            </Card>
          )}
          {error ? <p role="alert">{error}</p> : null}
          {others.length ? (
            <section className="grid gap-4">
              <h2 className="px-1 type-section-title">
                {active ? 'Other Programs' : 'Your Programs'}
              </h2>
              {others.map((graph, index) => (
                <Card key={graph.program.id} variant="glass" className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl ${index % 2 === 0 ? 'bg-mint/15 text-mint' : 'bg-violet-400/15 text-violet-400'}`}
                    >
                      <Dumbbell size={26} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="type-card-title wrap-anywhere">
                        {graph.program.name}
                        {graph.program.draft ? ' · Draft' : ''}
                      </h3>
                      <p className="mt-1 type-body-small text-secondary">{summary(graph)}</p>
                    </div>
                    <Link
                      className="grid size-11 shrink-0 place-items-center rounded-full text-primary no-underline hover:bg-mint/10"
                      aria-label={`Options for ${graph.program.name}`}
                      to={`/plan/${graph.program.id}?tab=settings`}
                    >
                      •••
                    </Link>
                  </div>
                  <ProgramStructurePreview graph={graph} />
                  {graph.program.draft ? (
                    <Link
                      className={buttonClasses('secondary', 'w-full', 'large')}
                      to={`/plan/${graph.program.id}/edit`}
                    >
                      Continue building
                      <ArrowRight size={17} />
                    </Link>
                  ) : graph.program.archived ? (
                    <Link
                      className={buttonClasses('secondary', 'w-full')}
                      to={`/plan/${graph.program.id}?tab=settings`}
                    >
                      Archived · Program settings
                    </Link>
                  ) : (
                    <Button
                      disabled={busy}
                      className="w-full"
                      onClick={() => void activate(graph.program.id)}
                    >
                      <Play size={17} fill="currentColor" />
                      Set as active
                    </Button>
                  )}
                </Card>
              ))}
            </section>
          ) : null}
          {active ? (
            <Link className={buttonClasses('secondary', 'w-full')} to="/plan/new">
              <Plus size={23} />
              Create another program
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}

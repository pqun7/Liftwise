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
import { WeekSelector } from '../../components/home/WeekSelector';
import { planCalendar } from './scheduleData';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import planArtwork from '../../assets/images/plan/plan-empty-transparent.webp';

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
  const data = useLoaderData<ProgramListData>();
  const { programs, graphs, activeProgramId } = data;
  const { calendar } = planCalendar(data);
  const active = graphs.find(
    ({ program }) => program.id === activeProgramId && !program.draft && !program.archived,
  );
  const others = graphs.filter(({ program }) => program.id !== active?.program.id);
  const revalidator = useRevalidator();
  const [params, setParams] = useSearchParams();
  const tab = active && params.get('tab') === 'program' ? 'Details' : 'Overview';
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
    <section className="plan-page grid gap-3 type-body" aria-labelledby="plan-title">
      {data.unfinished ? (
        <p className="text-sm text-secondary">
          Your saved workout stays unchanged. Program changes apply to future sessions.
        </p>
      ) : null}
      {active ? (
        <SegmentedControl
          variant="pill"
          legend="Plan view"
          options={['Overview', 'Details'] as const}
          value={tab}
          onChange={(value) => void setParams(value === 'Details' ? { tab: 'program' } : {})}
        />
      ) : null}
      {tab === 'Overview' && active ? (
        <>
          <ScheduleView overview />
          <Card variant="glass" className="relative overflow-hidden grid gap-2 plan-current-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 type-card-title">
                <FileText size={20} aria-hidden="true" />
                Current Program
              </h2>
              <Link
                className="flex items-center gap-1 min-h-11 type-caption text-secondary no-underline"
                to="/plan?tab=program"
              >
                View all <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <h3 className="type-section-title wrap-anywhere">{active.program.name}</h3>
            <p className="type-body-small text-secondary">{summary(active)}</p>
            <span className="inline-flex items-center gap-2 justify-self-start rounded-full border border-mint/20 bg-mint/10 px-3 py-1 type-caption">
              <span className="size-2 rounded-full bg-mint" aria-hidden="true" />
              Active
            </span>
          </Card>
        </>
      ) : (
        <>
          {active ? <h2 className="px-1 type-section-title">Current Program</h2> : null}
          {active ? (
            <Card
              variant="glass"
              padding="spacious"
              radius="hero"
              className="plan-active-card relative overflow-hidden grid gap-3"
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
              <div className="plan-program-summary">
                <h2 className="type-page-title wrap-anywhere">{active.program.name}</h2>
                {/* <img
                  className="plan-details-art"
                  src={programArtwork}
                  width={448}
                  height={448}
                  alt=""
                  decoding="async"
                /> */}
              </div>
              <p className="type-body-small text-secondary">{summary(active)}</p>
              <div className="mt-2 flex items-center gap-2.5 border-t border-border pt-4 text-secondary">
                <CalendarDays size={19} />
                {active.program.scheduleType === 'cycle' ? 'Flexible Cycle' : 'Weekly Structure'}
              </div>
              <WeekSelector
                calendar={calendar}
                selected={calendar.today}
                variant="detailed"
                onSelect={(date) => void setParams({ date })}
              />
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
              className="plan-build-card grid gap-4 text-center"
            >
              <img
                className="plan-empty-artwork mx-auto block size-[220px] max-w-full object-contain"
                src={planArtwork}
                width={640}
                height={640}
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
                  <strong className="text-primary">Templates</strong>
                  <small>Start with proven plans</small>
                </span>
                <span>
                  <SlidersHorizontal />
                  <strong className="text-primary">Fully editable</strong>
                  <small>Make it yours any time</small>
                </span>
                <span>
                  <Smartphone />
                  <strong className="text-primary">Stored on this device</strong>
                  <small>Your data stays local</small>
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

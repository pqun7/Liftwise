import { useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  Circle,
  Dumbbell,
  Layers3,
  Settings2,
  Plus,
  Info,
} from 'lucide-react';
import {
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from 'react-router-dom';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';
import { programBuilder, weekdays } from './builderService';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/controlStyles';
import { DayStructure } from './DayStructure';
import { programTemplates } from './programTemplates';
import { createProgramDay } from './programService';
import { reviewDestination, reviewSuffix } from './reviewNavigation';

export function TrainingDaysPage() {
  const { graph } = useLoaderData<{ graph: ProgramGraph }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const cycle = graph.program.scheduleType === 'cycle';
  const template = programTemplates.find(({ split }) => split === graph.program.splitTemplate);
  const selected = graph.days.flatMap(({ day }) => (day.weekday == null ? [] : [day.weekday]));
  const workouts = graph.days.filter(({ day }) => day.kind !== 'recovery').length;
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await revalidator.revalidate();
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save. Try again.');
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const toggle = (weekday: number) => {
    const removing = selected.includes(weekday);
    const entry = graph.days.find(({ day }) => day.weekday === weekday);
    if (
      removing &&
      entry &&
      (entry.exercises.length || entry.day.notes) &&
      !window.confirm(`Remove ${entry.day.name} and its prescriptions? Workout history is kept.`)
    )
      return;
    const next = removing ? selected.filter((value) => value !== weekday) : [...selected, weekday];
    if (!next.length) {
      setError('Keep at least one training day.');
      return;
    }
    void run(() =>
      programBuilder.chooseDays(
        graph.program.id,
        next,
        graph.program.splitTemplate ?? 'custom',
        true,
      ),
    );
  };
  return (
    <section className="builder-page schedule-page">
      <BuilderHeader
        title={graph.program.draft ? 'Create Program' : 'Edit Program'}
        back={`/plan/${graph.program.id}/build/template`}
        step={2}
        programId={graph.program.id}
      />
      <div className="starting-template">
        <h2>Starting template</h2>
        <div className="starting-template-row">
          <span className="template-icon">
            {template ? template.id === 'ppl-6' ? <Layers3 /> : <Dumbbell /> : <Settings2 />}
          </span>
          <span className="day-copy">
            <strong>{template?.name ?? 'Custom'}</strong>
            <small>{template?.context ?? 'Build your own routine'}</small>
          </span>
          <Link
            className={buttonClasses('outline')}
            to={`/plan/${graph.program.id}/build/template${reviewSuffix(params)}`}
          >
            Change
          </Link>
        </div>
      </div>
      {cycle ? (
        <div>
          <h2>Your cycle</h2>
          <p className="text-secondary">
            {graph.days.length} days · {workouts} workouts · {graph.days.length - workouts} recovery
            days
          </p>
        </div>
      ) : (
        <>
          <div>
            <h2>Select training days</h2>
            <p className="text-secondary">Choose which days you want to train each week.</p>
          </div>
          <div className="schedule-weekdays" role="group" aria-label="Training weekdays">
            {weekdays.map((day, index) => (
              <Button
                key={day}
                className="flex-col !px-0 text-xs"
                variant={selected.includes(index) ? 'primary' : 'secondary'}
                aria-label={day}
                aria-pressed={selected.includes(index)}
                disabled={busy}
                onClick={() => toggle(index)}
              >
                {day.slice(0, 3)}
                {selected.includes(index) ? <Check size={17} /> : <Circle size={13} />}
              </Button>
            ))}
          </div>
          <div className="schedule-summary" role="status">
            <CalendarDays />
            <div>
              <strong>{selected.length} training days selected</strong>
              <small>{selected.map((value) => weekdays[value]).join(' · ')}</small>
            </div>
          </div>
          <div>
            <h2>Assign workouts</h2>
            <p className="text-secondary">Rename the workout for each selected day.</p>
          </div>
        </>
      )}
      <div className="structure-list">
        {graph.days.map((entry, index) => (
          <DayStructure
            key={entry.day.id}
            entry={entry}
            graph={graph}
            index={index}
            busy={busy}
            run={run}
          />
        ))}
      </div>
      {cycle ? (
        <div className="cycle-add-actions">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(() =>
                createProgramDay(graph.program.id, {
                  name: `Workout Day ${workouts + 1}`,
                  kind: 'workout',
                }),
              )
            }
          >
            <Plus size={17} />
            Add Workout Day
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void run(() =>
                createProgramDay(graph.program.id, { name: 'Recovery', kind: 'recovery' }),
              )
            }
          >
            <Plus size={17} />
            Add Recovery Day
          </Button>
        </div>
      ) : null}
      <p className="builder-info">
        <Info size={16} />
        {cycle
          ? 'Use the day menu to duplicate, move or delete days.'
          : 'Unselected weekdays are treated as rest days.'}
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <BuilderFooter>
        <Button
          variant="primary"
          className="w-full"
          disabled={busy || !workouts}
          onClick={() =>
            void navigate(
              params.get('return') === 'review'
                ? reviewDestination(`/plan/${graph.program.id}`, params)
                : `/plan/${graph.program.id}/build/exercises`,
            )
          }
        >
          <NextLabel>
            {params.get('return') === 'review' ? 'Return to Review' : 'Next: Exercises'}
          </NextLabel>
        </Button>
      </BuilderFooter>
    </section>
  );
}

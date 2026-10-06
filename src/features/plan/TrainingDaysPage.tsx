import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Dumbbell,
  GripVertical,
  Info,
  Layers,
  MoreHorizontal,
  Plus,
  Pencil,
  Settings2,
} from 'lucide-react';
import { useLoaderData, useNavigate, useRevalidator, useSearchParams } from 'react-router-dom';
import type { Exercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';
import { programBuilder, weekdays } from './builderService';
import { programTemplates, type ProgramTemplateId } from './programTemplates';
import { UnsavedChanges } from './UnsavedChanges';
import { Button } from '../../components/ui/Button';
import { createProgramDay } from './programService';
import { DayIcon } from './PlanPrimitives';
import { estimatedProgramMinutes } from './programDisplay';
import { AddDaySheet } from './AddDaySheet';
import { DaySheet } from './DaySheet';

export function TrainingDaysPage() {
  const { graph, catalog } = useLoaderData<{ graph: ProgramGraph; catalog: Exercise[] }>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const cycle = graph.program.scheduleType === 'cycle';
  const recommended =
    graph.program.level === 'advanced'
      ? 'ppl-6'
      : graph.program.level === 'beginner' || graph.program.goal === 'general'
        ? 'full-body-3'
        : 'upper-lower-4';
  const current = programTemplates.find((item) => item.split === graph.program.splitTemplate)?.id;
  const [choice, setChoice] = useState<ProgramTemplateId | 'custom'>(
    graph.program.splitTemplate || graph.days.length ? (current ?? 'custom') : recommended,
  );
  const [params, setParams] = useSearchParams();
  const selecting =
    params.get('stage') === 'program' || (params.get('stage') !== 'schedule' && !graph.days.length);
  const setSelecting = (value: boolean) =>
    void setParams({ stage: value ? 'program' : 'schedule' });
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [selecting]);
  const [templateChanged, setTemplateChanged] = useState(
    !graph.days.length && !graph.program.splitTemplate,
  );
  const [selected, setSelected] = useState<number[]>(() =>
    graph.days.length
      ? graph.days.flatMap(({ day }) => (day.weekday == null ? [] : [day.weekday]))
      : programTemplates.find(({ id }) => id === recommended)!.days.map(({ weekday }) => weekday),
  );
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [options, setOptions] = useState<string | null>(null);
  const [optionsGraph, setOptionsGraph] = useState<ProgramGraph | null>(null);
  const pending = useRef(false);
  const committedNavigation = useRef(false);
  const template = programTemplates.find(({ id }) => id === choice);
  const catalogIds = new Set(catalog.map(({ id }) => id));
  const available =
    !template ||
    template.days.every(({ exercises }) =>
      exercises.every(({ exerciseId }) => catalogIds.has(exerciseId)),
    );
  const ordered = [...selected].sort((a, b) => a - b);
  const preview = templateChanged
    ? template
      ? cycle
        ? template.days
        : ordered.map((weekday, index) => ({
            ...template.days[index % template.days.length]!,
            weekday,
          }))
      : cycle
        ? []
        : ordered.map((weekday) => ({ name: weekdays[weekday]!, weekday, exercises: [] }))
    : [];
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
  const saveSchedule = async () => {
    if (templateChanged && template) {
      if (
        graph.days.length &&
        !window.confirm('Replace existing training days and targets? Workout history remains.')
      )
        return false;
      await programBuilder.applyTemplate(
        graph.program.id,
        template.id,
        graph.days.length > 0,
        cycle ? undefined : selected,
      );
    } else if (templateChanged && choice === 'custom') {
      if (
        graph.days.length &&
        !window.confirm(
          'Start a blank custom schedule? Existing days and targets will be replaced. Workout history remains.',
        )
      )
        return false;
      await programBuilder.useCustomTemplate(
        graph.program.id,
        cycle ? undefined : selected,
        graph.days.length > 0,
      );
    } else if (!cycle) {
      const removing =
        graph.days.some(({ day }) => day.weekday != null && !selected.includes(day.weekday)) ||
        graph.days.length > selected.length;
      if (
        removing &&
        !window.confirm('Remove deselected days and their prescriptions? History remains.')
      )
        return false;
      await programBuilder.chooseDays(
        graph.program.id,
        selected,
        templateChanged ? 'custom' : (graph.program.splitTemplate ?? 'custom'),
        true,
      );
    }
    setTemplateChanged(false);
    setDirty(false);
    return true;
  };
  const save = async () => {
    if (pending.current) return;
    await run(async () => {
      if (!(await saveSchedule())) return;
      const { getProgram } = await import('./programService');
      const saved = await getProgram(graph.program.id);
      const first = saved?.days[0]?.day;
      if (!first) throw new Error('Add at least one workout day.');
      committedNavigation.current = true;
      await navigate(`/plan/${graph.program.id}/days/${first.id}`);
    });
  };
  const openOptions = (index: number, rename = false) =>
    void run(async () => {
      if (dirty || templateChanged) {
        if (!(await saveSchedule())) return;
      }
      const { getProgram } = await import('./programService');
      const saved = await getProgram(graph.program.id);
      const entry = cycle
        ? saved?.days[index]
        : saved?.days.find(({ day }) => day.weekday === ordered[index]);
      if (entry && saved) {
        setOptionsGraph(saved);
        setRenaming(rename);
        setOptions(entry.day.id);
      }
    });
  const add = (recovery: boolean) =>
    void run(async () => {
      if (templateChanged && !(await saveSchedule())) return;
      const { getProgram } = await import('./programService');
      const saved = await getProgram(graph.program.id);
      await createProgramDay(graph.program.id, {
        name: recovery
          ? 'Recovery'
          : `Workout ${(saved?.days.filter(({ day }) => day.kind !== 'recovery').length ?? 0) + 1}`,
        kind: recovery ? 'recovery' : 'workout',
      });
    });
  const selectTemplate = (id: ProgramTemplateId | 'custom') => {
    if (id === choice) return;
    setChoice(id);
    setTemplateChanged(true);
    setDirty(true);
    if (!cycle)
      setSelected(
        id === 'custom'
          ? selected.length
            ? selected
            : [0, 2, 4]
          : programTemplates.find((item) => item.id === id)!.days.map((item) => item.weekday),
      );
  };
  const cycleWorkouts = templateChanged
    ? preview.length
    : graph.days.filter(({ day }) => day.kind !== 'recovery').length;
  const cycleRecovery = templateChanged
    ? 0
    : graph.days.filter(({ day }) => day.kind === 'recovery').length;
  return (
    <section className="builder-page schedule-page">
      <BuilderHeader
        title={graph.program.draft ? 'Create Program' : 'Edit Program'}
        back={`/plan/${graph.program.id}/edit`}
        step={selecting ? 1 : 2}
        programId={graph.program.id}
      />
      <UnsavedChanges
        dirty={dirty}
        saving={busy}
        committedNavigation={committedNavigation}
        allowSamePath
      />
      {selecting ? (
        <>
          <section className="template-selection">
            <h2>Choose a starting template</h2>
            <p className="builder-subtitle">Jumpstart with a template or build your own.</p>
            <div className="template-options">
              {[
                ...programTemplates,
                { id: 'custom' as const, name: 'Custom', context: 'Build your own routine' },
              ].map((item) => {
                const Icon =
                  item.id === 'custom' ? Settings2 : item.id === 'ppl-6' ? Layers : Dumbbell;
                return (
                  <button
                    key={item.id}
                    aria-pressed={choice === item.id}
                    disabled={busy}
                    onClick={() => selectTemplate(item.id)}
                    className="schedule-template"
                  >
                    <span className="builder-icon">
                      <Icon size={27} />
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.context}</small>
                    </span>
                    {item.id === recommended && (
                      <small className="schedule-recommended">Recommended</small>
                    )}
                    {choice === item.id ? (
                      <Check className="choice-check" size={18} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
          {choice === 'custom' && (
            <section className="builder-card custom-template">
              <h2>Custom template</h2>
              <p>Start with a blank schedule and add your own workouts.</p>
              <div>
                <Settings2 size={65} />
                <ul>
                  {[
                    'Fully customizable',
                    'Add any workout type',
                    'Set your own split & volume',
                  ].map((text) => (
                    <li key={text}>
                      <Check size={15} />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          <BuilderFooter>
            <Button
              variant="primary"
              className="w-full"
              disabled={busy || !available}
              onClick={() => setSelecting(false)}
            >
              Use {choice === 'custom' ? 'Custom Template' : template?.name}
            </Button>
          </BuilderFooter>
        </>
      ) : (
        <>
          <section className="builder-card starting-template">
            <h2>Program template</h2>
            <div>
              <span className="builder-icon">
                <Layers size={28} />
              </span>
              <span>
                <strong>{template?.name ?? 'Custom'}</strong>
                <small>{template?.context ?? 'Build your own routine'}</small>
              </span>
              <button onClick={() => setSelecting(true)} disabled={busy}>
                Change
              </button>
            </div>
          </section>
          {!cycle && (
            <section className="weekly-selection">
              <h2>Select training days</h2>
              <p className="builder-subtitle">Choose which days you want to train each week.</p>
              <div className="builder-week" role="group" aria-label="Training weekdays">
                {weekdays.map((day, index) => (
                  <button
                    key={day}
                    aria-label={day}
                    aria-pressed={selected.includes(index)}
                    className={selected.includes(index) ? 'is-selected' : ''}
                    disabled={busy}
                    onClick={() => {
                      setSelected((current) =>
                        current.includes(index)
                          ? current.filter((value) => value !== index)
                          : [...current, index],
                      );
                      setDirty(true);
                    }}
                  >
                    <span>{day.slice(0, 3)}</span>
                    {selected.includes(index) ? <Check size={18} /> : <Circle size={14} />}
                  </button>
                ))}
              </div>
              <div className="selected-day-summary">
                <CalendarDays size={30} />
                <div>
                  <strong>{selected.length} training days selected</strong>
                  <small>{ordered.map((index) => weekdays[index]).join(' · ')}</small>
                </div>
              </div>
            </section>
          )}
          <section className="schedule-assignment">
            <h2>{cycle ? 'Your cycle' : 'Assign workouts'}</h2>
            <p className="builder-subtitle">
              {cycle
                ? `${templateChanged ? preview.length : graph.days.length} days · ${cycleWorkouts} ${cycleWorkouts === 1 ? 'workout' : 'workouts'} · ${cycleRecovery} recovery ${cycleRecovery === 1 ? 'day' : 'days'}`
                : choice === 'custom'
                  ? 'Name your workouts here. Add exercises in the Exercises step.'
                  : 'Choose a workout for each selected day. You can rename each day.'}
            </p>
            <div className="cycle-overview">
              {templateChanged
                ? preview.map((day, index) => (
                    <div className="cycle-row" key={index}>
                      {cycle ? (
                        <>
                          <GripVertical size={16} />
                          <span className="day-number">{index + 1}</span>
                        </>
                      ) : (
                        <span className="assigned-weekday">{weekdays[day.weekday]}</span>
                      )}
                      <DayIcon name={day.name} />
                      <span className="day-row-copy">
                        <strong className="assigned-name">
                          {day.name}
                          {!cycle && (
                            <button
                              className="day-name-edit"
                              aria-label={`Rename ${day.name}`}
                              disabled={busy || !available}
                              onClick={() => openOptions(index, true)}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                        </strong>
                        <small>
                          {day.exercises.length}{' '}
                          {day.exercises.length === 1 ? 'exercise' : 'exercises'}
                          {estimatedProgramMinutes(day.exercises) == null
                            ? ''
                            : ` · ~${estimatedProgramMinutes(day.exercises)} min`}
                        </small>
                      </span>
                      <button
                        className="day-overflow"
                        disabled={busy || !available}
                        aria-label={`Options for ${day.name}`}
                        onClick={() => openOptions(index)}
                      >
                        {cycle ? <MoreHorizontal size={21} /> : <ChevronRight size={21} />}
                      </button>
                    </div>
                  ))
                : (cycle
                    ? graph.days
                    : ordered.map(
                        (weekday) =>
                          graph.days.find(({ day }) => day.weekday === weekday) ?? {
                            day: {
                              id: '',
                              name: weekdays[weekday]!,
                              weekday,
                              kind: 'workout' as const,
                            },
                            exercises: [],
                          },
                      )
                  ).map((entry, index) => (
                    <div
                      className={`cycle-row ${entry.day.kind === 'recovery' ? 'recovery-row' : ''}`}
                      key={entry.day.id || index}
                    >
                      {cycle ? (
                        <>
                          <GripVertical size={16} />
                          <span className="day-number">{index + 1}</span>
                        </>
                      ) : (
                        <span className="assigned-weekday">
                          {weekdays[entry.day.weekday ?? index]}
                        </span>
                      )}
                      <DayIcon name={entry.day.name} recovery={entry.day.kind === 'recovery'} />
                      <span className="day-row-copy">
                        <strong className="assigned-name">
                          {entry.day.name}
                          {!cycle && (
                            <button
                              className="day-name-edit"
                              aria-label={`Rename ${entry.day.name}`}
                              disabled={busy}
                              onClick={() => openOptions(index, true)}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                        </strong>
                        <small>
                          {entry.day.kind === 'recovery'
                            ? 'Rest day'
                            : `${entry.exercises.length} ${entry.exercises.length === 1 ? 'exercise' : 'exercises'}${estimatedProgramMinutes(entry.exercises) == null ? '' : ` · ~${estimatedProgramMinutes(entry.exercises)} min`}`}
                        </small>
                      </span>
                      {
                        <button
                          className="day-overflow"
                          disabled={busy}
                          aria-label={`Options for ${entry.day.name}`}
                          onClick={() => openOptions(index)}
                        >
                          {cycle ? <MoreHorizontal size={21} /> : <ChevronRight size={21} />}
                        </button>
                      }
                    </div>
                  ))}
            </div>
            {cycle && (
              <div className="add-day-actions">
                <button className="builder-add" disabled={busy} onClick={() => setAdding(true)}>
                  <Plus size={18} />
                  Add Workout Day
                </button>
                <button
                  className="builder-add recovery-add"
                  disabled={busy}
                  onClick={() => add(true)}
                >
                  <Plus size={18} />
                  Add Recovery Day
                </button>
              </div>
            )}
          </section>
          <p className="builder-info">
            <Info size={21} />
            {cycle
              ? 'Use the day menu to reorder days. There’s no limit — add as many days as you need.'
              : 'Unselected weekdays are treated as rest days.'}
          </p>
          <BuilderFooter>
            <Button
              variant="primary"
              className="w-full"
              disabled={
                busy ||
                (!cycle && !selected.length) ||
                (cycle &&
                  !(templateChanged
                    ? preview.length
                    : graph.days.some(({ day }) => day.kind !== 'recovery'))) ||
                !available
              }
              onClick={() => void save()}
            >
              <NextLabel>{busy ? 'Saving…' : 'Next: Exercises'}</NextLabel>
            </Button>
          </BuilderFooter>
        </>
      )}
      {!available && (
        <p role="alert">
          Some template exercises are unavailable. Choose Custom or reload the exercise library.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {adding && (
        <AddDaySheet
          initialWorkout
          blankOnly={choice === 'custom'}
          busy={busy}
          error={error}
          close={() => setAdding(false)}
          add={async (name, source, recovery) => {
            if (recovery) {
              return run(async () => {
                if (templateChanged && !(await saveSchedule()))
                  throw new Error('No days were changed.');
                await createProgramDay(graph.program.id, { name, kind: 'recovery' });
              });
            }
            return run(async () => {
              if (templateChanged && !(await saveSchedule()))
                throw new Error('No days were changed.');
              await programBuilder.addCycleWorkout(
                graph.program.id,
                name,
                choice === 'custom' ? undefined : source,
              );
            });
          }}
        />
      )}
      {options && optionsGraph && (
        <DaySheet
          key={options}
          initialView={renaming ? 'rename' : 'options'}
          graph={optionsGraph}
          dayId={options}
          close={() => setOptions(null)}
          changed={async () => {
            const { getProgram } = await import('./programService');
            const updated = await getProgram(graph.program.id);
            if (!cycle && updated)
              setSelected(
                updated.days.flatMap(({ day }) => (day.weekday == null ? [] : [day.weekday])),
              );
            await revalidator.revalidate();
          }}
        />
      )}
    </section>
  );
}

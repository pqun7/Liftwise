import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { Check, Circle, Dumbbell, ArrowUpDown, SlidersHorizontal, Info } from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';
import { programBuilder, weekdays, splitTemplates, type SplitTemplate } from './builderService';
import { UnsavedChanges } from './UnsavedChanges';

export function TrainingDaysPage() {
  const { graph } = useLoaderData<{ graph: ProgramGraph }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number[]>(() =>
    graph.days.length
      ? graph.days.slice(0, 7).map(({ day }, index) => day.weekday ?? index)
      : [0, 2, 4],
  );
  const [template, setTemplate] = useState<SplitTemplate>(
    graph.program.splitTemplate ?? (graph.days.length ? 'custom' : 'ppl'),
  );
  const [manualDays, setManualDays] = useState(graph.days.length > 0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!selected.length) {
      setError('Choose at least one training day.');
      return;
    }
    const available = graph.days.filter(
      ({ day }) => day.weekday == null || selected.includes(day.weekday),
    ).length;
    const removes = graph.days.length > selected.length || available < graph.days.length;
    if (
      removes &&
      !window.confirm(
        'Remove deselected training days and their prescriptions? Workout history will stay intact.',
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const saved = await programBuilder.chooseDays(graph.program.id, selected, template, removes);
      setDirty(false);
      await navigate(`/plan/${graph.program.id}/days/${saved!.days[0]!.day.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Days could not be saved. Existing data is unchanged.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="builder-page">
      <BuilderHeader
        title="Training Days"
        back={`/plan/${graph.program.id}/edit`}
        step={1}
        programId={graph.program.id}
      />
      <UnsavedChanges dirty={dirty} saving={busy} />
      <section className="builder-card builder-days-card">
        <h2>Select training days</h2>
        <p>
          Choose which days you want to train.
          <br />
          Unselected days are rest days.
        </p>
        <div className="builder-week" role="group" aria-label="Training weekdays">
          {weekdays.map((day, index) => (
            <button
              type="button"
              key={day}
              aria-label={day}
              aria-pressed={selected.includes(index)}
              className={selected.includes(index) ? 'is-selected' : ''}
              onClick={() => {
                setSelected((current) =>
                  current.includes(index)
                    ? current.filter((value) => value !== index)
                    : [...current, index],
                );
                setManualDays(true);
                setDirty(true);
              }}
            >
              <span>{day.slice(0, 3)}</span>
              {selected.includes(index) ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Circle size={15} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </section>
      <fieldset className="builder-card builder-splits">
        <legend className="sr-only">Split template</legend>
        <h2 aria-hidden="true">Split template</h2>
        {splitTemplates.map((split, index) => {
          const Icon = index === 1 ? ArrowUpDown : index === 3 ? SlidersHorizontal : Dumbbell;
          return (
            <label
              key={split.id}
              className={`builder-split${template === split.id ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="Split template"
                value={split.id}
                checked={template === split.id}
                onChange={() => {
                  setTemplate(split.id);
                  if (!manualDays && !graph.days.length && split.days.length)
                    setSelected([...split.days]);
                  setDirty(true);
                }}
              />
              <span className="builder-icon">
                <Icon size={23} aria-hidden="true" />
              </span>
              <span>
                <strong>{split.name}</strong>
                <small>{split.hint}</small>
              </span>
              {template === split.id ? (
                <Check size={19} aria-hidden="true" />
              ) : (
                <Circle size={19} aria-hidden="true" />
              )}
            </label>
          );
        })}
      </fieldset>
      <p className="builder-info">
        <Info size={17} aria-hidden="true" />
        You can customize exercises for each day next.
      </p>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <BuilderFooter>
        <button
          className="builder-primary"
          type="button"
          disabled={busy}
          onClick={() => void submit()}
        >
          <NextLabel>{busy ? 'Saving…' : 'Next: Add Exercises'}</NextLabel>
        </button>
      </BuilderFooter>
    </section>
  );
}

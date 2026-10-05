import { useRef, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import type { Exercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader, BuilderFooter, NextLabel } from './BuilderChrome';
import { programBuilder, weekdays } from './builderService';
import { programTemplates, type ProgramTemplateId } from './programTemplates';
import { UnsavedChanges } from './UnsavedChanges';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TemplatePreview } from './TemplateSelector';

export function TrainingDaysPage() {
  const { graph, catalog } = useLoaderData<{ graph: ProgramGraph; catalog: Exercise[] }>();
  const navigate = useNavigate();
  const recommended =
    graph.program.level === 'advanced'
      ? 'ppl-6'
      : graph.program.level === 'beginner' || graph.program.goal === 'general'
        ? 'full-body-3'
        : 'upper-lower-4';
  const [choice, setChoice] = useState<ProgramTemplateId | 'custom'>(
    graph.days.length ? 'custom' : recommended,
  );
  const [selected, setSelected] = useState<number[]>(() =>
    graph.days.length
      ? graph.days.map(({ day }, index) => day.weekday ?? index)
      : programTemplates.find(({ id }) => id === recommended)!.days.map(({ weekday }) => weekday),
  );
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const dayNames = ordered.map((day) => weekdays[day]!);
  const summary =
    dayNames.length === 1
      ? dayNames[0]
      : `${dayNames.slice(0, -1).join(', ')} and ${dayNames.at(-1)}`;
  const save = async () => {
    if (pending.current || !selected.length) return;
    const removing =
      graph.days.some(({ day }) => day.weekday != null && !selected.includes(day.weekday)) ||
      graph.days.length > selected.length;
    if (
      graph.days.length &&
      (template || removing) &&
      !window.confirm(
        template
          ? 'Replace existing training days and targets? Workout history remains.'
          : 'Remove deselected days and their prescriptions? History remains.',
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (template)
        await programBuilder.applyTemplate(
          graph.program.id,
          template.id,
          graph.days.length > 0,
          selected,
        );
      else await programBuilder.chooseDays(graph.program.id, selected, 'custom', true);
      committedNavigation.current = true;
      setDirty(false);
      await navigate(`/plan/${graph.program.id}`);
    } catch (failure) {
      committedNavigation.current = false;
      pending.current = false;
      setBusy(false);
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save. Your choices are preserved. Retry.',
      );
    }
  };
  return (
    <section className="builder-page">
      <BuilderHeader
        title="Schedule"
        back={`/plan/${graph.program.id}/edit`}
        step={1}
        programId={graph.program.id}
      />
      <UnsavedChanges dirty={dirty} saving={busy} committedNavigation={committedNavigation} />
      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">Choose a starting template</h2>
        <div className="grid gap-2" role="group" aria-label="Starting template">
          {[
            ...programTemplates,
            {
              id: 'custom' as const,
              name: 'Custom Schedule',
              context: 'Build your own routine',
              description: 'Choose your days and structure.',
            },
          ].map((item) => (
            <button
              key={item.id}
              className="schedule-template"
              aria-pressed={choice === item.id}
              disabled={busy}
              onClick={() => {
                setChoice(item.id);
                setSelected(
                  item.id === 'custom'
                    ? graph.days.length
                      ? graph.days.map(({ day }, index) => day.weekday ?? index)
                      : [0, 2, 4]
                    : programTemplates
                        .find(({ id }) => id === item.id)!
                        .days.map(({ weekday }) => weekday),
                );
                setDirty(true);
              }}
            >
              {choice === item.id ? (
                <Check size={20} aria-hidden="true" />
              ) : (
                <Circle size={20} aria-hidden="true" />
              )}
              <span>
                <strong>{item.name}</strong>
                <small>{item.context}</small>
                <small>
                  {item.id === 'full-body-3'
                    ? 'A balanced full-body routine.'
                    : item.id === 'upper-lower-4'
                      ? 'Split upper and lower body.'
                      : item.id === 'ppl-6'
                        ? 'Higher frequency and volume.'
                        : item.description}
                </small>
              </span>
              {item.id === recommended ? (
                <span className="schedule-recommended">Recommended</span>
              ) : null}
            </button>
          ))}
        </div>
      </Card>
      {template ? <TemplatePreview catalog={catalog} templateId={template.id} /> : null}
      <Card className="grid gap-3">
        <h2 className="text-lg font-bold">Training days</h2>
        <div className="schedule-weekdays" role="group" aria-label="Training weekdays">
          {weekdays.map((day, index) => (
            <Button
              key={day}
              className="flex-col !px-0 text-xs"
              variant={selected.includes(index) ? 'primary' : 'secondary'}
              aria-label={day}
              aria-pressed={selected.includes(index)}
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
              {day.slice(0, 3)}
              <span aria-hidden="true">{selected.includes(index) ? '✓' : '○'}</span>
            </Button>
          ))}
        </div>
        <p className="text-sm text-secondary" role="status">
          {selected.length
            ? `You'll train ${summary} — ${selected.length} ${selected.length === 1 ? 'day' : 'days'}/week.`
            : 'Choose at least one training day.'}
        </p>
      </Card>
      {!available ? (
        <p role="alert">
          Some template exercises are unavailable. Choose Custom Schedule or retry after loading the
          exercise library.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}
      <BuilderFooter>
        <Button
          variant="primary"
          className="w-full min-h-[54px]"
          disabled={busy || !selected.length || !available}
          onClick={() => void save()}
        >
          <NextLabel>{busy ? 'Saving…' : 'Next: Exercises'}</NextLabel>
        </Button>
      </BuilderFooter>
    </section>
  );
}

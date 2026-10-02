import { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import type { Exercise } from '../../domain/entities';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { BuilderHeader } from './BuilderChrome';
import { programBuilder, weekdays } from './builderService';
import { TemplateSelector } from './TemplateSelector';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function TrainingDaysPage() {
  const { graph, catalog } = useLoaderData<{ graph: ProgramGraph; catalog: Exercise[] }>();
  const navigate = useNavigate();
  const [custom, setCustom] = useState(graph.days.length > 0);
  const [selected, setSelected] = useState<number[]>(
    graph.days.length ? graph.days.map(({ day }, index) => day.weekday ?? index) : [0, 2, 4],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await navigate(`/plan/${graph.program.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not save. Existing data is unchanged.',
      );
      setBusy(false);
    }
  };
  return (
    <section className="grid gap-4">
      <BuilderHeader title="Training Days" back={`/plan/${graph.program.id}/edit`} />
      <TemplateSelector
        catalog={catalog}
        busy={busy}
        apply={(id) => {
          if (
            graph.days.length &&
            !window.confirm('Replace existing training days and targets? Workout history remains.')
          )
            return;
          void save(() =>
            programBuilder.applyTemplate(graph.program.id, id, graph.days.length > 0),
          );
        }}
      />
      <Button
        variant={custom ? 'outline' : 'secondary'}
        onClick={() => setCustom((value) => !value)}
        aria-pressed={custom}
      >
        Custom · Build your own schedule
      </Button>
      {custom ? (
        <Card className="grid gap-3">
          <h2 className="text-lg font-bold">Select training days</h2>
          <p className="text-xs text-secondary">
            Default workout names are weekdays. Rename them and add exercises in the editor.
          </p>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Training weekdays">
            {weekdays.map((weekday, index) => (
              <Button
                key={weekday}
                className="flex-col !px-0 text-xs"
                variant={selected.includes(index) ? 'primary' : 'secondary'}
                aria-label={weekday}
                aria-pressed={selected.includes(index)}
                disabled={busy}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(index)
                      ? current.filter((value) => value !== index)
                      : [...current, index],
                  )
                }
              >
                {weekday.slice(0, 3)}
                <span aria-hidden="true">{selected.includes(index) ? '✓' : '○'}</span>
              </Button>
            ))}
          </div>
          <Button
            variant="primary"
            disabled={busy || !selected.length}
            onClick={() => {
              if (
                (graph.days.length > selected.length ||
                  graph.days.some(
                    ({ day }) => day.weekday != null && !selected.includes(day.weekday),
                  )) &&
                !window.confirm('Remove deselected days and their prescriptions? History remains.')
              )
                return;
              void save(() =>
                programBuilder.chooseDays(graph.program.id, selected, 'custom', true),
              );
            }}
          >
            Next: Add Exercises
          </Button>
        </Card>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-secondary">
          {error}
        </p>
      ) : null}
    </section>
  );
}

import { useState } from 'react';
import type { Exercise } from '../../domain/entities';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { programTemplates, type ProgramTemplateId } from './programTemplates';
import { weekdays } from './builderService';

export function TemplateSelector({
  catalog,
  apply,
  busy,
}: {
  catalog: Exercise[];
  apply: (id: ProgramTemplateId) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<ProgramTemplateId | null>(null);
  const template = programTemplates.find((item) => item.id === selected);
  return (
    <Card className="grid gap-3" aria-label="Split templates">
      <h2 className="text-lg font-bold">Choose a starting template</h2>
      <p className="text-xs leading-relaxed text-secondary">
        Evidence-informed, editable defaults for healthy adults. Choose a routine that fits your
        experience and recovery.
      </p>
      <div className="grid gap-2">
        {programTemplates.map((item) => (
          <Button
            key={item.id}
            variant={selected === item.id ? 'outline' : 'secondary'}
            className="flex-col items-start text-left"
            aria-pressed={selected === item.id}
            disabled={busy}
            onClick={() => setSelected(item.id)}
          >
            <strong>{item.name}</strong>
            <span className="text-xs text-secondary">{item.context}</span>
          </Button>
        ))}
      </div>
      {template ? (
        <section aria-label={`${template.name} template preview`} className="grid gap-3">
          <h3 className="text-base font-bold">{template.name} preview</h3>
          <p className="text-xs text-secondary">{template.description}</p>
          {template.days.map((day) => (
            <div key={day.weekday} className="border-t border-border pt-2">
              <p className="text-sm font-semibold">
                {weekdays[day.weekday]} · {day.name}
              </p>
              <p className="text-xs text-secondary">{day.exercises.length} exercises</p>
              <ul className="mt-2 grid gap-1 text-xs text-secondary">
                {day.exercises.map((prescription) => (
                  <li key={prescription.exerciseId}>
                    {catalog.find((item) => item.id === prescription.exerciseId)?.name ??
                      'Exercise unavailable'}{' '}
                    · {prescription.targetSets} × {prescription.minReps}–{prescription.maxReps} ·
                    RIR {prescription.targetRirMin}–{prescription.targetRirMax} ·{' '}
                    {prescription.restSeconds}s
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Button
            variant="primary"
            disabled={
              busy ||
              template.days.some((day) =>
                day.exercises.some(
                  (exercise) => !catalog.some((record) => record.id === exercise.exerciseId),
                ),
              )
            }
            onClick={() => apply(template.id)}
          >
            Use This Template
          </Button>
        </section>
      ) : null}
    </Card>
  );
}

import type { Exercise } from '../../domain/entities';
import { programTemplates, type ProgramTemplateId } from './programTemplates';
import { weekdays } from './builderService';

/** Optional preview of the real prescriptions used by the next builder step. */
export function TemplatePreview({
  catalog,
  templateId,
}: {
  catalog: Exercise[];
  templateId: ProgramTemplateId;
}) {
  const template = programTemplates.find(({ id }) => id === templateId)!;
  const byId = new Map(catalog.map((item) => [item.id, item]));
  return (
    <details className="rounded-xl border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm text-mint">
        Preview {template.name}
      </summary>
      <section aria-label={`${template.name} template preview`} className="grid gap-3 pt-3">
        <p className="text-xs text-secondary">{template.description}</p>
        {template.days.map((day) => (
          <div key={day.weekday} className="border-t border-border pt-2">
            <h3 className="text-sm font-semibold">
              {weekdays[day.weekday]} · {day.name}
            </h3>
            <ul className="mt-2 grid gap-1 text-xs text-secondary">
              {day.exercises.map((item) => (
                <li key={item.exerciseId}>
                  {byId.get(item.exerciseId)?.name ?? 'Exercise unavailable'} · {item.targetSets} ×{' '}
                  {item.minReps}–{item.maxReps} · RIR {item.targetRirMin}–{item.targetRirMax} ·{' '}
                  {item.restSeconds}s
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </details>
  );
}

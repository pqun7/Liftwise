import { useRef, useState } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Dumbbell, Layers3, Settings2 } from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { Button } from '../../components/ui/Button';
import { BuilderFooter, BuilderHeader, NextLabel } from './BuilderChrome';
import { programTemplates, type ProgramTemplateId } from './programTemplates';
import { programBuilder, canReplaceStarter } from './builderService';
import { reviewDestination } from './reviewNavigation';

export function ProgramTemplatePage() {
  const { graph } = useLoaderData<{ graph: ProgramGraph }>();
  const recommended =
    graph.program.level === 'advanced'
      ? 'ppl-6'
      : graph.program.level === 'beginner' || graph.program.goal === 'general'
        ? 'full-body-3'
        : 'upper-lower-4';
  const [choice, setChoice] = useState<ProgramTemplateId | 'custom'>(
    programTemplates.find(({ split }) => split === graph.program.splitTemplate)?.id ??
      (graph.days.length ? 'custom' : recommended),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returning = params.get('return') === 'review';
  const preserved = graph.days.length > 0 && !canReplaceStarter(graph);
  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await programBuilder.selectTemplate(graph.program.id, choice);
      await navigate(
        returning
          ? reviewDestination(`/plan/${graph.program.id}`, params)
          : `/plan/${graph.program.id}/build/days`,
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save. Try again.');
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="builder-page template-page">
      <BuilderHeader
        title={graph.program.draft ? 'Create Program' : 'Edit Program'}
        back={`/plan/${graph.program.id}/edit`}
        step={1}
        programId={graph.program.id}
      />
      <div className="template-content">
        <h2>Choose a template</h2>
        <p className="text-secondary">Start with a template or build your own.</p>
        <div className="template-list" role="group" aria-label="Starting template">
          {[
            ...programTemplates,
            { id: 'custom' as const, name: 'Custom', context: 'Build your own routine' },
          ].map((item) => (
            <button
              className="template-choice"
              key={item.id}
              aria-pressed={choice === item.id}
              disabled={busy}
              onClick={() => setChoice(item.id)}
            >
              <span className="template-icon">
                {item.id === 'custom' ? (
                  <Settings2 />
                ) : item.id === 'ppl-6' ? (
                  <Layers3 />
                ) : (
                  <Dumbbell />
                )}
              </span>
              <span className="template-copy">
                <strong>{item.name}</strong>
                <small>{item.context}</small>
                {item.id === recommended ? (
                  <span className="schedule-recommended">Recommended</span>
                ) : null}
              </span>
              {choice === item.id ? (
                <span className="template-check">
                  <Check size={16} />
                </span>
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          ))}
        </div>
        <p className="builder-info">
          {choice === 'custom'
            ? 'Custom starts with empty workouts. Add your exercises in the Exercises step.'
            : 'This template includes editable starter exercises. Choose Custom to select every exercise yourself.'}
        </p>
        {preserved ? (
          <p className="builder-info">
            Your existing workouts, exercises and notes will be kept. Adjust their structure in
            Schedule.
          </p>
        ) : null}
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <BuilderFooter>
        <Button variant="primary" className="w-full" disabled={busy} onClick={() => void save()}>
          <NextLabel>
            {busy ? 'Saving…' : returning ? 'Save & return to Review' : 'Next: Schedule'}
          </NextLabel>
        </Button>
      </BuilderFooter>
    </section>
  );
}

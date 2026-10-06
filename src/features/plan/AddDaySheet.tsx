import { useEffect, useRef, useState } from 'react';
import { Bed, ChevronRight, Dumbbell, X } from 'lucide-react';
import { programTemplates, type ProgramTemplateId } from './programTemplates';

export function AddDaySheet({
  close,
  add,
  busy,
  error,
  blankOnly = false,
  initialWorkout = false,
}: {
  close: () => void;
  busy: boolean;
  error: string | null;
  blankOnly?: boolean;
  initialWorkout?: boolean;
  add: (
    name: string,
    source?: { templateId: ProgramTemplateId; index: number },
    recovery?: boolean,
  ) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [workout, setWorkout] = useState(initialWorkout);
  const [name, setName] = useState('Workout');
  const [choice, setChoice] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (workout) dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [workout]);
  const sources = programTemplates.flatMap((template) =>
    template.days.map((day, index) => ({
      key: `${template.id}:${index}`,
      templateId: template.id,
      index,
      day,
    })),
  );
  return (
    <dialog ref={dialog} className="plan-sheet" onCancel={close} aria-labelledby="add-day-title">
      <header>
        <h2 id="add-day-title">{workout ? 'Add Workout Day' : 'Add day'}</h2>
        <button onClick={close} aria-label="Close">
          <X size={21} />
        </button>
      </header>
      {workout ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const source = sources.find((item) => item.key === choice);
            void add(
              name.trim(),
              source ? { templateId: source.templateId, index: source.index } : undefined,
            ).then((ok) => {
              if (ok) close();
            });
          }}
        >
          <label>
            Workout name
            <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
          </label>
          {!blankOnly && (
            <label className="add-workout-template">
              Starting workout
              <select
                value={choice}
                onChange={(event) => {
                  const value = event.target.value;
                  setChoice(value);
                  const source = sources.find((item) => item.key === value);
                  if (source) setName(source.day.name);
                }}
              >
                <option value="">Build from scratch</option>
                {sources.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.day.name} · {source.day.exercises.length} exercises
                  </option>
                ))}
              </select>
            </label>
          )}
          {blankOnly && <p className="builder-subtitle">Add exercises in the Exercises step.</p>}
          <button className="builder-primary" disabled={busy || !name.trim()} type="submit">
            Add Workout Day
          </button>
        </form>
      ) : (
        <div className="add-day-choices">
          <button onClick={() => setWorkout(true)}>
            <span className="day-icon day-icon-blue">
              <Dumbbell size={27} />
            </span>
            <span>
              <strong>Add Workout Day</strong>
              <small>
                {blankOnly
                  ? 'Create a blank workout. Add exercises in the next step.'
                  : 'Choose a template or build from scratch.'}
              </small>
            </span>
            <ChevronRight size={20} />
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void add('Recovery', undefined, true).then((ok) => {
                if (ok) close();
              })
            }
          >
            <span className="day-icon day-icon-rest">
              <Bed size={27} />
            </span>
            <span>
              <strong>Add Recovery Day</strong>
              <small>Insert a rest day into your cycle.</small>
            </span>
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </dialog>
  );
}

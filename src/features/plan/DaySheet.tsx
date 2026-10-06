import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Pencil, Trash2, X } from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import {
  deleteProgramDay,
  duplicateProgramDay,
  moveProgramDay,
  updateProgramDay,
} from './programService';
export function DaySheet({
  graph,
  dayId,
  close,
  changed,
  initialView = 'options',
}: {
  graph: ProgramGraph;
  dayId: string;
  close: () => void;
  changed: () => void | Promise<void>;
  initialView?: 'options' | 'rename';
}) {
  const entry = graph.days.find(({ day }) => day.id === dayId)!;
  const index = graph.days.indexOf(entry);
  const [rename, setRename] = useState(initialView === 'rename');
  const [name, setName] = useState(entry.day.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (rename) dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [rename]);
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await changed();
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save. Try again.');
      setBusy(false);
    }
  };
  const weeklyLimit = graph.program.scheduleType !== 'cycle' && graph.days.length >= 7;
  return (
    <dialog
      ref={dialog}
      className="plan-sheet"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="day-sheet-title"
    >
      <header>
        <h2 id="day-sheet-title">{rename ? 'Rename workout' : 'Day options'}</h2>
        <button onClick={close} aria-label="Close">
          <X size={21} />
        </button>
      </header>
      {rename ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => updateProgramDay(dayId, { name: name.trim() }));
          }}
        >
          <label>
            Workout name
            <input
              autoFocus
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <small className="character-count">{name.length}/120</small>
          <p>Suggested names</p>
          <div className="suggested-names">
            {['Push A', 'Push B', 'Push', 'Upper Body', 'Chest', 'Shoulders'].map((text) => (
              <button type="button" key={text} onClick={() => setName(text)}>
                {text}
              </button>
            ))}
          </div>
          <button className="builder-primary" type="submit" disabled={busy || !name.trim()}>
            <Check size={17} />
            Save
          </button>
        </form>
      ) : (
        <div className="day-options">
          <button disabled={busy} onClick={() => setRename(true)}>
            <Pencil />
            Rename workout
          </button>
          <button
            disabled={busy || weeklyLimit}
            onClick={() =>
              void run(() =>
                duplicateProgramDay(
                  dayId,
                  graph.program.scheduleType === 'cycle'
                    ? undefined
                    : [0, 1, 2, 3, 4, 5, 6].find(
                        (weekday) => !graph.days.some(({ day }) => day.weekday === weekday),
                      ),
                ),
              )
            }
          >
            <Copy />
            Duplicate day
          </button>
          <button
            disabled={busy || graph.program.scheduleType !== 'cycle' || index === 0}
            onClick={() => void run(() => moveProgramDay(graph.program.id, dayId, -1))}
          >
            <ArrowUp />
            Move up
          </button>
          <button
            disabled={
              busy || graph.program.scheduleType !== 'cycle' || index === graph.days.length - 1
            }
            onClick={() => void run(() => moveProgramDay(graph.program.id, dayId, 1))}
          >
            <ArrowDown />
            Move down
          </button>
          <button
            className="danger-text"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Delete ${entry.day.name} and its prescriptions? Workout history remains.`,
                )
              )
                void run(() => deleteProgramDay(dayId));
            }}
          >
            <Trash2 />
            Delete day
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

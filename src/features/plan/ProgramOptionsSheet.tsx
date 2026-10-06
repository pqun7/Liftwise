import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Copy, Dumbbell, Eye, Pencil, Play, Trash2, X } from 'lucide-react';
import type { ProgramGraph } from '../../lib/storage/repositories/programRepository';
import { deleteProgram, duplicateProgram, setActiveProgram } from './programService';

export function ProgramOptionsSheet({
  graph,
  activeProgramId,
  close,
  changed,
}: {
  graph: ProgramGraph;
  activeProgramId: string | null;
  close: () => void;
  changed: () => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const base = `/plan/${graph.program.id}`;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await changed();
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save. Try again.');
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="plan-sheet"
      aria-labelledby="program-options-title"
      onCancel={close}
    >
      <header>
        <h2 id="program-options-title">Program options</h2>
        <button onClick={close} aria-label="Close">
          <X size={21} />
        </button>
      </header>
      <p className="builder-subtitle">{graph.program.name}</p>
      <div className="day-options">
        <Link to={`${base}/edit`}>
          <Pencil />
          Edit program
        </Link>
        <Link to={`${base}/build/days?stage=schedule`}>
          <CalendarDays />
          Edit schedule
        </Link>
        {graph.days[0] && (
          <Link to={`${base}/days/${graph.days[0].day.id}`}>
            <Dumbbell />
            Edit exercises
          </Link>
        )}
        <Link to={`${base}?tab=preview`}>
          <Eye />
          View program details
        </Link>
        {!graph.program.draft &&
          !graph.program.archived &&
          activeProgramId !== graph.program.id && (
            <button
              disabled={busy}
              onClick={() => void run(() => setActiveProgram(graph.program.id))}
            >
              <Play />
              Set as active
            </button>
          )}
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const copy = await duplicateProgram(graph.program.id);
              await navigate(`/plan/${copy.program.id}/edit`);
            })
          }
        >
          <Copy />
          Duplicate program
        </button>
        <button
          className="danger-text"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                `Delete "${graph.program.name}" and all planned days? Workout history remains.`,
              )
            )
              void run(() => deleteProgram(graph.program.id));
          }}
        >
          <Trash2 />
          Delete program
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </dialog>
  );
}

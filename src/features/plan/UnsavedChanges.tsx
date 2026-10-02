import { useEffect, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export function UnsavedChanges({ dirty, saving }: { dirty: boolean; saving: boolean }) {
  const blocker = useBlocker(dirty && !saving);
  const stay = useRef<HTMLButtonElement>(null);
  useBeforeUnload((event) => {
    if (dirty && !saving) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  useEffect(() => {
    if (blocker.state === 'blocked') stay.current?.focus();
  }, [blocker.state]);
  return blocker.state === 'blocked' ? (
    <aside className="builder-leave" role="alert" aria-label="Unsaved changes">
      <strong>Leave without saving these edits?</strong>
      <p>Previously saved program data stays on this device.</p>
      <div>
        <button ref={stay} type="button" onClick={() => blocker.reset()}>
          Keep editing
        </button>
        <button type="button" onClick={() => blocker.proceed()}>
          Leave
        </button>
      </div>
    </aside>
  ) : null;
}

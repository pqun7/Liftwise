import { useEffect, useRef, type RefObject } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export function UnsavedChanges({
  dirty,
  saving,
  onDiscard,
  committedNavigation,
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard?: () => void;
  committedNavigation?: RefObject<boolean>;
}) {
  // A successful save may navigate before React commits the saving/dirty state.
  const blocker = useBlocker(() => dirty && !saving && !committedNavigation?.current);
  const dialog = useRef<HTMLDialogElement>(null);
  useBeforeUnload((event) => {
    if (dirty && !saving && !committedNavigation?.current) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  useEffect(() => {
    if (blocker.state === 'blocked') dialog.current?.showModal();
    else dialog.current?.close();
  }, [blocker.state]);
  return (
    <dialog
      ref={dialog}
      className="plan-leave-dialog"
      aria-labelledby="discard-title"
      onCancel={(event) => {
        event.preventDefault();
        if (blocker.state === 'blocked') blocker.reset();
      }}
    >
      <h2 id="discard-title">Discard changes?</h2>
      <p>Previously saved program data stays on this device.</p>
      <div>
        <button
          type="button"
          autoFocus
          onClick={() => {
            dialog.current?.close();
            if (blocker.state === 'blocked') blocker.reset();
          }}
        >
          Keep Editing
        </button>
        <button
          type="button"
          onClick={() => {
            dialog.current?.close();
            if (blocker.state === 'blocked') {
              onDiscard?.();
              blocker.proceed();
            }
          }}
        >
          Discard
        </button>
      </div>
    </dialog>
  );
}

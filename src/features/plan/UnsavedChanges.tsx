import { useEffect, useRef, type RefObject } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export function UnsavedChanges({
  dirty,
  saving,
  onDiscard,
  committedNavigation,
  pendingSave,
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard?: () => void;
  committedNavigation?: RefObject<boolean>;
  pendingSave?: { unsettled: boolean; flush: () => Promise<void> };
}) {
  // A successful save may navigate before React commits the saving/dirty state.
  const blocker = useBlocker(
    () => ((dirty && !saving) || Boolean(pendingSave?.unsettled)) && !committedNavigation?.current,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useBeforeUnload((event) => {
    if ((dirty || pendingSave?.unsettled) && !committedNavigation?.current) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty && pendingSave) {
      let current = true;
      void pendingSave
        .flush()
        .then(() => {
          if (current) blocker.proceed();
        })
        .catch(() => {
          if (current) blocker.reset();
        });
      return () => {
        current = false;
      };
    }
    if (blocker.state === 'blocked') dialog.current?.showModal();
    else dialog.current?.close();
  }, [blocker, dirty, pendingSave]);
  return (
    <dialog
      ref={dialog}
      className="plan-leave-dialog ui-dialog"
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
          className="ui-button ui-button-secondary"
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
          className="ui-button ui-button-danger"
          onClick={() => {
            dialog.current?.close();
            if (blocker.state === 'blocked') {
              const proceed = () => {
                onDiscard?.();
                blocker.proceed();
              };
              if (pendingSave?.unsettled)
                void pendingSave
                  .flush()
                  .then(proceed)
                  .catch(() => blocker.reset());
              else proceed();
            }
          }}
        >
          Discard
        </button>
      </div>
    </dialog>
  );
}

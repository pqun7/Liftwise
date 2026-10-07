import { useEffect, useRef, type ReactNode } from 'react';

export function PlanSheet({
  children,
  labelId,
  close,
}: {
  children: ReactNode;
  labelId: string;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="plan-native-sheet"
      aria-labelledby={labelId}
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {children}
    </dialog>
  );
}

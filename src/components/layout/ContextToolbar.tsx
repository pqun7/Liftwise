import type { ReactNode } from 'react';

export function ContextToolbar({
  title,
  titleId,
  back,
  action,
}: {
  title: string;
  titleId?: string;
  back: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="context-toolbar">
      {back}
      <h1 id={titleId}>{title}</h1>
      {action ?? <span />}
    </header>
  );
}

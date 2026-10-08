import type { ReactNode } from 'react';
import { StreakBadge } from '../ui/StreakBadge';

export function AppHeader({
  title,
  titleId,
  currentStreak,
  action,
}: {
  title?: string | undefined;
  titleId?: string | undefined;
  currentStreak?: number | undefined;
  action?: ReactNode;
}) {
  return (
    <header className="app-header" aria-label="Liftwise application header">
      <div className="app-header-title">
        <StreakBadge currentStreak={currentStreak} />
        {title ? <h1 id={titleId}>{title}</h1> : null}
        {action}
      </div>
    </header>
  );
}

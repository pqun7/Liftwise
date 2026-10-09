import type { ReactNode } from 'react';
import { StreakBadge } from '../ui/StreakBadge';

export function AppHeader({
  title,
  titleId,
  currentStreak,
  action,
  showStreak = true,
}: {
  title?: string | undefined;
  titleId?: string | undefined;
  currentStreak?: number | undefined;
  action?: ReactNode;
  showStreak?: boolean;
}) {
  return (
    <header className="app-header" aria-label="Liftwise application header">
      {/* <div className="app-header-status">
      </div> */}
      <div className="app-header-title">
        {title ? <h1 id={titleId}>{title}</h1> : null}
        {showStreak || action ? (
          <div className="app-header-actions">
            {showStreak ? <StreakBadge currentStreak={currentStreak} /> : null}
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}

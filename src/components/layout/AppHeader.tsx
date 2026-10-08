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
      {/* <div className="app-header-status">
      </div> */}
      {title ? (
        <div className="app-header-title">
          <h1 id={titleId}>{title}</h1>
          {currentStreak !== undefined || action ? (
            <div className="app-header-actions">
              {currentStreak !== undefined ? <StreakBadge currentStreak={currentStreak} /> : null}
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

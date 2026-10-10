import type { ReactNode } from 'react';
import { Dumbbell } from 'lucide-react';
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
      <div className="app-header-brand-row">
        <span className="app-brand-mark" aria-hidden="true">
          <Dumbbell size={28} />
        </span>
        <div className="app-brand-copy">
          {titleId === 'home-title' ? (
            <h1 id={titleId}>Liftwise</h1>
          ) : (
            <span className="app-brand-name">Liftwise</span>
          )}
          <p>Your gym. Your plan. On your device.</p>
        </div>
        {showStreak || action ? (
          <div className="app-header-actions">
            {showStreak ? <StreakBadge currentStreak={currentStreak} compact /> : null}
            {action}
          </div>
        ) : null}
      </div>
      {title && titleId !== 'home-title' ? (
        <div className="app-header-title">
          <h1 id={titleId}>{title}</h1>
        </div>
      ) : null}
    </header>
  );
}

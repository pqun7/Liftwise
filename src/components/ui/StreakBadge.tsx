import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

export function StreakBadge({
  currentStreak,
  compact = false,
}: {
  currentStreak: number | undefined;
  compact?: boolean;
}) {
  const active = currentStreak !== undefined && currentStreak > 0;
  const label =
    currentStreak === undefined
      ? 'Workout streak unavailable'
      : active
        ? `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'} streak`
        : 'Workout streak';
  return (
    <Link
      to="/progress#streak"
      className={`streak-badge${active ? ' streak-badge-active' : ''}${compact ? ' streak-badge-compact' : ''}`}
      aria-label={label}
    >
      <Flame size={18} fill="currentColor" aria-hidden="true" />
      <span className="streak-badge-copy" aria-hidden="true">
        {compact
          ? (currentStreak ?? '—')
          : currentStreak === undefined
            ? 'Unavailable'
            : `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
      </span>
    </Link>
  );
}

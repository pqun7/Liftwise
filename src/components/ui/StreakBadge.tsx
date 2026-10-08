import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

export function StreakBadge({ currentStreak }: { currentStreak: number }) {
  const active = currentStreak > 0;
  const label = active
    ? `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'} streak`
    : 'Workout streak';
  return (
    <Link
      to="/progress#streak"
      className={`streak-badge${active ? ' streak-badge-active' : ''}`}
      aria-label={label}
    >
      <Flame size={18} fill="currentColor" aria-hidden="true" />
      <span className="streak-badge-copy" aria-hidden="true">
        {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
      </span>
    </Link>
  );
}

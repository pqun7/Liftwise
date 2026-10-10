import { ChevronRight, Flame, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import type { StreakStats } from '../../domain/streak';
import { StreakWeek } from './StreakWeek';

export function StreakCard({ streak }: { streak: StreakStats }) {
  return (
    <Card id="streak" padding="none" className="progress-streak p-4" aria-labelledby="streak-title">
      <Link to="/progress/history" className="streak-heading">
        <span className="streak-flame">
          <Flame size={26} fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <h2 id="streak-title">Streak</h2>
          <p>Stay consistent and build momentum.</p>
        </div>
        <ChevronRight size={19} aria-hidden="true" />
      </Link>
      <div className="streak-stats">
        <div className="streak-stat streak-current">
          <strong>{streak.currentStreak.toLocaleString()}</strong>
          <span>Current streak</span>
          <small>{streak.currentStreak === 1 ? 'day' : 'days'}</small>
        </div>
        <div className="streak-stat streak-best">
          <Trophy size={20} aria-hidden="true" />
          <strong>{streak.bestStreak.toLocaleString()}</strong>
          <span>Best streak</span>
          <small>{streak.bestStreak === 1 ? 'day' : 'days'}</small>
        </div>
        <div className="streak-stat streak-missed">
          <X size={21} aria-hidden="true" />
          <strong>{streak.missedDays.toLocaleString()}</strong>
          <span>Missed days</span>
          <small>in this period</small>
        </div>
      </div>
      <StreakWeek streak={streak} />
    </Card>
  );
}

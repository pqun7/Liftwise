import { Check, ChevronRight, Circle, Coffee, Flame, Star, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { dateFromKey } from '../../domain/localCalendar';
import type { StreakStats } from '../../domain/streak';

export function StreakCard({ streak }: { streak: StreakStats }) {
  return (
    <Card id="streak" padding="none" className="progress-streak" aria-labelledby="streak-title">
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
      <ol className="streak-week" aria-label="Current week workout streak">
        {streak.week.map((day) => {
          const date = dateFromKey(day.date);
          const label = date.toLocaleDateString('en', { weekday: 'short' });
          const description =
            day.status === 'today'
              ? 'Today, workout pending'
              : day.status === 'rest'
                ? `Rest day${day.isToday ? ', today' : ''}`
                : day.status === 'not-tracked'
                  ? 'Before tracking began'
                  : day.status;
          const Icon =
            day.status === 'completed'
              ? Check
              : day.status === 'missed'
                ? X
                : day.status === 'rest'
                  ? Coffee
                  : day.status === 'today'
                    ? Star
                    : Circle;
          return (
            <li
              key={day.date}
              className={`streak-day streak-day-${day.status}${day.isToday ? ' streak-day-current' : ''}`}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}: ${description}${day.isToday && day.status === 'completed' ? ', today' : ''}`}
            >
              <span>{label}</span>
              <span className="streak-day-circle">
                <Icon size={19} strokeWidth={3} aria-hidden="true" />
              </span>
              <span>{day.isToday ? 'Today' : label}</span>
            </li>
          );
        })}
      </ol>
      <div className="streak-legend" aria-hidden="true">
        <span>
          <i className="legend-workout" />
          Workout
        </span>
        <span>
          <i className="legend-missed" />
          Missed
        </span>
        <span>
          <i className="legend-rest" />
          Rest
        </span>
        <span>
          <Star size={11} />
          Today
        </span>
        <span>
          <i className="legend-future" />
          Future
        </span>
      </div>
    </Card>
  );
}

import { Star } from 'lucide-react';
import { dateFromKey } from '../../domain/localCalendar';
import type { StreakStats } from '../../domain/streak';
import { StreakDayIcon } from './StreakDayIcon';

export function StreakWeek({ streak }: { streak: StreakStats }) {
  return (
    <>
      <ol className="streak-week" aria-label="Current week workout streak">
        {streak.week.map((day) => {
          const date = dateFromKey(day.date);
          const label = date.toLocaleDateString('en', { weekday: 'short' });
          const description =
            day.status === 'today'
              ? 'Today, workout pending'
              : day.status === 'unscheduled'
                ? 'Unscheduled'
                : day.status === 'rest'
                  ? `Rest day${day.isToday ? ', today' : ''}`
                  : day.status === 'not-tracked'
                    ? 'Before tracking began'
                    : day.status;
          return (
            <li
              key={day.date}
              className={`streak-day streak-day-${day.status}${day.isToday ? ' streak-day-current' : ''}${day.connectedForward ? ` streak-day-connected streak-day-connected-${day.connectedForward}` : ''}`}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}: ${description}${day.isToday && day.status === 'completed' ? ', today' : ''}`}
            >
              <span>{label}</span>
              <span className="streak-day-circle">
                <StreakDayIcon status={day.status} />
              </span>
              <span>{day.isToday ? 'Today' : date.getDate()}</span>
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
    </>
  );
}

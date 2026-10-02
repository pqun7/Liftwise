import { Card } from '../ui/Card';
import { Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { HomeData } from '../../features/home/homeData';

export function WeeklyProgress({ data }: { data: HomeData }) {
  return (
    <Card className="grid gap-3 home-weekly" aria-labelledby="home-weekly-title">
      <Link className="home-section-header" to="/progress">
        <h2 id="home-weekly-title">Weekly Progress</h2>
        <span>
          {data.summary.workouts} completed
          <ChevronRight size={17} aria-hidden="true" />
        </span>
      </Link>
      <div className="home-week-bars" role="list" aria-label="Daily progress this week">
        {data.week.map((day) => {
          const height =
            day.kind === 'future' ? 18 : day.kind === 'rest' ? 34 : 30 + day.performance * 70;
          const status =
            day.kind === 'future'
              ? 'upcoming'
              : day.kind === 'rest'
                ? 'rest day'
                : day.completed
                  ? `${day.completed} completed workout${day.completed === 1 ? '' : 's'}, ${Math.round(day.performance * 100)} percent effort`
                  : day.isToday
                    ? 'training day, not completed yet'
                    : 'training day';
          return (
            <div key={day.key} role="listitem" aria-label={`${day.accessibleDate}: ${status}`}>
              <div
                className={`home-week-bar is-${day.kind}${day.completed ? ' is-completed' : ''}${day.isToday ? ' is-today' : ''}`}
                style={
                  {
                    '--progress-height': `${height}%`,
                    '--performance': day.performance,
                  } as CSSProperties
                }
              >
                <span className="home-week-fill">
                  {day.completed ? <Check size={13} aria-hidden="true" /> : null}
                </span>
              </div>
              <span>{day.label}</span>
            </div>
          );
        })}
      </div>
      <p className="sr-only">
        {data.summary.workouts} completed workouts this week, {data.summary.workingSets} working
        sets.
      </p>
    </Card>
  );
}

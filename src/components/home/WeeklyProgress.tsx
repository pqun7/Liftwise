import { Check, ChevronRight, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HomeData } from '../../features/home/homeData';

export function WeeklyProgress({ data }: { data: HomeData }) {
  return (
    <section className="home-surface home-weekly" aria-labelledby="home-weekly-title">
      <Link className="home-section-header" to="/progress">
        <h2 id="home-weekly-title">Weekly Progress</h2>
        <span>
          {data.summary.workouts} completed
          <ChevronRight size={17} aria-hidden="true" />
        </span>
      </Link>
      <div className="home-week-bars" aria-hidden="true">
        {data.week.map((day) => (
          <div key={day.key}>
            <div
              className={`home-week-bar${day.completed ? ' is-completed' : ''}${day.isToday ? ' is-today' : ''}`}
            >
              {day.completed ? (
                <span>
                  <Check size={14} />
                </span>
              ) : (
                <Circle size={19} />
              )}
            </div>
            <span>{day.label}</span>
          </div>
        ))}
      </div>
      <p className="sr-only">
        {data.summary.workouts} completed workouts this week, {data.summary.workingSets} working
        sets.
      </p>
    </section>
  );
}

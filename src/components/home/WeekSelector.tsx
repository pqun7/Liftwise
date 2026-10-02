import { Check, Circle } from 'lucide-react';
import type { HomeDay } from '../../features/home/homeData';

export function WeekSelector({
  days,
  selected,
  onSelect,
}: {
  days: HomeDay[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="home-week-scroll">
      <div className="home-week" role="group" aria-label="Select a day this week">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            className="home-day"
            aria-pressed={selected === day.key}
            aria-label={`${day.accessibleDate}${day.isToday ? ', today' : ''}, ${day.completed ? `${day.completed} completed workouts` : 'no completed workouts'}`}
            onClick={() => onSelect(day.key)}
          >
            <span>{day.label}</span>
            <strong>{day.date}</strong>
            {day.completed ? (
              <span className="home-day-check">
                <Check size={13} aria-hidden="true" />
              </span>
            ) : day.isToday ? (
              <span className="home-day-today" aria-hidden="true" />
            ) : (
              <Circle size={15} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

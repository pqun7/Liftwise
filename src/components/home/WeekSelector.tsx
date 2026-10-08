import { CalendarDayButton } from '../ui/CalendarDayButton';
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
        {days.map((day) => {
          const status = day.completed
            ? 'completed'
            : day.status === 'no-program' || day.status === 'unscheduled'
              ? day.kind === 'training'
                ? 'scheduled'
                : day.kind === 'future'
                  ? 'future'
                  : 'rest'
              : (day.status ?? (day.kind === 'training' ? 'scheduled' : day.kind));
          const caption =
            status === 'completed'
              ? 'Completed'
              : status === 'missed'
                ? 'Missed'
                : status === 'rest'
                  ? 'Rest'
                  : status === 'active'
                    ? 'Active'
                    : day.kind === 'future'
                      ? 'Upcoming'
                      : 'Scheduled';
          return (
            <CalendarDayButton
              key={day.key}
              label={day.label}
              date={day.date}
              today={day.isToday}
              selected={selected === day.key}
              status={status}
              future={day.kind === 'future'}
              accessibleLabel={
                day.accessibleDate +
                (day.isToday ? ', today' : '') +
                ', ' +
                (day.completed ? day.completed + ' completed workouts' : 'no completed workouts') +
                ', ' +
                caption
              }
              onSelect={() => onSelect(day.key)}
            />
          );
        })}
      </div>
      {/* <div className="home-week-legend" aria-label="Week status colors">
        <span>
          <CalendarDayMarker status="completed" />
          Completed
        </span>
        <span>
          <CalendarDayMarker status="rest" />
          Rest
        </span>
        <span>
          <CalendarDayMarker status="missed" />
          Missed
        </span>
        <span>
          <CalendarDayMarker status="future" />
          Upcoming
        </span>
      </div> */}
    </div>
  );
}

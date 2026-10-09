import { CalendarDayButton } from '../ui/CalendarDayButton';
import { calendarWeek, type HomeDay } from '../../features/home/homeData';
import type { trainingCalendar } from '../../domain/trainingCalendar';
export function WeekSelector({
  days,
  selected,
  onSelect,
  calendar,
  variant = 'compact',
}: {
  selected: string;
  onSelect: (date: string) => void;
  variant?: 'compact' | 'detailed';
} & (
  | { days: HomeDay[]; calendar?: ReturnType<typeof trainingCalendar> }
  | { days?: never; calendar: ReturnType<typeof trainingCalendar> }
)) {
  const week = days ?? calendarWeek(calendar, selected);
  return (
    <div className={`home-week-scroll ${variant === 'detailed' ? 'week-selector-detailed' : ''}`}>
      <div className="home-week" role="group" aria-label="Select a day this week">
        {week.map((day) => {
          const state = calendar?.getDayState(day.key);
          const training = !!state?.entry && state.entry.day.kind !== 'recovery';
          const workoutLabel = training ? state.entry!.day.name : calendar?.dated ? 'Rest' : '�';
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
              variant={variant}
              training={training}
              caption={variant === 'detailed' ? workoutLabel : undefined}
              accessibleLabel={
                day.accessibleDate +
                (day.isToday ? ', today' : '') +
                ', ' +
                (day.completed ? day.completed + ' completed workouts' : 'no completed workouts') +
                ', ' +
                caption +
                (variant === 'detailed' ? ', ' + workoutLabel : '')
              }
              onSelect={() => onSelect(day.key)}
            />
          );
        })}
      </div>
    </div>
  );
}

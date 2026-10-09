import { Check, Circle, Moon, X } from 'lucide-react';

export type CalendarDayStatus =
  | 'active'
  | 'completed'
  | 'scheduled'
  | 'rest'
  | 'future'
  | 'missed'
  | 'empty'
  | 'unscheduled'
  | 'no-program';
export function CalendarDayMarker({ status }: { status: CalendarDayStatus }) {
  return (
    <span className="calendar-day-marker" data-status={status} aria-hidden="true">
      {status === 'completed' ? (
        <Check size={14} />
      ) : status === 'rest' ? (
        <Moon size={14} />
      ) : status === 'missed' ? (
        <X size={14} />
      ) : (
        <Circle size={12} />
      )}
    </span>
  );
}
export function CalendarDayButton({
  label,
  date,
  accessibleLabel,
  today,
  selected,
  status,
  caption,
  future = false,
  onSelect,
  variant = 'compact',
  training,
}: {
  label: string;
  date: number;
  accessibleLabel: string;
  today: boolean;
  selected: boolean;
  status: CalendarDayStatus;
  caption?: string | undefined;
  future?: boolean;
  onSelect: () => void;
  variant?: 'compact' | 'detailed';
  training?: boolean;
}) {
  return (
    <button
      type="button"
      className="calendar-day"
      data-status={status}
      data-training={training ? 'true' : undefined}
      data-future={future || status === 'future' ? 'true' : undefined}
      aria-current={today ? 'date' : undefined}
      aria-pressed={selected}
      aria-label={accessibleLabel}
      onClick={onSelect}
    >
      <span>{label}</span>
      {variant === 'compact' ? <strong>{date}</strong> : null}
      {variant === 'compact' ? (
        <CalendarDayMarker status={status} />
      ) : (
        <span className="week-training-dot" aria-hidden="true" />
      )}
      {caption ? <small title={caption}>{caption}</small> : null}
    </button>
  );
}

import { Check, Circle, Coffee, Dumbbell, ListX, Play, Star, X } from 'lucide-react';
import type { CalendarDayStatus } from '../../components/ui/CalendarDayButton';
import type { StreakDayStatus } from '../../domain/streak';

export type StreakVisualStatus = CalendarDayStatus | StreakDayStatus;

export function StreakDayIcon({ status }: { status: StreakVisualStatus }) {
  const Icon =
    status === 'completed'
      ? Check
      : status === 'missed'
        ? X
        : status === 'rest'
          ? Coffee
          : status === 'today'
            ? Star
            : status === 'scheduled'
              ? Dumbbell
              : status === 'active'
                ? Play
                : status === 'empty'
                  ? ListX
                  : Circle;
  return <Icon size={19} strokeWidth={3} aria-hidden="true" />;
}

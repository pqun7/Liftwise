import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDuration } from '../../domain/workoutTime';
import { Dumbbell, SkipForward } from 'lucide-react';

// The session page derives remaining time from persisted timestamps; this view owns no clock.
export function RestTimer({
  remaining,
  onEnd,
  onAdd,
  duration = remaining,
  nextSet,
  disabled = false,
}: {
  remaining: number;
  onEnd: () => void;
  onAdd?: () => void;
  duration?: number;
  nextSet?: number | undefined;
  disabled?: boolean;
}) {
  return (
    <Card as="section" className="workout-rest-timer" aria-label="Rest timer">
      <div className="workout-rest-ring">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-border"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={264}
            strokeDashoffset={264 * (1 - Math.min(1, remaining / Math.max(1, duration)))}
            className="text-mint"
          />
        </svg>
        <Dumbbell
          size={23}
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-secondary"
        />
      </div>
      <div className="workout-rest-time">
        <span className="text-xs uppercase tracking-widest text-secondary">Rest</span>
        <strong className="text-3xl font-bold tabular-nums">
          {formatDuration(remaining).padStart(5, '0')}
        </strong>
        <span className="text-xs text-secondary">
          {remaining === 0
            ? 'Rest complete'
            : nextSet
              ? `Next: Set ${nextSet}`
              : 'Prepare for next exercise'}
        </span>
        <span role="status" className="sr-only">
          {remaining === 0 ? 'Rest complete. Ready for the next set.' : ''}
        </span>
      </div>
      <div className="workout-rest-actions">
        <div className="grid justify-items-center gap-1">
          {onAdd ? (
            <Button
              className="workout-rest-button"
              disabled={disabled}
              aria-label="Add 30 Seconds"
              onClick={onAdd}
            >
              +30
            </Button>
          ) : null}
          {onAdd ? <span className="text-[10px] text-secondary">Add 30s</span> : null}
        </div>
        <div className="grid justify-items-center gap-1">
          <Button
            disabled={disabled}
            aria-label={onAdd ? 'Skip Rest Timer' : 'End rest'}
            className="workout-rest-button"
            onClick={onEnd}
          >
            <SkipForward size={18} aria-hidden="true" />
          </Button>
          <span className="text-[10px] text-secondary">Skip</span>
        </div>
      </div>
    </Card>
  );
}

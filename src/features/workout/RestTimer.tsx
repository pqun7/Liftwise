import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDuration } from '../../domain/workoutTime';

// The session page derives remaining time from persisted timestamps; this view owns no clock.
export function RestTimer({ remaining, onEnd }: { remaining: number; onEnd: () => void }) {
  return (
    <Card
      as="div"
      className="rest-timer flex items-center justify-between gap-3"
      aria-live="polite"
    >
      <div className="grid gap-1">
        <span className="text-secondary">Rest</span>
        <strong className="text-2xl tabular-nums text-mint">{formatDuration(remaining)}</strong>
      </div>
      <Button onClick={onEnd}>End rest</Button>
    </Card>
  );
}

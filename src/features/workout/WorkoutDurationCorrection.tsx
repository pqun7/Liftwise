import { useState } from 'react';
import type { WorkoutSession } from '../../domain/entities';
import { workoutElapsedSeconds } from '../../domain/workoutTime';
import { Button } from '../../components/ui/Button';
import { correctWorkoutDuration } from './workoutService';

export function WorkoutDurationCorrection({
  session,
  busy,
  run,
}: {
  session: WorkoutSession;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(() =>
    String(Math.ceil(workoutElapsedSeconds(session) / 60)),
  );
  const value = Number(minutes);
  const valid = minutes.trim() !== '' && Number.isInteger(value) && value >= 0 && value <= 1440;
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        Correct workout duration (minutes)
        <input
          className="rounded-lg border border-border bg-surface p-2"
          type="number"
          min={0}
          max={1440}
          step={1}
          value={minutes}
          disabled={busy}
          onChange={(event) => setMinutes(event.target.value)}
        />
      </label>
      <Button
        disabled={busy || !valid}
        onClick={() => void run(() => correctWorkoutDuration(session.id, value * 60))}
      >
        Save duration
      </Button>
    </div>
  );
}

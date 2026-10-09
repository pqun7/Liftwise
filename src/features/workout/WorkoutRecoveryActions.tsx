import { useRef, useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { discardWorkout, finishWorkout } from './workoutService';

export function WorkoutRecoveryActions({
  sessionId,
  completedSets,
}: {
  sessionId: string;
  completedSets: number;
}) {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolve = async (discard: boolean) => {
    if (pending.current) return;
    if (
      !window.confirm(
        discard
          ? 'Discard this session? Recorded sets remain saved as a discarded record.'
          : `Finish this workout with ${completedSets} recorded sets? Unfinished sets will not count.`,
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (discard) {
        await discardWorkout(sessionId);
        await revalidate();
      } else {
        await finishWorkout(sessionId);
        await navigate(`/workout/${sessionId}`);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The session could not be saved. Please retry.',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2">
      <p className="text-sm text-secondary">
        Your recorded sets are saved. Continue, finish with what you recorded, or discard this
        session to start another.
      </p>
      <Button disabled={busy || completedSets === 0} onClick={() => void resolve(false)}>
        Finish recorded workout
      </Button>
      <Button variant="ghost" disabled={busy} onClick={() => void resolve(true)}>
        Discard saved workout
      </Button>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

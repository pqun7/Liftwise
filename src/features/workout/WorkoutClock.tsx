import { useEffect, useState } from 'react';
import type { WorkoutSession } from '../../domain/entities';
import {
  formatDuration,
  restRemainingSeconds,
  workoutElapsedSeconds,
} from '../../domain/workoutTime';
import { RestTimer } from './RestTimer';
import type { ComponentProps } from 'react';

function useWorkoutClock(running: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: number | undefined;
    const synchronize = () => {
      window.clearInterval(timer);
      setNow(Date.now());
      if (running && document.visibilityState === 'visible')
        timer = window.setInterval(() => setNow(Date.now()), 1_000);
    };
    synchronize();
    document.addEventListener('visibilitychange', synchronize);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', synchronize);
    };
  }, [running]);
  return now;
}

export function WorkoutElapsed({ session }: { session: WorkoutSession }) {
  const now = useWorkoutClock(session.status === 'active');
  return <>{formatDuration(workoutElapsedSeconds(session, now))}</>;
}

export function WorkoutRestClock({
  session,
  ...props
}: Omit<ComponentProps<typeof RestTimer>, 'remaining'> & { session: WorkoutSession }) {
  const now = useWorkoutClock(session.status === 'active');
  return <RestTimer {...props} remaining={restRemainingSeconds(session, now)} />;
}

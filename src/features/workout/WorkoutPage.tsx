import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/controlStyles';
import { Card } from '../../components/ui/Card';
import { MobilePage } from '../../components/layout/MobilePage';
import { useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';

import { PageIntro } from '../../components/PageIntro';
import { startPlannedWorkout, startQuickWorkout, type WorkoutLandingData } from './workoutService';

export function WorkoutPage() {
  const data = useLoaderData<WorkoutLandingData>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      await navigate(`/workout/${await action()}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Workout could not be started.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobilePage className="grid gap-4" aria-labelledby="workout-title">
      <PageIntro
        titleId="workout-title"
        eyebrow="Workout"
        title="Start training"
        description="Every set is saved locally as you go. No final Save button is required."
      />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {data.unfinished ? (
        <Card className="grid gap-2" aria-labelledby="continue-title">
          <p className="section-kicker">In progress</p>
          <h2 id="continue-title">{data.unfinished.name}</h2>
          <p>
            {data.unfinished.completedSets} / {data.unfinished.totalSets} sets completed
          </p>
          <Link className={buttonClasses('primary')} to={`/workout/${data.unfinished.id}`}>
            Resume Workout
          </Link>
        </Card>
      ) : (
        <Button
          variant="primary"
          className="min-h-[58px] flex-col"
          type="button"
          disabled={busy}
          onClick={() => void start(startQuickWorkout)}
        >
          <span>Start Quick Workout</span>
          <small>No program required</small>
        </Button>
      )}

      <Card className="grid gap-2" aria-labelledby="planned-title">
        <p className="section-kicker">Planned workout</p>
        <h2 id="planned-title">{data.activeProgram?.name ?? 'No active program'}</h2>
        {data.days.length ? (
          <div className="workout-day-list">
            {data.days.map((day) => (
              <Button
                type="button"
                key={day.id}
                disabled={busy || data.unfinished !== null}
                onClick={() => void start(() => startPlannedWorkout(day.id))}
              >
                <span>Day {day.order}</span>
                <strong>{day.name}</strong>
              </Button>
            ))}
          </div>
        ) : (
          <p>
            Create and activate a program in <Link to="/plan">Plan</Link>, or use Quick Workout.
          </p>
        )}
      </Card>

      {data.recent.length ? (
        <Card className="grid gap-2" aria-labelledby="history-title">
          <p className="section-kicker">History</p>
          <h2 id="history-title">Recent workouts</h2>
          <div className="workout-history-list">
            {data.recent.map((workout) => (
              <Link key={workout.id} to={`/workout/${workout.id}`}>
                <span>
                  <strong>{workout.name}</strong>
                  <small>{new Date(workout.startedAt).toLocaleDateString()}</small>
                </span>
                <span>
                  {workout.completedSets}/{workout.totalSets} sets
                </span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </MobilePage>
  );
}

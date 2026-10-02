import { ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import dumbbells from '../../assets/images/dumbbells.webp';
import { countLabel, workoutCompletion } from '../../features/home/homeData';
import type { WorkoutGraph } from '../../lib/storage/repositories/workoutRepository';

export function ActiveWorkoutCard({ workout }: { workout: WorkoutGraph }) {
  const completion = workoutCompletion(workout);
  const status = workout.session.status === 'paused' ? 'Paused' : 'In progress';
  const to = `/workout/${workout.session.id}`;
  const exerciseAnchor = workout.session.currentExerciseId ?? workout.exercises[0]?.exercise.id;
  return (
    <article className="home-hero home-hero-active" aria-labelledby="home-active-title">
      <img
        src={dumbbells}
        className="home-hero-image"
        alt=""
        width="1672"
        height="941"
        fetchPriority="high"
      />
      <div className="home-hero-content">
        <p className="home-active-status">
          <span aria-hidden="true" />
          {status}
        </p>
        <p className="sr-only">Unfinished workout found</p>
        <h2 id="home-active-title">{workout.session.name ?? 'Quick Workout'}</h2>
        <p className="home-hero-meta">
          {completion.completedExercises} of {countLabel(completion.exercises, 'exercise')} ·{' '}
          {countLabel(completion.remainingSets, 'set')} left
        </p>
        <div className="home-progress-row">
          <div
            className="home-progress-track"
            role="progressbar"
            aria-label="Completed workout sets"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion.percent}
          >
            <span style={{ width: `${completion.percent}%` }} />
          </div>
          <span>{completion.percent}%</span>
        </div>
        <div className="home-hero-actions">
          <Link className="home-primary" to={to}>
            <Play size={18} fill="currentColor" aria-hidden="true" />
            Continue Workout
          </Link>
          <Link
            className="home-secondary"
            to={exerciseAnchor ? `${to}#exercise-${exerciseAnchor}` : to}
          >
            View Details
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

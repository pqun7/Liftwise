import { Link } from 'react-router-dom';

import type { Exercise } from '../../domain/entities';
import { ExerciseImage } from './ExerciseImage';
import { formatExerciseValue } from './formatters';

export function ExerciseCard({ exercise }: Readonly<{ exercise: Exercise }>) {
  const preview = exercise.images.main ?? exercise.images.start;
  return (
    <article className="exercise-card">
      <ExerciseImage image={preview} className="exercise-card-image" />
      <div className="exercise-card-copy">
        <div className="exercise-card-heading">
          <h2>{exercise.name}</h2>
          {exercise.sourceProvider === 'custom' ? (
            <span className="source-chip">Custom</span>
          ) : null}
        </div>
        <p>
          {formatExerciseValue(exercise.primaryMuscles[0] ?? exercise.bodyPart)} ·{' '}
          {formatExerciseValue(exercise.equipment ?? (exercise.isBodyweight ? 'bodyweight' : null))}
        </p>
        <Link
          to={`/exercises/${encodeURIComponent(exercise.id)}`}
          aria-label={`View ${exercise.name}`}
        >
          View details <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

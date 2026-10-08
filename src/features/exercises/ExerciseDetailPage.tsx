import { useState } from 'react';
import { useScreenState } from '../../app/useScreenState';
import { ContextBackLink } from '../../components/ContextBackLink';
import { Link, useLoaderData, useNavigate, useLocation } from 'react-router-dom';

import type { Exercise } from '../../domain/entities';
import { ExerciseImage } from './ExerciseImage';
import { duplicateCatalogExercise } from './exerciseService';
import { formatExerciseValue } from './formatters';

interface DetailLoaderData {
  exercise: Exercise;
}

function DetailFact({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div className="detail-fact">
      <dt>{label}</dt>
      <dd>{formatExerciseValue(value)}</dd>
    </div>
  );
}

export function ExerciseDetailPage() {
  const { exercise } = useLoaderData<DetailLoaderData>();
  const navigate = useNavigate();
  const location = useLocation();
  const [pose, setPose] = useScreenState<'start' | 'peak'>('pose', 'start');
  const [duplicating, setDuplicating] = useState(false);
  const paired = exercise.images.start !== null && exercise.images.peak !== null;
  const displayedImage = paired ? exercise.images[pose] : exercise.images.main;

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const custom = await duplicateCatalogExercise(exercise.id);
      await navigate(`/exercises/${encodeURIComponent(custom.id)}`);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <article className="exercise-detail">
      <ContextBackLink fallback="/exercises" label="Exercise library" />
      <header className="exercise-detail-header">
        <p className="section-kicker">
          {exercise.sourceProvider === 'repdb' ? 'Built-in exercise' : 'Custom exercise'}
        </p>
        <h1>{exercise.name}</h1>
        {exercise.description ? <p>{exercise.description}</p> : null}
      </header>

      <section className="exercise-media" aria-label={`${exercise.name} illustration`}>
        <ExerciseImage image={displayedImage} className="exercise-detail-image" />
        {paired ? (
          <div className="pose-toggle" role="group" aria-label="Exercise position">
            <button type="button" aria-pressed={pose === 'start'} onClick={() => setPose('start')}>
              Start
            </button>
            <button type="button" aria-pressed={pose === 'peak'} onClick={() => setPose('peak')}>
              Peak
            </button>
          </div>
        ) : null}
      </section>

      <dl className="detail-facts">
        <DetailFact label="Primary muscles" value={exercise.primaryMuscles.join(', ')} />
        <DetailFact
          label="Secondary muscles"
          value={exercise.secondaryMuscles.length ? exercise.secondaryMuscles.join(', ') : null}
        />
        <DetailFact label="Equipment" value={exercise.equipment ?? 'bodyweight'} />
        <DetailFact label="Difficulty" value={exercise.difficulty} />
        <DetailFact label="Category" value={exercise.category} />
        <DetailFact label="Mechanic" value={exercise.mechanic} />
        <DetailFact label="Force" value={exercise.forceType} />
      </dl>

      {exercise.goals.length ? (
        <section className="detail-section ui-card">
          <h2>Goals</h2>
          <div className="tag-list">
            {exercise.goals.map((goal) => (
              <span key={goal}>{formatExerciseValue(goal)}</span>
            ))}
          </div>
        </section>
      ) : null}

      {exercise.instructions.length ? (
        <section className="detail-section ui-card readable-steps">
          <h2>How to perform</h2>
          <ol>
            {exercise.instructions.map((instruction, index) => (
              <li key={`${index}-${instruction}`}>{instruction}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {exercise.tips.length ? (
        <section className="detail-section ui-card tips-section">
          <h2>Tips</h2>
          <ul>
            {exercise.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {exercise.met ? (
        <p className="met-note">Estimated activity intensity: {exercise.met} MET</p>
      ) : null}

      {exercise.sourceProvider === 'repdb' ? (
        <button
          className="secondary-action ui-button ui-button-secondary"
          type="button"
          disabled={duplicating}
          onClick={() => void duplicate()}
        >
          {duplicating ? 'Creating…' : 'Duplicate as custom exercise'}
        </button>
      ) : exercise.notes ? (
        <section className="detail-section ui-card">
          <h2>Notes</h2>
          <p>{exercise.notes}</p>
        </section>
      ) : null}
      <Link
        className="compact-link ui-button ui-button-primary"
        to={`/progress/exercises/${encodeURIComponent(exercise.id)}`}
        state={{
          returnTo: location.pathname,
          returnKey: location.key,
          returnLabel: 'Exercise details',
        }}
      >
        View exercise history
      </Link>
    </article>
  );
}

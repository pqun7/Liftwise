import { ChevronRight, Dumbbell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { formatPrescription } from '../plan/prescriptionFormat';
import { formatPreviousSets } from './workoutFormat';
import type { WorkoutPreviewEntry } from './workoutService';

export function WorkoutPreview({ entries }: { entries: WorkoutPreviewEntry[] }) {
  const location = useLocation();
  return (
    <section aria-labelledby="preview-title" className="workout-preview grid gap-2">
      <SectionHeader
        title="Workout preview"
        id="preview-title"
        trailing={<span className="text-xs text-secondary">In workout order</span>}
      />
      <ol className="grid list-none gap-2 p-0">
        {entries.map(({ prescription, exercise, previous }, index) => {
          const images = exercise?.images;
          const content = (
            <>
              <span
                className="w-5 shrink-0 text-center text-sm font-semibold text-secondary"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {images ? (
                <ExerciseImage
                  key={exercise.id}
                  image={images.start ?? images.main ?? images.peak ?? null}
                  className="workout-preview-image"
                />
              ) : (
                <span className="workout-preview-image flex items-center justify-center text-secondary">
                  <Dumbbell aria-hidden="true" size={24} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-snug">
                  {exercise?.name ?? 'Unavailable exercise'}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-secondary">
                  {formatPrescription(prescription)}
                </p>
                {previous ? (
                  <p className="mt-1 text-xs text-muted">
                    Last:{' '}
                    {formatPreviousSets(previous.sets.filter((set) => set.completed).slice(-1))}
                  </p>
                ) : null}
                {!exercise ? (
                  <p className="mt-1 text-xs text-secondary">
                    Reference preserved. Review this exercise in Plan before starting.
                  </p>
                ) : null}
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
            </>
          );
          return (
            <li key={prescription.id}>
              <Card as="article" padding="none">
                {exercise ? (
                  <Link
                    to={`/exercises/${encodeURIComponent(exercise.id)}`}
                    state={{
                      returnTo: location.pathname + location.search,
                      returnKey: location.key,
                      returnLabel: 'Workout',
                    }}
                    aria-label={`${index + 1}. ${exercise.name} — exercise details`}
                    className="workout-preview-row"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="workout-preview-row">{content}</div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

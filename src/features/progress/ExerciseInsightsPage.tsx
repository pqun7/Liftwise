import { Link, useLoaderData, useSearchParams } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { MobilePage } from '../../components/layout/MobilePage';
import type { exercisePickerLoader } from './loaders';
import { focus, ProgressHeader, progressLayout, surface } from './ProgressUI';
export function ExerciseInsightsPage() {
  const { exercises } = useLoaderData<Awaited<ReturnType<typeof exercisePickerLoader>>>();
  const [params] = useSearchParams();
  const records = params.get('records') === '1';
  return (
    <MobilePage className={progressLayout}>
      <ProgressHeader
        title={records ? 'Personal Records' : 'Exercise Insights'}
        description={
          records
            ? 'Choose an exercise to see your all-time bests.'
            : 'Analyze performance and trends for each exercise.'
        }
      />
      <h2 className="text-sm font-bold">Choose an exercise</h2>
      {!exercises.length && (
        <p className={`${surface} p-5 text-secondary`}>No completed exercise sessions yet.</p>
      )}
      <ul className="grid list-none gap-2 p-0">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <Link
              to={`/progress/exercises/${encodeURIComponent(exercise.id)}${records ? '?range=ALL#personal-records' : ''}`}
              className={`${surface} ${focus} flex min-h-14 items-center gap-3 p-3 text-primary no-underline`}
            >
              <Dumbbell size={22} className="text-mint" />
              <span className="flex-1 text-sm font-semibold">{exercise.name}</span>
              <ChevronRight size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </MobilePage>
  );
}

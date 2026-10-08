import { useScreenState } from '../../app/useScreenState';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';

import type { Exercise } from '../../domain/entities';
import {
  searchExercises,
  uniqueExerciseFilterValues,
  type ExerciseFilters,
} from '../../domain/exerciseSearch';
import { formatExerciseValue } from '../exercises/formatters';
import type { HydratedProgramDay } from './programService';
import { BuilderHeader } from './BuilderChrome';
import { Button } from '../../components/ui/Button';
import { createPrescription } from './programService';
import { targetDefaults } from './programTemplates';
import { ExerciseImage } from '../exercises/ExerciseImage';
import { reviewSuffix } from './reviewNavigation';

interface PickerData {
  day: HydratedProgramDay;
  exercises: Exercise[];
}

function SelectFilter({
  label,
  value,
  values,
  change,
}: Readonly<{ label: string; value: string; values: string[]; change: (value: string) => void }>) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => change(event.target.value)}>
        <option value="">All</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {formatExerciseValue(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ExercisePickerPage() {
  const { day, exercises } = useLoaderData<PickerData>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const returnTo =
    params.get('return') === 'editor'
      ? `/plan/${day.program.id}?tab=edit#day-${day.day.id}`
      : `/plan/${day.program.id}/days/${day.day.id}${reviewSuffix(params)}`;
  const [error, setError] = useState<string | null>(null);
  const add = async (exercise: Exercise) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await createPrescription(
        day.day.id,
        exercise.id,
        exercise.mechanic === 'isolation' ? targetDefaults.isolation : targetDefaults.compound,
      );
      await navigate(returnTo, { replace: true });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not add exercise. Retry.');
      setBusy(false);
      pending.current = false;
    }
  };
  const [query, setQuery] = useScreenState('query', '');
  const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useScreenState<ExerciseFilters>('filters', {});
  const options = useMemo(
    () => ({
      bodyParts: uniqueExerciseFilterValues(exercises, (exercise) => exercise.bodyPart),
      muscles: uniqueExerciseFilterValues(exercises, (exercise) => exercise.primaryMuscles),
      equipment: uniqueExerciseFilterValues(exercises, (exercise) => exercise.equipment),
      difficulties: uniqueExerciseFilterValues(exercises, (exercise) => exercise.difficulty),
      categories: uniqueExerciseFilterValues(exercises, (exercise) => exercise.category),
      goals: uniqueExerciseFilterValues(exercises, (exercise) => exercise.goals),
    }),
    [exercises],
  );
  const results = useMemo(
    () => searchExercises(exercises, deferredQuery, filters).slice(0, 50),
    [deferredQuery, exercises, filters],
  );
  const setFilter = (key: keyof ExerciseFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  const base = `/plan/${day.program.id}/days/${day.day.id}/exercises/add`;
  return (
    <section className="builder-page" aria-labelledby="picker-title">
      <BuilderHeader title="Add Exercise" back={returnTo} />
      <Link className="back-link" to={returnTo}>
        ← {day.day.name}
      </Link>
      <header className="program-header">
        <p className="section-kicker">Add exercise</p>
        <h1 id="picker-title">Add to {day.day.name}</h1>
        <p>
          {day.day.weekday == null
            ? 'Unscheduled'
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
                day.day.weekday
              ]}{' '}
          · Targets are prefilled and editable.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </header>
      <label className="search-field">
        <span className="sr-only">Search exercises</span>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises"
          autoComplete="off"
        />
      </label>
      <details className="filter-panel ui-card ui-card-subtle">
        <summary>Filters</summary>
        <div className="filter-grid">
          <SelectFilter
            label="Body part"
            value={filters.bodyPart ?? ''}
            values={options.bodyParts}
            change={(value) => setFilter('bodyPart', value)}
          />
          <SelectFilter
            label="Primary muscle"
            value={filters.primaryMuscle ?? ''}
            values={options.muscles}
            change={(value) => setFilter('primaryMuscle', value)}
          />
          <SelectFilter
            label="Equipment"
            value={filters.equipment ?? ''}
            values={options.equipment}
            change={(value) => setFilter('equipment', value)}
          />
          <SelectFilter
            label="Difficulty"
            value={filters.difficulty ?? ''}
            values={options.difficulties}
            change={(value) => setFilter('difficulty', value)}
          />
          <SelectFilter
            label="Category"
            value={filters.category ?? ''}
            values={options.categories}
            change={(value) => setFilter('category', value)}
          />
          <SelectFilter
            label="Goal"
            value={filters.goal ?? ''}
            values={options.goals}
            change={(value) => setFilter('goal', value)}
          />
        </div>
      </details>
      <p className="result-count" aria-live="polite">
        Showing {results.length} matching exercises
      </p>
      <div className="picker-list">
        {!results.length ? (
          <p className="builder-empty">
            No exercises found. Try another search or clear the filters.
          </p>
        ) : null}
        {results.map((exercise) => (
          <article
            key={exercise.id}
            className="grid gap-2 rounded-[18px] border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-3">
              <ExerciseImage
                image={exercise.images.start ?? exercise.images.main ?? null}
                className="!h-14 !w-14 rounded-xl object-contain"
              />
              <Button
                variant="ghost"
                className="flex-1 flex-col items-start text-left"
                disabled={busy || day.exercises.some((entry) => entry.exercise.id === exercise.id)}
                aria-label={`Add ${exercise.name} to ${day.day.name}`}
                onClick={() => void add(exercise)}
              >
                <div>
                  <strong>{exercise.name}</strong>
                  <span>
                    {formatExerciseValue(exercise.primaryMuscles[0] ?? exercise.bodyPart)} ·{' '}
                    {formatExerciseValue(exercise.equipment ?? 'bodyweight')}
                  </span>
                </div>
                <span className="text-xs text-mint">
                  {day.exercises.some((entry) => entry.exercise.id === exercise.id)
                    ? 'Already on this day'
                    : '+ Add with default target'}
                </span>
              </Button>
            </div>
            <Link
              className="flex min-h-11 items-center text-xs text-secondary"
              to={`${base}/${encodeURIComponent(exercise.id)}${params.get('return') === 'editor' ? '?return=editor' : reviewSuffix(params)}`}
            >
              Configure {exercise.name} before adding
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

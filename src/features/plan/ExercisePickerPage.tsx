import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useLoaderData } from 'react-router-dom';

import type { Exercise } from '../../domain/entities';
import {
  searchExercises,
  uniqueExerciseFilterValues,
  type ExerciseFilters,
} from '../../domain/exerciseSearch';
import { formatExerciseValue } from '../exercises/formatters';
import type { HydratedProgramDay } from './programService';

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
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useState<ExerciseFilters>({});
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
    <section className="page-stack" aria-labelledby="picker-title">
      <Link className="back-link" to={`/plan/${day.program.id}/days/${day.day.id}`}>
        ← {day.day.name}
      </Link>
      <header className="program-header">
        <p className="section-kicker">Add exercise</p>
        <h1 id="picker-title">Choose a movement</h1>
        <p>Built-in and custom exercises use the same stable Liftwise reference.</p>
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
      <details className="filter-panel">
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
        {results.map((exercise) => (
          <Link
            className="picker-row"
            key={exercise.id}
            to={`${base}/${encodeURIComponent(exercise.id)}`}
          >
            <div>
              <strong>{exercise.name}</strong>
              <span>
                {formatExerciseValue(exercise.primaryMuscles[0] ?? exercise.bodyPart)} ·{' '}
                {formatExerciseValue(exercise.equipment ?? 'bodyweight')}
              </span>
            </div>
            <span aria-hidden="true">＋</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

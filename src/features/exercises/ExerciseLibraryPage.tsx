import { useScreenState } from '../../app/useScreenState';
import { Input, Select } from '../../components/ui/FormControl';
import { Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { Link, useLoaderData, useSearchParams } from 'react-router-dom';

import type { Exercise } from '../../domain/entities';
import {
  searchExercises,
  uniqueExerciseFilterValues,
  type ExerciseFilters,
} from '../../domain/exerciseSearch';
import { ExerciseCard } from './ExerciseCard';
import { formatExerciseValue } from './formatters';

const PAGE_SIZE = 40;

interface LibraryLoaderData {
  exercises: Exercise[];
}

interface FilterSelectProps {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, values, onChange }: FilterSelectProps) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {formatExerciseValue(option)}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function ExerciseLibraryPage() {
  const { exercises } = useLoaderData<LibraryLoaderData>();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useScreenState(
    `query:${searchParams.toString()}`,
    () => searchParams.get('q') ?? '',
  );
  const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useScreenState<ExerciseFilters>(
    `filters:${searchParams.toString()}`,
    () => {
      const bodyPart = searchParams.get('bodyPart');
      return bodyPart ? { bodyPart } : {};
    },
  );
  const [visibleCount, setVisibleCount] = useScreenState('count', PAGE_SIZE);

  const options = useMemo(
    () => ({
      bodyParts: uniqueExerciseFilterValues(exercises, (exercise) => exercise.bodyPart),
      muscles: uniqueExerciseFilterValues(exercises, (exercise) => exercise.primaryMuscles),
      equipment: uniqueExerciseFilterValues(exercises, (exercise) => exercise.equipment),
      difficulty: uniqueExerciseFilterValues(exercises, (exercise) => exercise.difficulty),
      categories: uniqueExerciseFilterValues(exercises, (exercise) => exercise.category),
      goals: uniqueExerciseFilterValues(exercises, (exercise) => exercise.goals),
    }),
    [exercises],
  );
  const results = useMemo(
    () => searchExercises(exercises, deferredQuery, filters),
    [deferredQuery, exercises, filters],
  );

  const resultKey = JSON.stringify([deferredQuery, filters]);
  const previousResults = useRef(resultKey);
  useEffect(() => {
    if (previousResults.current !== resultKey) setVisibleCount(PAGE_SIZE);
    previousResults.current = resultKey;
  }, [resultKey, setVisibleCount]);

  const setFilter = (key: keyof ExerciseFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  return (
    <section className="page-stack exercise-library" aria-labelledby="exercise-library-title">
      <p className="type-body text-secondary">Browse your offline exercise catalog.</p>
      <div className="library-actions">
        <label className="search-field">
          <span className="sr-only">Search exercises</span>
          <Search size={20} strokeWidth={1.7} className="text-mint" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            autoComplete="off"
          />
        </label>
        <Link className="compact-link ui-button ui-button-primary" to="/exercises/new">
          + Custom
        </Link>
      </div>
      <details className="filter-panel ui-card ui-card-subtle">
        <summary>Filters</summary>
        <div className="filter-grid">
          <FilterSelect
            label="Body part"
            value={filters.bodyPart ?? ''}
            values={options.bodyParts}
            onChange={(value) => setFilter('bodyPart', value)}
          />
          <FilterSelect
            label="Primary muscle"
            value={filters.primaryMuscle ?? ''}
            values={options.muscles}
            onChange={(value) => setFilter('primaryMuscle', value)}
          />
          <FilterSelect
            label="Equipment"
            value={filters.equipment ?? ''}
            values={options.equipment}
            onChange={(value) => setFilter('equipment', value)}
          />
          <FilterSelect
            label="Difficulty"
            value={filters.difficulty ?? ''}
            values={options.difficulty}
            onChange={(value) => setFilter('difficulty', value)}
          />
          <FilterSelect
            label="Category"
            value={filters.category ?? ''}
            values={options.categories}
            onChange={(value) => setFilter('category', value)}
          />
          <FilterSelect
            label="Goal"
            value={filters.goal ?? ''}
            values={options.goals}
            onChange={(value) => setFilter('goal', value)}
          />
        </div>
        {Object.values(filters).some(Boolean) ? (
          <button className="text-button" type="button" onClick={() => setFilters({})}>
            Clear filters
          </button>
        ) : null}
      </details>
      <p className="result-count" aria-live="polite">
        {results.length} exercise{results.length === 1 ? '' : 's'}
      </p>
      <div className="exercise-list">
        {results.slice(0, visibleCount).map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
      {results.length === 0 ? (
        <div className="empty-state">
          <h2>No matching exercises</h2>
          <p>Try a broader search or clear one of the filters.</p>
        </div>
      ) : null}
      {visibleCount < results.length ? (
        <button
          className="load-more-button ui-button ui-button-primary"
          type="button"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Show more
        </button>
      ) : null}
    </section>
  );
}

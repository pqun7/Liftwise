import type { Exercise } from './entities';

export interface ExerciseFilters {
  bodyPart?: string;
  primaryMuscle?: string;
  equipment?: string;
  difficulty?: string;
  category?: string;
  goal?: string;
}

export function normalizeExerciseSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createExerciseSearchText(exercise: {
  name: string;
  bodyPart: string | null;
  equipment: string | null;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  goals: readonly string[];
  tags: readonly string[];
}): string {
  return normalizeExerciseSearchText(
    [
      exercise.name,
      exercise.bodyPart,
      exercise.equipment,
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
      ...exercise.goals,
      ...exercise.tags,
    ]
      .filter((value): value is string => value !== null)
      .join(' '),
  );
}

export function searchExercises(
  exercises: readonly Exercise[],
  query: string,
  filters: ExerciseFilters = {},
): Exercise[] {
  const normalizedQuery = normalizeExerciseSearchText(query);

  return exercises.filter((exercise) => {
    if (!exercise.isActive) return false;
    if (normalizedQuery && !exercise.searchText.includes(normalizedQuery)) return false;
    if (filters.bodyPart && exercise.bodyPart !== filters.bodyPart) return false;
    if (filters.primaryMuscle && !exercise.primaryMuscles.includes(filters.primaryMuscle)) {
      return false;
    }
    if (filters.equipment && exercise.equipment !== filters.equipment) return false;
    if (filters.difficulty && exercise.difficulty !== filters.difficulty) return false;
    if (filters.category && exercise.category !== filters.category) return false;
    if (filters.goal && !exercise.goals.includes(filters.goal)) return false;
    return true;
  });
}

export function uniqueExerciseFilterValues(
  exercises: readonly Exercise[],
  selector: (exercise: Exercise) => string | readonly string[] | null,
): string[] {
  const values = new Set<string>();
  for (const exercise of exercises) {
    const selected = selector(exercise);
    if (typeof selected === 'string') values.add(selected);
    else if (selected !== null) {
      for (const value of selected) values.add(value);
    }
  }
  return [...values].sort((left, right) => left.localeCompare(right));
}

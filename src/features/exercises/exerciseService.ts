import type { Exercise } from '../../domain/entities';
import { database } from '../../lib/storage/database';
import { ExerciseRepository } from '../../lib/storage/repositories/exerciseRepository';
import { initializeRepdbCatalog } from '../../data/providers/repdb/initialize';

const repository = new ExerciseRepository(database);

export async function listCatalogExercises(): Promise<Exercise[]> {
  await initializeRepdbCatalog(database);
  return repository.list();
}

export async function getCatalogExercise(id: string): Promise<Exercise | undefined> {
  await initializeRepdbCatalog(database);
  return repository.get(id);
}

export async function createCustomExercise(input: {
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string | null;
  notes: string | null;
}): Promise<Exercise> {
  await initializeRepdbCatalog(database);
  return repository.create(input);
}

export async function duplicateCatalogExercise(id: string): Promise<Exercise> {
  await initializeRepdbCatalog(database);
  return repository.duplicateAsCustom(id);
}

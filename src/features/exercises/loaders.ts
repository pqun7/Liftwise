import type { LoaderFunctionArgs } from 'react-router-dom';

import { getCatalogExercise, listCatalogExercises } from './exerciseService';

export async function exerciseLibraryLoader() {
  return { exercises: await listCatalogExercises() };
}

export async function exerciseDetailLoader({ params }: LoaderFunctionArgs) {
  const id = params.exerciseId;
  if (!id) throw new Response('Exercise ID is required.', { status: 400 });
  const exercise = await getCatalogExercise(id);
  if (!exercise) throw new Response('Exercise not found.', { status: 404 });
  return { exercise };
}

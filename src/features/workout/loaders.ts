import type { LoaderFunctionArgs } from 'react-router-dom';

import {
  getHydratedWorkout,
  getWorkoutLanding,
  listWorkoutPickerExercises,
} from './workoutService';

function workoutId(args: LoaderFunctionArgs): string {
  const id = args.params.workoutId;
  if (!id) throw new Error('Workout ID is required.');
  return id;
}

export const workoutLandingLoader = () => getWorkoutLanding();

export async function workoutSessionLoader(args: LoaderFunctionArgs) {
  const workout = await getHydratedWorkout(workoutId(args));
  if (!workout) throw new Error('Workout not found.');
  return { workout };
}

export async function workoutExercisePickerLoader(args: LoaderFunctionArgs) {
  const id = workoutId(args);
  const [workout, exercises] = await Promise.all([
    getHydratedWorkout(id),
    listWorkoutPickerExercises(),
  ]);
  if (!workout) throw new Error('Workout not found.');
  return { workout, exercises };
}

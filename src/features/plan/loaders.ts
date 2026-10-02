import type { LoaderFunctionArgs } from 'react-router-dom';

import {
  getHydratedDay,
  getPrescriptionEditorData,
  getProgram,
  listPickerExercises,
  listPrograms,
} from './programService';

function required(value: string | undefined, label: string): string {
  if (!value) throw new Response(`${label} is required.`, { status: 400 });
  return value;
}

export const programListLoader = () => listPrograms();

export async function programLoader({ params }: LoaderFunctionArgs) {
  const programId = required(params.programId, 'Program ID');
  const graph = await getProgram(programId);
  if (!graph) throw new Response('Program not found.', { status: 404 });
  return {
    graph,
    activeProgramId: (await listPrograms()).activeProgramId,
    catalog: await listPickerExercises(),
  };
}

export async function programDayLoader({ params }: LoaderFunctionArgs) {
  const programId = required(params.programId, 'Program ID');
  const dayId = required(params.dayId, 'Program day ID');
  const day = await getHydratedDay(programId, dayId);
  if (!day) throw new Response('Program day not found.', { status: 404 });
  return { day, graph: await getProgram(programId) };
}

export async function programReviewLoader(args: LoaderFunctionArgs) {
  const data = await programLoader(args);
  return { ...data, exercises: await listPickerExercises() };
}

export async function programDayFormLoader(args: LoaderFunctionArgs) {
  const { params } = args;
  const result = await programLoader(args);
  const dayId = required(params.dayId, 'Program day ID');
  if (!result.graph.days.some(({ day }) => day.id === dayId)) {
    throw new Response('Program day not found.', { status: 404 });
  }
  return result;
}

export async function exercisePickerLoader({ params }: LoaderFunctionArgs) {
  const programId = required(params.programId, 'Program ID');
  const dayId = required(params.dayId, 'Program day ID');
  const day = await getHydratedDay(programId, dayId);
  if (!day) throw new Response('Program day not found.', { status: 404 });
  return { day, exercises: await listPickerExercises() };
}

export async function prescriptionLoader({ params }: LoaderFunctionArgs) {
  const programId = required(params.programId, 'Program ID');
  const dayId = required(params.dayId, 'Program day ID');
  const data = await getPrescriptionEditorData(
    programId,
    dayId,
    params.exerciseId,
    params.programExerciseId,
  );
  if (!data) throw new Response('Prescription not found.', { status: 404 });
  return { data };
}

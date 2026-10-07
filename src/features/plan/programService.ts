import type { Exercise, Program, ProgramDay, ProgramExercise } from '../../domain/entities';
import { initializeRepdbCatalog } from '../../data/providers/repdb/initialize';
import { database } from '../../lib/storage/database';
import { ExerciseRepository } from '../../lib/storage/repositories/exerciseRepository';
import {
  ProgramRepository,
  type CreateProgramInput,
  type ProgramExercisePrescriptionInput,
  type ProgramGraph,
  type UpdateProgramDayInput,
  type UpdateProgramInput,
} from '../../lib/storage/repositories/programRepository';

const programs = new ProgramRepository(database);
const exercises = new ExerciseRepository(database);

export interface ProgramListData {
  now: string;
  unfinished: import('../../domain/entities').WorkoutSession | null;
  programs: Program[];
  activeProgramId: string | null;
  graphs: ProgramGraph[];
  completed: import('../../domain/entities').WorkoutSession[];
}

export interface HydratedProgramExercise {
  prescription: ProgramExercise;
  exercise: Exercise;
}

export interface HydratedProgramDay {
  program: Program;
  day: ProgramDay;
  exercises: HydratedProgramExercise[];
}

export async function listPrograms(): Promise<ProgramListData> {
  const [items, activeProgramId] = await Promise.all([programs.list(), programs.getActiveId()]);
  const graphs = await Promise.all(items.map((item) => programs.get(item.id)));
  const completed = await database.workoutSessions.where('status').equals('completed').toArray();
  return {
    now: new Date().toISOString(),
    unfinished:
      (await database.workoutSessions.where('status').anyOf('active', 'paused').first()) ?? null,
    programs: items,
    activeProgramId,
    completed,
    graphs: graphs.filter((graph): graph is ProgramGraph => graph !== undefined),
  };
}

export async function getProgram(id: string): Promise<ProgramGraph | undefined> {
  return programs.get(id);
}

export async function getHydratedDay(
  programId: string,
  dayId: string,
): Promise<HydratedProgramDay | undefined> {
  const graph = await programs.get(programId);
  const dayEntry = graph?.days.find(({ day }) => day.id === dayId);
  if (!graph || !dayEntry) return undefined;
  const records = await Promise.all(
    dayEntry.exercises.map(async (prescription) => ({
      prescription,
      exercise: await exercises.get(prescription.exerciseId),
    })),
  );
  if (records.some(({ exercise }) => exercise === undefined)) {
    throw new Error('A planned exercise references a missing exercise record.');
  }
  return {
    program: graph.program,
    day: dayEntry.day,
    exercises: records as HydratedProgramExercise[],
  };
}

export async function listPickerExercises(): Promise<Exercise[]> {
  await initializeRepdbCatalog(database);
  return exercises.list();
}

export const createProgram = (input: CreateProgramInput) => programs.create(input);
export const updateProgram = (id: string, input: UpdateProgramInput) => programs.update(id, input);
export const duplicateProgram = (id: string) => programs.duplicate(id);
export const deleteProgram = (id: string) => programs.delete(id);
export const setActiveProgram = (id: string) => programs.setActive(id);

export const createProgramDay = (programId: string, input: UpdateProgramDayInput) =>
  programs.addDay({
    programId,
    name: input.name ?? '',
    notes: input.notes ?? null,
    defaultRestSeconds: input.defaultRestSeconds ?? null,
    weekday: input.weekday ?? null,
    kind: input.kind,
  });
export const updateProgramDay = (id: string, input: UpdateProgramDayInput) =>
  programs.updateDay(id, input);
export const duplicateProgramDay = (id: string, weekday?: number) =>
  programs.duplicateDay(id, weekday);
export const deleteProgramDay = (id: string) => programs.deleteDay(id);

export async function moveProgramDay(
  programId: string,
  dayId: string,
  direction: -1 | 1,
): Promise<void> {
  const graph = await programs.get(programId);
  if (!graph) throw new Error('Program not found.');
  const ids = graph.days.map(({ day }) => day.id);
  const index = ids.indexOf(dayId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  await programs.reorderDays(programId, ids);
}

export const createPrescription = (
  programDayId: string,
  exerciseId: string,
  input: ProgramExercisePrescriptionInput,
) =>
  database.transaction(
    'rw',
    [database.programs, database.programDays, database.programExercises, database.exercises],
    async () => {
      const duplicate = await database.programExercises
        .where('programDayId')
        .equals(programDayId)
        .filter((entry) => entry.exerciseId === exerciseId)
        .first();
      if (duplicate)
        throw new Error('This exercise already exists on this day. Edit its target instead.');
      return programs.addExercise({ programDayId, exerciseId, ...input });
    },
  );
export const transferPrescription = (id: string, destinationDayId: string, duplicate = false) =>
  programs.transferExercise(id, destinationDayId, duplicate);
export const updatePrescription = (id: string, input: ProgramExercisePrescriptionInput) =>
  programs.updateExercise(id, input);
export const deletePrescription = (id: string) => programs.deleteExercise(id);

export async function movePrescription(
  programDayId: string,
  prescriptionId: string,
  direction: -1 | 1,
): Promise<void> {
  const records = await database.programExercises
    .where('programDayId')
    .equals(programDayId)
    .sortBy('order');
  const ids = records.map(({ id }) => id);
  const index = ids.indexOf(prescriptionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  await programs.reorderExercises(programDayId, ids);
}

export async function getPrescriptionEditorData(
  programId: string,
  dayId: string,
  exerciseId?: string,
  prescriptionId?: string,
) {
  const day = await getHydratedDay(programId, dayId);
  if (!day) return undefined;
  if (prescriptionId) {
    const item = day.exercises.find(({ prescription }) => prescription.id === prescriptionId);
    return item ? { ...day, selected: item.exercise, prescription: item.prescription } : undefined;
  }
  if (!exerciseId) return undefined;
  await initializeRepdbCatalog(database);
  const selected = await exercises.get(exerciseId);
  return selected ? { ...day, selected, prescription: null } : undefined;
}

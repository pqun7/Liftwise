import type { Exercise, Program, ProgramDay } from '../../domain/entities';
import { initializeRepdbCatalog } from '../../data/providers/repdb/initialize';
import { database } from '../../lib/storage/database';
import { ExerciseRepository } from '../../lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../../lib/storage/repositories/programRepository';
import {
  WorkoutRepository,
  type UpdateWorkoutSetInput,
  type WorkoutExerciseWithSets,
  type WorkoutGraph,
} from '../../lib/storage/repositories/workoutRepository';

const workouts = new WorkoutRepository(database);
const programs = new ProgramRepository(database);
const exercises = new ExerciseRepository(database);

export interface WorkoutLandingData {
  unfinished: WorkoutRecoverySummary | null;
  activeProgram: Program | null;
  days: ProgramDay[];
  recent: WorkoutListSummary[];
}

export interface WorkoutListSummary {
  id: string;
  name: string;
  startedAt: string;
  completedSets: number;
  totalSets: number;
}

export interface WorkoutRecoverySummary {
  id: string;
  name: string;
  startedAt: string;
  completedSets: number;
  totalSets: number;
  status: 'active' | 'paused';
}

export interface HydratedWorkoutExercise extends WorkoutExerciseWithSets {
  displayExercise: Exercise | null;
  previous: WorkoutExerciseWithSets | null;
}

export interface HydratedWorkoutGraph {
  session: WorkoutGraph['session'];
  exercises: HydratedWorkoutExercise[];
}

function recoverySummary(graph: WorkoutGraph): WorkoutRecoverySummary {
  const sets = graph.exercises.flatMap(({ sets }) => sets);
  return {
    id: graph.session.id,
    name: graph.session.name ?? 'Quick Workout',
    startedAt: graph.session.startedAt,
    completedSets: sets.filter(({ completed }) => completed).length,
    totalSets: sets.length,
    status: graph.session.status as 'active' | 'paused',
  };
}

export async function getWorkoutLanding(): Promise<WorkoutLandingData> {
  const [unfinishedGraph, activeProgramId, recentGraphs] = await Promise.all([
    workouts.getUnfinished(),
    programs.getActiveId(),
    workouts.listCompleted(10),
  ]);
  const activeGraph = activeProgramId ? await programs.get(activeProgramId) : undefined;
  return {
    unfinished: unfinishedGraph ? recoverySummary(unfinishedGraph) : null,
    activeProgram: activeGraph?.program ?? null,
    days: activeGraph?.days.map(({ day }) => day) ?? [],
    recent: recentGraphs.map((graph) => {
      const sets = graph.exercises.flatMap(({ sets }) => sets);
      return {
        id: graph.session.id,
        name: graph.session.name ?? 'Quick Workout',
        startedAt: graph.session.startedAt,
        completedSets: sets.filter(({ completed }) => completed).length,
        totalSets: sets.length,
      };
    }),
  };
}

export async function getRecoverySummary(): Promise<WorkoutRecoverySummary | null> {
  const graph = await workouts.getUnfinished();
  return graph ? recoverySummary(graph) : null;
}

export async function startQuickWorkout(): Promise<string> {
  return (await workouts.createSession({ name: 'Quick Workout' })).id;
}

export async function startPlannedWorkout(programDayId: string): Promise<string> {
  return (await workouts.startPlannedWorkout(programDayId)).session.id;
}

export async function getHydratedWorkout(id: string): Promise<HydratedWorkoutGraph | undefined> {
  const graph = await workouts.get(id);
  if (!graph) return undefined;
  const hydrated = await Promise.all(
    graph.exercises.map(async (entry) => ({
      ...entry,
      displayExercise: (await exercises.get(entry.exercise.exerciseId)) ?? null,
      previous:
        (await workouts.getPreviousCompletedExercise(
          entry.exercise.exerciseId,
          graph.session.startedAt,
        )) ?? null,
    })),
  );
  return { session: graph.session, exercises: hydrated };
}

export async function listWorkoutPickerExercises(): Promise<Exercise[]> {
  await initializeRepdbCatalog(database);
  return exercises.list();
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.workoutSessions,
      database.workoutExercises,
      database.workoutSets,
      database.exercises,
      database.programExercises,
    ],
    async () => {
      const exercise = await workouts.addExercise({ workoutSessionId: workoutId, exerciseId });
      await workouts.addSet({ workoutExerciseId: exercise.id, setType: 'working' });
      await workouts.setCurrentExercise(workoutId, exercise.id);
    },
  );
}

export const addWorkoutSet = (workoutExerciseId: string) =>
  workouts.addSet({ workoutExerciseId, setType: 'working' });
export const updateWorkoutSet = (id: string, input: UpdateWorkoutSetInput) =>
  workouts.updateSet(id, input);
export const deleteWorkoutSet = (id: string) => workouts.deleteSet(id);
export const removeWorkoutExercise = (id: string) => workouts.removeExercise(id);
export const reorderWorkoutExercises = (sessionId: string, orderedIds: readonly string[]) =>
  workouts.reorderExercises(sessionId, orderedIds);
export const setCurrentWorkoutExercise = (sessionId: string, exerciseId: string) =>
  workouts.setCurrentExercise(sessionId, exerciseId);
export const updateWorkoutNotes = (sessionId: string, notes: string | null) =>
  workouts.updateSessionNotes(sessionId, notes);
export const startWorkoutRest = (sessionId: string, seconds: number) =>
  workouts.startRest(sessionId, seconds);
export const clearWorkoutRest = (sessionId: string) => workouts.clearRest(sessionId);
export const extendWorkoutRest = (sessionId: string) => workouts.extendRest(sessionId);
export const pauseWorkout = (sessionId: string) => workouts.pause(sessionId);
export const resumeWorkout = (sessionId: string) => workouts.resume(sessionId);
export const finishWorkout = (sessionId: string) => workouts.finish(sessionId);
export const discardWorkout = (sessionId: string) => workouts.discard(sessionId);
export const completeWorkoutSet = (id: string, input: UpdateWorkoutSetInput) =>
  workouts.completeSet(id, input);
export const undoWorkoutCompletion = (
  undo: import('../../lib/storage/repositories/workoutRepository').SetCompletionUndo,
) => workouts.undoCompletion(undo);
export const duplicateWorkoutSet = (id: string) => workouts.duplicateSet(id);
export const skipWorkoutExercise = (id: string, skipped: boolean) =>
  workouts.skipExercise(id, skipped);
export const replaceWorkoutExercise = (id: string, exerciseId: string) =>
  workouts.replaceExercise(id, exerciseId);

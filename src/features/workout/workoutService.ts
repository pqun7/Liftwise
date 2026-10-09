import type { Exercise, Program, ProgramDay, ProgramExercise } from '../../domain/entities';
import { sessionCalendarDate } from '../../domain/trainingCalendar';
import { workoutCompletion } from '../home/homeData';
import { getHomeData } from '../home/homeService';
import { deriveWorkoutLanding, type WorkoutLandingState } from './workoutLanding';
import { initializeRepdbCatalog } from '../../data/providers/repdb/initialize';
import { database, type LiftwiseDatabase } from '../../lib/storage/database';
import { ExerciseRepository } from '../../lib/storage/repositories/exerciseRepository';
import {
  WorkoutRepository,
  type UpdateWorkoutSetInput,
  type WorkoutExerciseWithSets,
  type WorkoutGraph,
} from '../../lib/storage/repositories/workoutRepository';

const workouts = new WorkoutRepository(database);
const exercises = new ExerciseRepository(database);

export interface WorkoutLandingData {
  state: WorkoutLandingState;
  todayDayId: string | null;
  nextDayId: string | null;
  nextDate?: string | null;
  todayDate?: string;
  completedToday: WorkoutListSummary | null;
  previews: { day: ProgramDay; entries: WorkoutPreviewEntry[] }[];
  unfinished: WorkoutRecoverySummary | null;
  activeProgram: Program | null;
  days: ProgramDay[];
  recent: WorkoutListSummary[];
}

export interface WorkoutPreviewEntry {
  prescription: ProgramExercise;
  exercise: Exercise | null;
  previous: WorkoutExerciseWithSets | null;
}

export interface WorkoutListSummary {
  programDayId?: string | null;
  id: string;
  name: string;
  startedAt: string;
  completedSets: number;
  totalSets: number;
}

export interface WorkoutRecoverySummary {
  pauseReason?: 'manual' | 'away' | 'recovery' | undefined;
  scheduledDate?: string;
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
  const completion = workoutCompletion(graph);
  return {
    id: graph.session.id,
    name: graph.session.name ?? 'Quick Workout',
    startedAt: graph.session.startedAt,
    scheduledDate: sessionCalendarDate(graph.session),
    completedSets: completion.completedSets,
    totalSets: completion.totalSets,
    status: graph.session.status as 'active' | 'paused',
    pauseReason: graph.session.pauseReason,
  };
}

export async function getWorkoutLanding(
  db: LiftwiseDatabase = database,
  now = new Date(),
): Promise<WorkoutLandingData> {
  const home = await getHomeData(db, now);
  const derived = deriveWorkoutLanding(home, now);
  const catalog = new ExerciseRepository(db);
  const history = new WorkoutRepository(db);
  const activeGraph = home.programs.find(
    ({ program }) => program.id === home.activeProgramId && !program.draft && !program.archived,
  );
  const summarize = (graph: WorkoutGraph): WorkoutListSummary => {
    const sets = graph.exercises.flatMap(({ sets }) => sets);
    return {
      id: graph.session.id,
      programDayId: graph.session.programDayId,
      name: graph.session.name ?? 'Quick Workout',
      startedAt: graph.session.startedAt,
      completedSets: sets.filter(({ completed }) => completed).length,
      totalSets: sets.length,
    };
  };
  const previousExercises = await history.getPreviousCompletedExercises(
    (activeGraph?.days ?? []).flatMap(({ exercises }) =>
      exercises.map((entry) => entry.exerciseId),
    ),
    now.toISOString(),
  );
  const previews = await Promise.all(
    (activeGraph?.days ?? []).map(async ({ day, exercises: prescriptions }) => ({
      day,
      entries: await Promise.all(
        prescriptions.map(async (prescription) => ({
          prescription,
          exercise: (await catalog.get(prescription.exerciseId)) ?? null,
          previous: previousExercises.get(prescription.exerciseId) ?? null,
        })),
      ),
    })),
  );
  return {
    state: derived.state,
    todayDayId: derived.todayDayId,
    nextDayId: derived.nextDayId,
    nextDate: derived.nextDate,
    todayDate: home.today,
    completedToday: derived.completedToday ? summarize(derived.completedToday) : null,
    previews,
    unfinished: home.active ? recoverySummary(home.active) : null,
    activeProgram: activeGraph?.program ?? null,
    days: home.nextDays.map(({ day }) => day),
    recent: home.recent.map(summarize),
  };
}

export async function getRecoverySummary(): Promise<WorkoutRecoverySummary | null> {
  await workouts.recoverInterrupted();
  const graph = await workouts.getUnfinished();
  return graph ? recoverySummary(graph) : null;
}

/** Serialize the active check with creation, including across tabs. Never navigate before commit. */
export async function getOrStartWorkout(
  programDayId: string | null,
  db: LiftwiseDatabase = database,
): Promise<string> {
  const repository = new WorkoutRepository(db);
  await repository.recoverInterrupted();
  return db.transaction(
    'rw',
    [
      db.programs,
      db.programDays,
      db.programExercises,
      db.exercises,
      db.workoutSessions,
      db.workoutExercises,
      db.workoutSets,
    ],
    async () => {
      const active = await repository.getUnfinished();
      if (active) return active.session.id;
      return programDayId
        ? (await repository.startPlannedWorkout(programDayId)).session.id
        : (await repository.createSession({ name: 'Quick Workout' })).id;
    },
  );
}

export const startQuickWorkout = () => getOrStartWorkout(null);
export const startPlannedWorkout = (programDayId: string) => getOrStartWorkout(programDayId);

export async function getHydratedWorkout(id: string): Promise<HydratedWorkoutGraph | undefined> {
  await workouts.recoverInterrupted();
  const graph = await workouts.get(id);
  if (!graph) return undefined;
  const previousExercises = await workouts.getPreviousCompletedExercises(
    graph.exercises.map((entry) => entry.exercise.exerciseId),
    graph.session.startedAt,
  );
  const hydrated = await Promise.all(
    graph.exercises.map(async (entry) => ({
      ...entry,
      displayExercise: (await exercises.get(entry.exercise.exerciseId)) ?? null,
      previous: previousExercises.get(entry.exercise.exerciseId) ?? null,
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
export const updateWorkoutSet = (
  id: string,
  input: UpdateWorkoutSetInput,
  expectedRevision?: string,
) => workouts.updateSet(id, input, expectedRevision);
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
export const pauseWorkoutForDeparture = (sessionId: string) =>
  workouts.pauseForDeparture(sessionId);
export const correctWorkoutDuration = (sessionId: string, seconds: number) =>
  workouts.correctDuration(sessionId, seconds);
export const resumeWorkout = (sessionId: string) => workouts.resume(sessionId);
export const finishWorkout = (sessionId: string) => workouts.finish(sessionId);
export const discardWorkout = (sessionId: string) => workouts.discard(sessionId);
export const completeWorkoutSet = (
  id: string,
  input: UpdateWorkoutSetInput,
  expectedRevision?: string,
) => workouts.completeSet(id, input, true, expectedRevision);
export const undoWorkoutCompletion = (
  undo: import('../../lib/storage/repositories/workoutRepository').SetCompletionUndo,
) => workouts.undoCompletion(undo);
export const duplicateWorkoutSet = (id: string) => workouts.duplicateSet(id);
export const skipWorkoutExercise = (id: string, skipped: boolean) =>
  workouts.skipExercise(id, skipped);
export const replaceWorkoutExercise = (id: string, exerciseId: string) =>
  workouts.replaceExercise(id, exerciseId);

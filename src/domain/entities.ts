export type IsoTimestamp = string;

export interface TimestampedEntity {
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export const exerciseSourceProviders = ['repdb', 'custom'] as const;
export type ExerciseSourceProvider = (typeof exerciseSourceProviders)[number];

export const exerciseLocales = ['en', 'de', 'es'] as const;
export type ExerciseLocale = (typeof exerciseLocales)[number];

export interface ExerciseLocalizedContent {
  name: string;
  description: string | null;
  instructions: string[];
  tips: string[];
}

export interface ExerciseLocalizations {
  en: ExerciseLocalizedContent;
  de?: ExerciseLocalizedContent | undefined;
  es?: ExerciseLocalizedContent | undefined;
}

export interface ExerciseImage {
  path: string;
  width: number;
  height: number;
  alt: string;
}

export interface ExerciseImages {
  start: ExerciseImage | null;
  peak: ExerciseImage | null;
  main: ExerciseImage | null;
}

export interface Exercise extends TimestampedEntity {
  id: string;
  sourceProvider: ExerciseSourceProvider;
  sourceId: string;
  name: string;
  description: string | null;
  instructions: string[];
  tips: string[];
  category: string | null;
  forceType: string | null;
  mechanic: string | null;
  difficulty: string | null;
  equipment: string | null;
  bodyPart: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  goals: string[];
  tags: string[];
  met: number | null;
  isUnilateral: boolean;
  isBodyweight: boolean;
  images: ExerciseImages;
  localizations: ExerciseLocalizations;
  importedAt: IsoTimestamp | null;
  isActive: boolean;
  searchText: string;
  notes: string | null;
}

export interface CatalogMetadata {
  provider: 'repdb';
  sourceRepository: string;
  sourceCommit: string;
  schemaVersion: string;
  importedAt: IsoTimestamp;
  exerciseCount: number;
  sourceJsonBytes: number;
  mediaFileCount: number;
  mediaBytes: number;
}

export interface Program extends TimestampedEntity {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
  goal?: 'strength' | 'hypertrophy' | 'general' | undefined;
  level?: 'beginner' | 'intermediate' | 'advanced' | undefined;
  splitTemplate?: 'ppl' | 'upper-lower' | 'full-body' | 'custom' | undefined;
  draft?: boolean | undefined;
}

export interface ProgramDay extends TimestampedEntity {
  id: string;
  programId: string;
  name: string;
  order: number;
  notes: string | null;
  weekday?: number | null | undefined;
  defaultRestSeconds?: number | null | undefined;
}

export interface ProgramExercise extends TimestampedEntity {
  id: string;
  programDayId: string;
  exerciseId: string;
  order: number;
  targetSets: number | null;
  minReps: number | null;
  maxReps: number | null;
  targetRirMin: number | null;
  targetRirMax: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export const workoutSessionStatuses = ['active', 'paused', 'completed', 'discarded'] as const;
export type WorkoutSessionStatus = (typeof workoutSessionStatuses)[number];

export interface WorkoutSession extends TimestampedEntity {
  /** Local calendar date captured on creation, independent of timestamp or reopening date. */
  scheduledDate?: string | undefined;
  id: string;
  programId: string | null;
  programDayId: string | null;
  name: string | null;
  status: WorkoutSessionStatus;
  startedAt: IsoTimestamp;
  endedAt: IsoTimestamp | null;
  pausedAt: IsoTimestamp | null;
  pausedDurationSeconds: number;
  currentExerciseId: string | null;
  restStartedAt: IsoTimestamp | null;
  restEndsAt: IsoTimestamp | null;
  notes: string | null;
}

export interface WorkoutExercise extends TimestampedEntity {
  skipped?: boolean | undefined;
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  programExerciseId: string | null;
  exerciseName: string;
  order: number;
  plannedTargetSets: number | null;
  plannedMinReps: number | null;
  plannedMaxReps: number | null;
  plannedRirMin: number | null;
  plannedRirMax: number | null;
  plannedRestSeconds: number | null;
  plannedNotes: string | null;
  notes: string | null;
}

export const workoutSetTypes = ['warmup', 'working', 'drop', 'failure'] as const;
export type WorkoutSetType = (typeof workoutSetTypes)[number];

export interface WorkoutSet extends TimestampedEntity {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  setType: WorkoutSetType;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  completed: boolean;
}

export interface BodyMetric extends TimestampedEntity {
  waistCm?: number | null | undefined;
  chestCm?: number | null | undefined;
  armsCm?: number | null | undefined;
  legsCm?: number | null | undefined;
  id: string;
  measuredAt: IsoTimestamp;
  weight: number | null;
  bodyFatPercentage: number | null;
  notes: string | null;
}

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AppSetting extends TimestampedEntity {
  key: string;
  value: JsonValue;
}

export type AppSettings = AppSetting;

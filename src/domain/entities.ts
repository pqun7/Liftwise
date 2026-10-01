export type IsoTimestamp = string;

export interface TimestampedEntity {
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Exercise extends TimestampedEntity {
  id: string;
  name: string;
  notes: string | null;
}

export interface Program extends TimestampedEntity {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
}

export interface ProgramDay extends TimestampedEntity {
  id: string;
  programId: string;
  name: string;
  dayNumber: number;
}

export interface ProgramExercise extends TimestampedEntity {
  id: string;
  programDayId: string;
  exerciseId: string;
  order: number;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  notes: string | null;
}

export const workoutSessionStatuses = ['active', 'completed', 'discarded'] as const;
export type WorkoutSessionStatus = (typeof workoutSessionStatuses)[number];

export interface WorkoutSession extends TimestampedEntity {
  id: string;
  programId: string | null;
  programDayId: string | null;
  name: string | null;
  status: WorkoutSessionStatus;
  startedAt: IsoTimestamp;
  endedAt: IsoTimestamp | null;
  notes: string | null;
}

export interface WorkoutExercise extends TimestampedEntity {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  programExerciseId: string | null;
  order: number;
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

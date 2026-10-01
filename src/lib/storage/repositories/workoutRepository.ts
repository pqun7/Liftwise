import type {
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionStatus,
  WorkoutSet,
  WorkoutSetType,
} from '../../../domain/entities';
import {
  workoutExerciseSchema,
  workoutSessionSchema,
  workoutSetSchema,
} from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { RelationshipError } from '../errors';
import { createEntityId, createTimestamp, requireRecord } from './shared';

export interface CreateWorkoutSessionInput {
  programId?: string | null;
  programDayId?: string | null;
  name?: string | null;
  startedAt?: string;
  notes?: string | null;
}

export interface CreateWorkoutExerciseInput {
  workoutSessionId: string;
  exerciseId: string;
  programExerciseId?: string | null;
  order: number;
  notes?: string | null;
}

export interface CreateWorkoutSetInput {
  workoutExerciseId: string;
  setNumber: number;
  setType: WorkoutSetType;
  weight?: number | null;
  reps?: number | null;
  rir?: number | null;
  completed?: boolean;
}

export interface UpdateWorkoutSetInput {
  setNumber?: number;
  setType?: WorkoutSetType;
  weight?: number | null;
  reps?: number | null;
  rir?: number | null;
  completed?: boolean;
}

export interface WorkoutExerciseWithSets {
  exercise: WorkoutExercise;
  sets: WorkoutSet[];
}

export interface WorkoutGraph {
  session: WorkoutSession;
  exercises: WorkoutExerciseWithSets[];
}

export class WorkoutRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async createSession(input: CreateWorkoutSessionInput = {}): Promise<WorkoutSession> {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.workoutSessions],
      async () => {
        let programId = input.programId ?? null;
        const programDayId = input.programDayId ?? null;

        if (programDayId !== null) {
          const day = requireRecord(
            await this.db.programDays.get(programDayId),
            'ProgramDay',
            programDayId,
          );
          if (programId !== null && programId !== day.programId) {
            throw new RelationshipError('The selected program day does not belong to the program.');
          }
          programId = day.programId;
        } else if (programId !== null) {
          requireRecord(await this.db.programs.get(programId), 'Program', programId);
        }

        const timestamp = createTimestamp();
        const session = workoutSessionSchema.parse({
          id: createEntityId(),
          programId,
          programDayId,
          name: input.name ?? null,
          status: 'active',
          startedAt: input.startedAt ?? timestamp,
          endedAt: null,
          notes: input.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        await this.db.workoutSessions.add(session);
        return session;
      },
    );
  }

  async addExercise(input: CreateWorkoutExerciseInput): Promise<WorkoutExercise> {
    return this.db.transaction(
      'rw',
      [
        this.db.workoutSessions,
        this.db.exercises,
        this.db.programExercises,
        this.db.workoutExercises,
      ],
      async () => {
        requireRecord(
          await this.db.workoutSessions.get(input.workoutSessionId),
          'WorkoutSession',
          input.workoutSessionId,
        );
        requireRecord(await this.db.exercises.get(input.exerciseId), 'Exercise', input.exerciseId);

        const programExerciseId = input.programExerciseId ?? null;
        if (programExerciseId !== null) {
          const programExercise = requireRecord(
            await this.db.programExercises.get(programExerciseId),
            'ProgramExercise',
            programExerciseId,
          );
          if (programExercise.exerciseId !== input.exerciseId) {
            throw new RelationshipError(
              'The workout exercise must match its referenced program exercise.',
            );
          }
        }

        const timestamp = createTimestamp();
        const workoutExercise = workoutExerciseSchema.parse({
          id: createEntityId(),
          workoutSessionId: input.workoutSessionId,
          exerciseId: input.exerciseId,
          programExerciseId,
          order: input.order,
          notes: input.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        await this.db.workoutExercises.add(workoutExercise);
        return workoutExercise;
      },
    );
  }

  async addSet(input: CreateWorkoutSetInput): Promise<WorkoutSet> {
    return this.db.transaction('rw', [this.db.workoutExercises, this.db.workoutSets], async () => {
      requireRecord(
        await this.db.workoutExercises.get(input.workoutExerciseId),
        'WorkoutExercise',
        input.workoutExerciseId,
      );
      const timestamp = createTimestamp();
      const workoutSet = workoutSetSchema.parse({
        id: createEntityId(),
        workoutExerciseId: input.workoutExerciseId,
        setNumber: input.setNumber,
        setType: input.setType,
        weight: input.weight ?? null,
        reps: input.reps ?? null,
        rir: input.rir ?? null,
        completed: input.completed ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await this.db.workoutSets.add(workoutSet);
      return workoutSet;
    });
  }

  async updateSet(id: string, input: UpdateWorkoutSetInput): Promise<WorkoutSet> {
    return this.db.transaction('rw', this.db.workoutSets, async () => {
      const current = requireRecord(await this.db.workoutSets.get(id), 'WorkoutSet', id);
      const updated = workoutSetSchema.parse({
        ...current,
        ...input,
        id: current.id,
        workoutExerciseId: current.workoutExerciseId,
        createdAt: current.createdAt,
        updatedAt: createTimestamp(),
      });

      await this.db.workoutSets.put(updated);
      return updated;
    });
  }

  async setSessionStatus(id: string, status: WorkoutSessionStatus): Promise<WorkoutSession> {
    return this.db.transaction('rw', this.db.workoutSessions, async () => {
      const current = requireRecord(await this.db.workoutSessions.get(id), 'WorkoutSession', id);
      const timestamp = createTimestamp();
      const updated = workoutSessionSchema.parse({
        ...current,
        status,
        endedAt: status === 'active' ? null : (current.endedAt ?? timestamp),
        updatedAt: timestamp,
      });

      await this.db.workoutSessions.put(updated);
      return updated;
    });
  }

  async get(id: string): Promise<WorkoutGraph | undefined> {
    return this.db.transaction(
      'r',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const rawSession = await this.db.workoutSessions.get(id);
        if (rawSession === undefined) {
          return undefined;
        }

        const session = workoutSessionSchema.parse(rawSession);
        const exercises = (
          await this.db.workoutExercises.where('workoutSessionId').equals(id).sortBy('order')
        ).map((exercise) => workoutExerciseSchema.parse(exercise));
        const exerciseIds = exercises.map((exercise) => exercise.id);
        const allSets =
          exerciseIds.length === 0
            ? []
            : await this.db.workoutSets.where('workoutExerciseId').anyOf(exerciseIds).toArray();

        return {
          session,
          exercises: exercises.map((exercise) => ({
            exercise,
            sets: allSets
              .filter((set) => set.workoutExerciseId === exercise.id)
              .map((set) => workoutSetSchema.parse(set))
              .sort((left, right) => left.setNumber - right.setNumber),
          })),
        };
      },
    );
  }

  async deleteSet(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.workoutSets, async () => {
      requireRecord(await this.db.workoutSets.get(id), 'WorkoutSet', id);
      await this.db.workoutSets.delete(id);
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        requireRecord(await this.db.workoutSessions.get(id), 'WorkoutSession', id);
        const exerciseIds = await this.db.workoutExercises
          .where('workoutSessionId')
          .equals(id)
          .primaryKeys();

        if (exerciseIds.length > 0) {
          await this.db.workoutSets.where('workoutExerciseId').anyOf(exerciseIds).delete();
        }

        await this.db.workoutExercises.where('workoutSessionId').equals(id).delete();
        await this.db.workoutSessions.delete(id);
      },
    );
  }
}

export const workoutRepository = new WorkoutRepository();

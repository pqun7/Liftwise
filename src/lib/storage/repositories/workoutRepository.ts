import type {
  ProgramExercise,
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
import { previousSetFor } from '../../../domain/workoutPrefill';
import { localDateKey } from '../../../domain/localCalendar';

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
  order?: number;
  notes?: string | null;
  plannedTargetSets?: number | null;
  plannedMinReps?: number | null;
  plannedMaxReps?: number | null;
  plannedRirMin?: number | null;
  plannedRirMax?: number | null;
  plannedRestSeconds?: number | null;
  plannedNotes?: string | null;
}

export interface CreateWorkoutSetInput {
  workoutExerciseId: string;
  setNumber?: number;
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

export interface SetCompletionUndo {
  setId: string;
  sessionId: string;
  completedAt: string;
  expiresAt: number;
  priorRestStartedAt: string | null;
  priorRestEndsAt: string | null;
  completionRestEndsAt: string | null;
}

function unfinished(status: WorkoutSessionStatus): boolean {
  return status === 'active' || status === 'paused';
}

export class WorkoutRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async completeSet(
    id: string,
    input: UpdateWorkoutSetInput,
    finishWhenDone = false,
  ): Promise<SetCompletionUndo> {
    return this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const set = requireRecord(await this.db.workoutSets.get(id), 'WorkoutSet', id);
        if (set.completed) throw new Error('This set is already completed.');
        const exercise = requireRecord(
          await this.db.workoutExercises.get(set.workoutExerciseId),
          'WorkoutExercise',
          set.workoutExerciseId,
        );
        if (exercise.skipped) throw new Error('Resume this exercise before completing sets.');
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(exercise.workoutSessionId),
            'WorkoutSession',
            exercise.workoutSessionId,
          ),
        );
        if (session.status !== 'active')
          throw new Error('Resume the workout before completing sets.');
        if (session.currentExerciseId !== exercise.id)
          await this.setCurrentExercise(session.id, exercise.id);
        const updated = await this.updateSet(id, { ...input, completed: true });
        const next = (
          await this.db.workoutSets
            .where('workoutExerciseId')
            .equals(exercise.id)
            .sortBy('setNumber')
        ).find(
          (item) =>
            !item.completed &&
            item.setType === updated.setType &&
            item.setNumber > updated.setNumber,
        );
        // Preserve history prefill and deliberate clears. Only a never-edited blank set inherits today.
        if (
          next &&
          next.weight === null &&
          next.reps === null &&
          next.rir === null &&
          next.updatedAt === next.createdAt
        ) {
          await this.updateSet(next.id, {
            weight: updated.weight,
            reps: updated.reps,
            rir: updated.rir,
          });
        }
        const graph = (await this.get(session.id))!;
        const relevant = graph.exercises.filter((item) => !item.exercise.skipped);
        const allDone =
          relevant.length > 0 &&
          relevant.every(
            (item) => item.sets.length > 0 && item.sets.every((value) => value.completed),
          );
        const moreSets = graph.exercises
          .find((item) => item.exercise.id === exercise.id)!
          .sets.some((value) => !value.completed);
        const rest =
          finishWhenDone && allDone
            ? await this.finish(session.id)
            : moreSets && (exercise.plannedRestSeconds ?? 0) > 0
              ? await this.startRest(session.id, exercise.plannedRestSeconds!)
              : await this.clearRest(session.id);
        return {
          setId: id,
          sessionId: session.id,
          completedAt: updated.updatedAt,
          expiresAt: Date.now() + 10_000,
          priorRestStartedAt: session.restStartedAt,
          priorRestEndsAt: session.restEndsAt,
          completionRestEndsAt: rest.restEndsAt,
        };
      },
    );
  }

  async undoCompletion(undo: SetCompletionUndo): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        if (Date.now() > undo.expiresAt)
          throw new Error('Undo has expired. You can still edit the set.');
        const set = requireRecord(
          await this.db.workoutSets.get(undo.setId),
          'WorkoutSet',
          undo.setId,
        );
        const exercise = requireRecord(
          await this.db.workoutExercises.get(set.workoutExerciseId),
          'WorkoutExercise',
          set.workoutExerciseId,
        );
        if (
          exercise.workoutSessionId !== undo.sessionId ||
          !set.completed ||
          set.updatedAt !== undo.completedAt
        )
          throw new Error('The set changed since completion.');
        const originalSession = requireRecord(
          await this.db.workoutSessions.get(undo.sessionId),
          'WorkoutSession',
          undo.sessionId,
        );
        if (originalSession.status === 'completed') {
          await this.requireNoUnfinishedSession();
          await this.db.workoutSessions.put(
            workoutSessionSchema.parse({ ...originalSession, status: 'active', endedAt: null }),
          );
        }
        await this.updateSet(set.id, { completed: false });
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(undo.sessionId),
            'WorkoutSession',
            undo.sessionId,
          ),
        );
        if (session.restEndsAt === undo.completionRestEndsAt) {
          await this.db.workoutSessions.put(
            workoutSessionSchema.parse({
              ...session,
              restStartedAt: undo.priorRestStartedAt,
              restEndsAt: undo.priorRestEndsAt,
            }),
          );
        }
      },
    );
  }

  async duplicateSet(id: string): Promise<WorkoutSet> {
    return this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const source = requireRecord(await this.db.workoutSets.get(id), 'WorkoutSet', id);
        return this.addSet({
          workoutExerciseId: source.workoutExerciseId,
          setType: source.setType,
          weight: source.weight,
          reps: source.reps,
          rir: source.rir,
          completed: false,
        });
      },
    );
  }

  async skipExercise(id: string, skipped: boolean): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises],
      async () => {
        const exercise = requireRecord(
          await this.db.workoutExercises.get(id),
          'WorkoutExercise',
          id,
        );
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(exercise.workoutSessionId),
            'WorkoutSession',
            exercise.workoutSessionId,
          ),
        );
        const timestamp = createTimestamp();
        await this.db.workoutExercises.put(
          workoutExerciseSchema.parse({ ...exercise, skipped, updatedAt: timestamp }),
        );
        const next = (
          await this.db.workoutExercises
            .where('workoutSessionId')
            .equals(session.id)
            .sortBy('order')
        ).find((item) => !item.skipped);
        await this.db.workoutSessions.put(
          workoutSessionSchema.parse({
            ...session,
            currentExerciseId:
              skipped && session.currentExerciseId === id
                ? (next?.id ?? null)
                : session.currentExerciseId,
            updatedAt: timestamp,
          }),
        );
      },
    );
  }

  async replaceExercise(id: string, exerciseId: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets, this.db.exercises],
      async () => {
        const current = requireRecord(
          await this.db.workoutExercises.get(id),
          'WorkoutExercise',
          id,
        );
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(current.workoutSessionId),
            'WorkoutSession',
            current.workoutSessionId,
          ),
        );
        const source = requireRecord(
          await this.db.exercises.get(exerciseId),
          'Exercise',
          exerciseId,
        );
        if (
          (await this.db.workoutSets.where('workoutExerciseId').equals(id).toArray()).some(
            (set) => set.completed,
          )
        )
          throw new Error(
            'Completed sets keep their original exercise. Add another exercise instead.',
          );
        const timestamp = createTimestamp();
        await this.db.workoutSets
          .where('workoutExerciseId')
          .equals(id)
          .modify({ weight: null, reps: null, rir: null, updatedAt: timestamp });
        await this.db.workoutExercises.put(
          workoutExerciseSchema.parse({
            ...current,
            exerciseId,
            exerciseName: source.name,
            programExerciseId: null,
            skipped: false,
            updatedAt: timestamp,
          }),
        );
        await this.touchSession(session, timestamp);
      },
    );
  }

  async createSession(input: CreateWorkoutSessionInput = {}): Promise<WorkoutSession> {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.workoutSessions],
      async () => {
        await this.requireNoUnfinishedSession();
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
        const session = this.createSessionRecord({
          ...input,
          programId,
          programDayId,
          startedAt: input.startedAt ?? timestamp,
          timestamp,
        });
        await this.db.workoutSessions.add(session);
        return session;
      },
    );
  }

  async startPlannedWorkout(programDayId: string, startedAt?: string): Promise<WorkoutGraph> {
    return this.db.transaction(
      'rw',
      [
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.exercises,
        this.db.workoutSessions,
        this.db.workoutExercises,
        this.db.workoutSets,
      ],
      async () => {
        await this.requireNoUnfinishedSession();
        const day = requireRecord(
          await this.db.programDays.get(programDayId),
          'ProgramDay',
          programDayId,
        );
        const program = requireRecord(
          await this.db.programs.get(day.programId),
          'Program',
          day.programId,
        );
        if (program.draft) throw new Error('Save the program before starting a workout.');
        if (day.kind === 'recovery') throw new Error('Recovery days do not contain workouts.');
        const prescriptions = await this.db.programExercises
          .where('programDayId')
          .equals(programDayId)
          .sortBy('order');
        const exerciseIds = prescriptions.map(({ exerciseId }) => exerciseId);
        const sourceExercises = exerciseIds.length
          ? await this.db.exercises.where('id').anyOf(exerciseIds).toArray()
          : [];
        const byId = new Map(sourceExercises.map((exercise) => [exercise.id, exercise]));
        const timestamp = createTimestamp();
        const sessionId = createEntityId();
        const sessionExercises = prescriptions.map((prescription) =>
          this.createExerciseSnapshot(
            sessionId,
            prescription,
            requireRecord(byId.get(prescription.exerciseId), 'Exercise', prescription.exerciseId)
              .name,
            timestamp,
          ),
        );
        const sets = sessionExercises.flatMap((exercise) =>
          Array.from({ length: exercise.plannedTargetSets ?? 0 }, (_, index) =>
            workoutSetSchema.parse({
              id: createEntityId(),
              workoutExerciseId: exercise.id,
              setNumber: index + 1,
              setType: 'working',
              weight: null,
              reps: null,
              rir: null,
              completed: false,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          ),
        );
        const session = workoutSessionSchema.parse({
          ...this.createSessionRecord({
            programId: program.id,
            programDayId: day.id,
            name: day.name,
            notes: day.notes,
            startedAt: startedAt ?? timestamp,
            timestamp,
          }),
          id: sessionId,
          currentExerciseId: sessionExercises[0]?.id ?? null,
        });
        for (const exercise of sessionExercises) {
          const previous = await this.getPreviousCompletedExercise(
            exercise.exerciseId,
            session.startedAt,
          );
          for (const set of sets.filter((item) => item.workoutExerciseId === exercise.id)) {
            const source = previousSetFor(set, previous?.sets ?? []);
            if (source)
              Object.assign(set, { weight: source.weight, reps: source.reps, rir: source.rir });
          }
        }
        await this.db.workoutSessions.add(session);
        if (sessionExercises.length) await this.db.workoutExercises.bulkAdd(sessionExercises);
        if (sets.length) await this.db.workoutSets.bulkAdd(sets);
        return {
          session,
          exercises: sessionExercises.map((exercise) => ({
            exercise,
            sets: sets.filter(({ workoutExerciseId }) => workoutExerciseId === exercise.id),
          })),
        };
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
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(input.workoutSessionId),
            'WorkoutSession',
            input.workoutSessionId,
          ),
        );
        const source = requireRecord(
          await this.db.exercises.get(input.exerciseId),
          'Exercise',
          input.exerciseId,
        );
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
        const existing = await this.db.workoutExercises
          .where('workoutSessionId')
          .equals(session.id)
          .toArray();
        const timestamp = createTimestamp();
        const workoutExercise = workoutExerciseSchema.parse({
          id: createEntityId(),
          workoutSessionId: session.id,
          exerciseId: input.exerciseId,
          programExerciseId,
          exerciseName: source.name,
          order: input.order ?? existing.length + 1,
          plannedTargetSets: input.plannedTargetSets ?? null,
          plannedMinReps: input.plannedMinReps ?? null,
          plannedMaxReps: input.plannedMaxReps ?? null,
          plannedRirMin: input.plannedRirMin ?? null,
          plannedRirMax: input.plannedRirMax ?? null,
          plannedRestSeconds: input.plannedRestSeconds ?? null,
          plannedNotes: input.plannedNotes ?? null,
          notes: input.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        await this.db.workoutExercises.add(workoutExercise);
        await this.db.workoutSessions.put(
          workoutSessionSchema.parse({
            ...session,
            currentExerciseId: session.currentExerciseId ?? workoutExercise.id,
            updatedAt: timestamp,
          }),
        );
        return workoutExercise;
      },
    );
  }

  async addSet(input: CreateWorkoutSetInput): Promise<WorkoutSet> {
    return this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const exercise = requireRecord(
          await this.db.workoutExercises.get(input.workoutExerciseId),
          'WorkoutExercise',
          input.workoutExerciseId,
        );
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(exercise.workoutSessionId),
            'WorkoutSession',
            exercise.workoutSessionId,
          ),
        );
        const existing = await this.db.workoutSets
          .where('workoutExerciseId')
          .equals(exercise.id)
          .toArray();
        const timestamp = createTimestamp();
        const workoutSet = workoutSetSchema.parse({
          id: createEntityId(),
          workoutExerciseId: exercise.id,
          setNumber:
            input.setNumber ?? Math.max(0, ...existing.map(({ setNumber }) => setNumber)) + 1,
          setType: input.setType,
          weight: input.weight ?? null,
          reps: input.reps ?? null,
          rir: input.rir ?? null,
          completed: input.completed ?? false,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        const previous = await this.getPreviousCompletedExercise(
          exercise.exerciseId,
          session.startedAt,
        );
        const source = previousSetFor(workoutSet, previous?.sets ?? []);
        if (source) {
          for (const field of ['weight', 'reps', 'rir'] as const) {
            if (input[field] === undefined) workoutSet[field] = source[field];
          }
        }
        await this.db.workoutSets.add(workoutSet);
        await this.touchSession(session, timestamp);
        return workoutSet;
      },
    );
  }

  async updateSet(id: string, input: UpdateWorkoutSetInput): Promise<WorkoutSet> {
    return this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const current = requireRecord(await this.db.workoutSets.get(id), 'WorkoutSet', id);
        const exercise = requireRecord(
          await this.db.workoutExercises.get(current.workoutExerciseId),
          'WorkoutExercise',
          current.workoutExerciseId,
        );
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(exercise.workoutSessionId),
            'WorkoutSession',
            exercise.workoutSessionId,
          ),
        );
        // Distinguish a deliberate edit from an untouched set even within the same millisecond.
        const timestamp = new Date(
          Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
        ).toISOString();
        const updated = workoutSetSchema.parse({
          ...current,
          ...input,
          id: current.id,
          workoutExerciseId: current.workoutExerciseId,
          createdAt: current.createdAt,
          updatedAt: timestamp,
        });
        await this.db.workoutSets.put(updated);
        await this.touchSession(session, timestamp);
        return updated;
      },
    );
  }

  async updateSessionNotes(id: string, notes: string | null): Promise<WorkoutSession> {
    return this.updateSession(id, (session, timestamp) => ({
      ...this.requireMutableSession(session),
      notes,
      updatedAt: timestamp,
    }));
  }

  async setCurrentExercise(id: string, workoutExerciseId: string): Promise<WorkoutSession> {
    return this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises],
      async () => {
        const session = this.requireMutableSession(
          requireRecord(await this.db.workoutSessions.get(id), 'WorkoutSession', id),
        );
        const exercise = requireRecord(
          await this.db.workoutExercises.get(workoutExerciseId),
          'WorkoutExercise',
          workoutExerciseId,
        );
        if (exercise.workoutSessionId !== id) {
          throw new RelationshipError('Current exercise must belong to the workout session.');
        }
        const updated = workoutSessionSchema.parse({
          ...session,
          currentExerciseId: workoutExerciseId,
          updatedAt: createTimestamp(),
        });
        await this.db.workoutSessions.put(updated);
        return updated;
      },
    );
  }

  async startRest(id: string, seconds: number, now = new Date()): Promise<WorkoutSession> {
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3_600) {
      throw new Error('Rest duration must be an integer from 0 to 3600 seconds.');
    }
    const startedAt = now.toISOString();
    const endsAt = new Date(now.getTime() + seconds * 1_000).toISOString();
    return this.updateSession(id, (session) => ({
      ...this.requireMutableSession(session),
      restStartedAt: startedAt,
      restEndsAt: endsAt,
      updatedAt: startedAt,
    }));
  }

  async clearRest(id: string): Promise<WorkoutSession> {
    return this.updateSession(id, (session, timestamp) => ({
      ...this.requireMutableSession(session),
      restStartedAt: null,
      restEndsAt: null,
      updatedAt: timestamp,
    }));
  }

  async extendRest(id: string, seconds = 30): Promise<WorkoutSession> {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600)
      throw new Error('Invalid rest extension.');
    return this.updateSession(id, (session, timestamp) => ({
      ...this.requireMutableSession(session),
      restStartedAt: session.restStartedAt ?? timestamp,
      restEndsAt: new Date(
        Math.max(Date.now(), session.restEndsAt ? Date.parse(session.restEndsAt) : 0) +
          seconds * 1000,
      ).toISOString(),
      updatedAt: timestamp,
    }));
  }

  async pause(id: string, now = new Date()): Promise<WorkoutSession> {
    return this.updateSession(id, (session) => {
      if (session.status !== 'active') throw new Error('Only an active workout can be paused.');
      const timestamp = now.toISOString();
      return { ...session, status: 'paused', pausedAt: timestamp, updatedAt: timestamp };
    });
  }

  async resume(id: string, now = new Date()): Promise<WorkoutSession> {
    return this.updateSession(id, (session) => {
      if (session.status !== 'paused' || session.pausedAt === null) {
        throw new Error('Only a paused workout can be resumed.');
      }
      const timestamp = now.toISOString();
      const addedSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(session.pausedAt).getTime()) / 1_000),
      );
      return {
        ...session,
        status: 'active',
        pausedAt: null,
        pausedDurationSeconds: session.pausedDurationSeconds + addedSeconds,
        updatedAt: timestamp,
      };
    });
  }

  async finish(id: string, now = new Date()): Promise<WorkoutSession> {
    return this.updateSession(id, (session) => {
      this.requireMutableSession(session);
      const timestamp = now.toISOString();
      const pausedSeconds =
        session.status === 'paused' && session.pausedAt
          ? Math.max(0, Math.floor((now.getTime() - new Date(session.pausedAt).getTime()) / 1_000))
          : 0;
      return {
        ...session,
        status: 'completed',
        endedAt: timestamp,
        pausedAt: null,
        pausedDurationSeconds: session.pausedDurationSeconds + pausedSeconds,
        restStartedAt: null,
        restEndsAt: null,
        updatedAt: timestamp,
      };
    });
  }

  async discard(id: string): Promise<WorkoutSession> {
    return this.updateSession(id, (session, timestamp) => ({
      ...this.requireMutableSession(session),
      status: 'discarded',
      endedAt: timestamp,
      pausedAt: null,
      restStartedAt: null,
      restEndsAt: null,
      updatedAt: timestamp,
    }));
  }

  async setSessionStatus(id: string, status: WorkoutSessionStatus): Promise<WorkoutSession> {
    if (status === 'completed') return this.finish(id);
    if (status === 'paused') return this.pause(id);
    if (status === 'discarded') return this.discard(id);
    const current = await this.db.workoutSessions.get(id);
    if (current?.status === 'paused') return this.resume(id);
    if (current?.status === 'active') return current;
    throw new Error('A finished workout cannot be resumed.');
  }

  async getUnfinished(): Promise<WorkoutGraph | undefined> {
    const candidates = await this.db.workoutSessions
      .where('status')
      .anyOf(['active', 'paused'])
      .toArray();
    const latest = candidates.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    )[0];
    return latest ? this.get(latest.id) : undefined;
  }

  async listCompleted(limit = 10): Promise<WorkoutGraph[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('Completed workout limit must be a positive integer.');
    }
    const sessions = (await this.db.workoutSessions.where('status').equals('completed').toArray())
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .slice(0, limit);
    const graphs = await Promise.all(sessions.map(({ id }) => this.get(id)));
    return graphs.filter((graph): graph is WorkoutGraph => graph !== undefined);
  }

  async getPreviousCompletedExercise(
    exerciseId: string,
    beforeStartedAt?: string,
  ): Promise<WorkoutExerciseWithSets | undefined> {
    const sessionExercises = await this.db.workoutExercises
      .where('exerciseId')
      .equals(exerciseId)
      .toArray();
    if (!sessionExercises.length) return undefined;
    const sessions = await this.db.workoutSessions.where('status').equals('completed').toArray();
    const eligible = sessions
      .filter(({ startedAt }) => beforeStartedAt === undefined || startedAt < beforeStartedAt)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    for (const session of eligible) {
      const candidates = sessionExercises
        .filter(({ workoutSessionId }) => workoutSessionId === session.id)
        .sort((a, b) => a.order - b.order);
      for (const matching of candidates) {
        const sets = (
          await this.db.workoutSets.where('workoutExerciseId').equals(matching.id).toArray()
        )
          .map((set) => workoutSetSchema.parse(set))
          .filter(({ completed }) => completed)
          .sort((left, right) => left.setNumber - right.setNumber);
        if (sets.length) return { exercise: workoutExerciseSchema.parse(matching), sets };
      }
    }
    return undefined;
  }

  async get(id: string): Promise<WorkoutGraph | undefined> {
    return this.db.transaction(
      'r',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const rawSession = await this.db.workoutSessions.get(id);
        if (rawSession === undefined) return undefined;
        const session = workoutSessionSchema.parse(rawSession);
        const exercises = (
          await this.db.workoutExercises.where('workoutSessionId').equals(id).sortBy('order')
        ).map((exercise) => workoutExerciseSchema.parse(exercise));
        const exerciseIds = exercises.map((exercise) => exercise.id);
        const allSets = exerciseIds.length
          ? await this.db.workoutSets.where('workoutExerciseId').anyOf(exerciseIds).toArray()
          : [];
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
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const set = requireRecord(await this.db.workoutSets.get(id), 'WorkoutSet', id);
        const exercise = requireRecord(
          await this.db.workoutExercises.get(set.workoutExerciseId),
          'WorkoutExercise',
          set.workoutExerciseId,
        );
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(exercise.workoutSessionId),
            'WorkoutSession',
            exercise.workoutSessionId,
          ),
        );
        await this.db.workoutSets.delete(id);
        await this.touchSession(session, createTimestamp());
      },
    );
  }

  async removeExercise(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises, this.db.workoutSets],
      async () => {
        const exercise = requireRecord(
          await this.db.workoutExercises.get(id),
          'WorkoutExercise',
          id,
        );
        const session = this.requireMutableSession(
          requireRecord(
            await this.db.workoutSessions.get(exercise.workoutSessionId),
            'WorkoutSession',
            exercise.workoutSessionId,
          ),
        );
        await this.db.workoutSets.where('workoutExerciseId').equals(id).delete();
        await this.db.workoutExercises.delete(id);
        const remaining = await this.db.workoutExercises
          .where('workoutSessionId')
          .equals(session.id)
          .sortBy('order');
        if (remaining.length) {
          await this.db.workoutExercises.bulkDelete(remaining.map(({ id: itemId }) => itemId));
          await this.db.workoutExercises.bulkAdd(
            remaining.map((item, index) =>
              workoutExerciseSchema.parse({ ...item, order: index + 1 }),
            ),
          );
        }
        await this.db.workoutSessions.put(
          workoutSessionSchema.parse({
            ...session,
            currentExerciseId:
              session.currentExerciseId === id
                ? (remaining[0]?.id ?? null)
                : session.currentExerciseId,
            updatedAt: createTimestamp(),
          }),
        );
      },
    );
  }

  async reorderExercises(sessionId: string, orderedIds: readonly string[]): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.workoutSessions, this.db.workoutExercises],
      async () => {
        const session = this.requireMutableSession(
          requireRecord(await this.db.workoutSessions.get(sessionId), 'WorkoutSession', sessionId),
        );
        const current = await this.db.workoutExercises
          .where('workoutSessionId')
          .equals(sessionId)
          .toArray();
        if (
          current.length !== orderedIds.length ||
          new Set(orderedIds).size !== orderedIds.length ||
          current.some(({ id }) => !orderedIds.includes(id))
        ) {
          throw new Error('Reordering session exercises requires every existing ID exactly once.');
        }
        const byId = new Map(current.map((exercise) => [exercise.id, exercise]));
        const timestamp = createTimestamp();
        const reordered = orderedIds.map((id, index) =>
          workoutExerciseSchema.parse({
            ...requireRecord(byId.get(id), 'WorkoutExercise', id),
            order: index + 1,
            updatedAt: timestamp,
          }),
        );
        await this.db.workoutExercises.bulkDelete([...orderedIds]);
        await this.db.workoutExercises.bulkAdd(reordered);
        await this.touchSession(session, timestamp);
      },
    );
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
        if (exerciseIds.length) {
          await this.db.workoutSets.where('workoutExerciseId').anyOf(exerciseIds).delete();
        }
        await this.db.workoutExercises.where('workoutSessionId').equals(id).delete();
        await this.db.workoutSessions.delete(id);
      },
    );
  }

  private createSessionRecord(
    input: CreateWorkoutSessionInput & {
      programId: string | null;
      programDayId: string | null;
      startedAt: string;
      timestamp: string;
    },
  ): WorkoutSession {
    return workoutSessionSchema.parse({
      id: createEntityId(),
      programId: input.programId,
      programDayId: input.programDayId,
      name: input.name ?? null,
      status: 'active',
      startedAt: input.startedAt,
      scheduledDate: localDateKey(new Date(input.startedAt)),
      endedAt: null,
      pausedAt: null,
      pausedDurationSeconds: 0,
      currentExerciseId: null,
      restStartedAt: null,
      restEndsAt: null,
      notes: input.notes ?? null,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
    });
  }

  private createExerciseSnapshot(
    sessionId: string,
    prescription: ProgramExercise,
    exerciseName: string,
    timestamp: string,
  ): WorkoutExercise {
    return workoutExerciseSchema.parse({
      id: createEntityId(),
      workoutSessionId: sessionId,
      exerciseId: prescription.exerciseId,
      programExerciseId: prescription.id,
      exerciseName,
      order: prescription.order,
      plannedTargetSets: prescription.targetSets,
      plannedMinReps: prescription.minReps,
      plannedMaxReps: prescription.maxReps,
      plannedRirMin: prescription.targetRirMin,
      plannedRirMax: prescription.targetRirMax,
      plannedRestSeconds: prescription.restSeconds,
      plannedNotes: prescription.notes,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private requireMutableSession(session: WorkoutSession): WorkoutSession {
    if (!unfinished(session.status)) throw new Error('A finished workout cannot be changed.');
    return session;
  }

  private async requireNoUnfinishedSession(): Promise<void> {
    if (await this.db.workoutSessions.where('status').anyOf(['active', 'paused']).first()) {
      throw new Error('Finish or discard the current workout before starting another.');
    }
  }

  private async touchSession(session: WorkoutSession, timestamp: string): Promise<void> {
    await this.db.workoutSessions.put(
      workoutSessionSchema.parse({ ...session, updatedAt: timestamp }),
    );
  }

  private async updateSession(
    id: string,
    update: (session: WorkoutSession, timestamp: string) => WorkoutSession,
  ): Promise<WorkoutSession> {
    return this.db.transaction('rw', this.db.workoutSessions, async () => {
      const current = requireRecord(await this.db.workoutSessions.get(id), 'WorkoutSession', id);
      const updated = workoutSessionSchema.parse(update(current, createTimestamp()));
      await this.db.workoutSessions.put(updated);
      return updated;
    });
  }
}

export const workoutRepository = new WorkoutRepository();

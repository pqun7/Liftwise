import type { Program, ProgramDay, ProgramExercise } from '../../../domain/entities';
import { programDaySchema, programExerciseSchema, programSchema } from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { createEntityId, createTimestamp, requireRecord } from './shared';

export interface CreateProgramInput {
  name: string;
  description?: string | null;
}

export interface CreateProgramDayInput {
  programId: string;
  name: string;
  dayNumber: number;
}

export interface CreateProgramExerciseInput {
  programDayId: string;
  exerciseId: string;
  order: number;
  targetSets?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  notes?: string | null;
}

export interface ProgramDayWithExercises {
  day: ProgramDay;
  exercises: ProgramExercise[];
}

export interface ProgramGraph {
  program: Program;
  days: ProgramDayWithExercises[];
}

export class ProgramRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async create(input: CreateProgramInput): Promise<Program> {
    const timestamp = createTimestamp();
    const program = programSchema.parse({
      id: createEntityId(),
      name: input.name,
      description: input.description ?? null,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.db.programs.add(program);
    return program;
  }

  async addDay(input: CreateProgramDayInput): Promise<ProgramDay> {
    return this.db.transaction('rw', [this.db.programs, this.db.programDays], async () => {
      requireRecord(await this.db.programs.get(input.programId), 'Program', input.programId);
      const timestamp = createTimestamp();
      const day = programDaySchema.parse({
        id: createEntityId(),
        programId: input.programId,
        name: input.name,
        dayNumber: input.dayNumber,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await this.db.programDays.add(day);
      return day;
    });
  }

  async addExercise(input: CreateProgramExerciseInput): Promise<ProgramExercise> {
    return this.db.transaction(
      'rw',
      [this.db.programDays, this.db.exercises, this.db.programExercises],
      async () => {
        requireRecord(
          await this.db.programDays.get(input.programDayId),
          'ProgramDay',
          input.programDayId,
        );
        requireRecord(await this.db.exercises.get(input.exerciseId), 'Exercise', input.exerciseId);

        const timestamp = createTimestamp();
        const programExercise = programExerciseSchema.parse({
          id: createEntityId(),
          programDayId: input.programDayId,
          exerciseId: input.exerciseId,
          order: input.order,
          targetSets: input.targetSets ?? null,
          targetRepsMin: input.targetRepsMin ?? null,
          targetRepsMax: input.targetRepsMax ?? null,
          notes: input.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        await this.db.programExercises.add(programExercise);
        return programExercise;
      },
    );
  }

  async get(id: string): Promise<ProgramGraph | undefined> {
    return this.db.transaction(
      'r',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const rawProgram = await this.db.programs.get(id);
        if (rawProgram === undefined) {
          return undefined;
        }

        const program = programSchema.parse(rawProgram);
        const days = (
          await this.db.programDays.where('programId').equals(id).sortBy('dayNumber')
        ).map((day) => programDaySchema.parse(day));
        const dayIds = days.map((day) => day.id);
        const allExercises =
          dayIds.length === 0
            ? []
            : await this.db.programExercises.where('programDayId').anyOf(dayIds).toArray();

        return {
          program,
          days: days.map((day) => ({
            day,
            exercises: allExercises
              .filter((exercise) => exercise.programDayId === day.id)
              .map((exercise) => programExerciseSchema.parse(exercise))
              .sort((left, right) => left.order - right.order),
          })),
        };
      },
    );
  }

  async deleteDay(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutExercises,
        this.db.workoutSessions,
      ],
      async () => {
        requireRecord(await this.db.programDays.get(id), 'ProgramDay', id);
        const programExerciseIds = await this.db.programExercises
          .where('programDayId')
          .equals(id)
          .primaryKeys();
        if (programExerciseIds.length > 0) {
          await this.db.workoutExercises
            .where('programExerciseId')
            .anyOf(programExerciseIds)
            .modify({ programExerciseId: null });
        }
        await this.db.programExercises.where('programDayId').equals(id).delete();
        await this.db.workoutSessions
          .where('programDayId')
          .equals(id)
          .modify({ programDayId: null });
        await this.db.programDays.delete(id);
      },
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutExercises,
        this.db.workoutSessions,
      ],
      async () => {
        requireRecord(await this.db.programs.get(id), 'Program', id);
        const dayIds = await this.db.programDays.where('programId').equals(id).primaryKeys();

        if (dayIds.length > 0) {
          const programExerciseIds = await this.db.programExercises
            .where('programDayId')
            .anyOf(dayIds)
            .primaryKeys();
          if (programExerciseIds.length > 0) {
            await this.db.workoutExercises
              .where('programExerciseId')
              .anyOf(programExerciseIds)
              .modify({ programExerciseId: null });
          }
          await this.db.programExercises.where('programDayId').anyOf(dayIds).delete();
          await this.db.workoutSessions
            .where('programDayId')
            .anyOf(dayIds)
            .modify({ programDayId: null });
        }

        await this.db.workoutSessions.where('programId').equals(id).modify({ programId: null });
        await this.db.programDays.where('programId').equals(id).delete();
        await this.db.programs.delete(id);
      },
    );
  }

  async deleteExercise(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.programExercises, this.db.workoutExercises],
      async () => {
        requireRecord(await this.db.programExercises.get(id), 'ProgramExercise', id);
        await this.db.workoutExercises
          .where('programExerciseId')
          .equals(id)
          .modify({ programExerciseId: null });
        await this.db.programExercises.delete(id);
      },
    );
  }
}

export const programRepository = new ProgramRepository();

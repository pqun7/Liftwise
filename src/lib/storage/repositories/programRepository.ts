import type { AppSetting, Program, ProgramDay, ProgramExercise } from '../../../domain/entities';
import {
  appSettingSchema,
  programDaySchema,
  programExerciseSchema,
  programSchema,
} from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { createEntityId, createTimestamp, parseMany, requireRecord } from './shared';

const ACTIVE_PROGRAM_KEY = 'activeProgramId';

export interface CreateProgramInput {
  scheduleType?: Program['scheduleType'];
  name: string;
  description?: string | null;
  goal?: Program['goal'];
  level?: Program['level'];
  splitTemplate?: Program['splitTemplate'];
  draft?: boolean;
}

export interface UpdateProgramInput {
  scheduleType?: Program['scheduleType'];
  name?: string;
  description?: string | null;
  archived?: boolean;
  goal?: Program['goal'];
  level?: Program['level'];
  splitTemplate?: Program['splitTemplate'];
  draft?: boolean;
}

export interface CreateProgramDayInput {
  kind?: ProgramDay['kind'];
  programId: string;
  name: string;
  order?: number;
  notes?: string | null;
  weekday?: number | null;
  defaultRestSeconds?: number | null;
}

export interface UpdateProgramDayInput {
  kind?: ProgramDay['kind'];
  name?: string;
  notes?: string | null;
  weekday?: number | null;
  defaultRestSeconds?: number | null;
}

export interface ProgramExercisePrescriptionInput {
  targetSets?: number | null;
  minReps?: number | null;
  maxReps?: number | null;
  targetRirMin?: number | null;
  targetRirMax?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
}

export interface CreateProgramExerciseInput extends ProgramExercisePrescriptionInput {
  programDayId: string;
  exerciseId: string;
  order?: number;
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

  async list(): Promise<Program[]> {
    const programs = parseMany(programSchema, await this.db.programs.toArray());
    return programs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async create(input: CreateProgramInput): Promise<Program> {
    return this.db.transaction('rw', [this.db.programs, this.db.appSettings], async () => {
      const timestamp = createTimestamp();
      const program = programSchema.parse({
        ...input,
        id: createEntityId(),
        name: input.name,
        description: input.description ?? null,
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await this.db.programs.add(program);
      if (!program.draft && (await this.db.appSettings.get(ACTIVE_PROGRAM_KEY)) === undefined) {
        await this.db.appSettings.put(
          appSettingSchema.parse({
            key: ACTIVE_PROGRAM_KEY,
            value: program.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        );
      }
      return program;
    });
  }

  async update(id: string, input: UpdateProgramInput): Promise<Program> {
    return this.db.transaction('rw', [this.db.programs, this.db.appSettings], async () => {
      const current = requireRecord(await this.db.programs.get(id), 'Program', id);
      const updated = programSchema.parse({
        ...current,
        ...input,
        name: input.name ?? current.name,
        goal: input.goal ?? current.goal,
        level: input.level ?? current.level,
        splitTemplate: input.splitTemplate ?? current.splitTemplate,
        draft: input.draft ?? current.draft,
        description: input.description === undefined ? current.description : input.description,
        archived: input.archived ?? current.archived,
        updatedAt: createTimestamp(),
      });
      await this.db.programs.put(updated);
      if ((updated.archived || updated.draft) && (await this.getActiveIdInTransaction()) === id) {
        await this.db.appSettings.delete(ACTIVE_PROGRAM_KEY);
      }
      return updated;
    });
  }

  async duplicate(id: string): Promise<ProgramGraph> {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const source = requireRecord(await this.db.programs.get(id), 'Program', id);
        const sourceDays = await this.db.programDays.where('programId').equals(id).sortBy('order');
        const dayIds = sourceDays.map((day) => day.id);
        const sourceExercises = dayIds.length
          ? await this.db.programExercises.where('programDayId').anyOf(dayIds).toArray()
          : [];
        const timestamp = createTimestamp();
        const program = programSchema.parse({
          ...source,
          id: createEntityId(),
          name: `${source.name} Copy`,
          archived: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        const dayIdMap = new Map<string, string>();
        const days = sourceDays.map((sourceDay) => {
          const day = programDaySchema.parse({
            ...sourceDay,
            id: createEntityId(),
            programId: program.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          dayIdMap.set(sourceDay.id, day.id);
          return day;
        });
        const exercises = sourceExercises.map((sourceExercise) =>
          programExerciseSchema.parse({
            ...sourceExercise,
            id: createEntityId(),
            programDayId: requireRecord(
              dayIdMap.get(sourceExercise.programDayId),
              'Duplicated ProgramDay',
              sourceExercise.programDayId,
            ),
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        );
        await this.db.programs.add(program);
        if (days.length) await this.db.programDays.bulkAdd(days);
        if (exercises.length) await this.db.programExercises.bulkAdd(exercises);
        return {
          program,
          days: days.map((day) => ({
            day,
            exercises: exercises
              .filter((exercise) => exercise.programDayId === day.id)
              .sort((left, right) => left.order - right.order),
          })),
        };
      },
    );
  }

  async setActive(id: string | null): Promise<void> {
    await this.db.transaction('rw', [this.db.programs, this.db.appSettings], async () => {
      if (id === null) {
        await this.db.appSettings.delete(ACTIVE_PROGRAM_KEY);
        return;
      }
      const program = requireRecord(await this.db.programs.get(id), 'Program', id);
      if (program.archived || program.draft)
        throw new Error('Save this program before activating it.');
      const current = await this.db.appSettings.get(ACTIVE_PROGRAM_KEY);
      const timestamp = createTimestamp();
      const setting: AppSetting = appSettingSchema.parse({
        key: ACTIVE_PROGRAM_KEY,
        value: id,
        createdAt: current?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
      await this.db.appSettings.put(setting);
    });
  }

  async getActiveId(): Promise<string | null> {
    return this.db.transaction('r', this.db.appSettings, () => this.getActiveIdInTransaction());
  }

  async addDay(input: CreateProgramDayInput): Promise<ProgramDay> {
    return this.db.transaction('rw', [this.db.programs, this.db.programDays], async () => {
      const program = requireRecord(
        await this.db.programs.get(input.programId),
        'Program',
        input.programId,
      );
      const existing = await this.db.programDays
        .where('programId')
        .equals(input.programId)
        .toArray();
      const timestamp = createTimestamp();
      const day = programDaySchema.parse({
        kind: input.kind,
        weekday: input.weekday,
        defaultRestSeconds: input.defaultRestSeconds,
        id: createEntityId(),
        programId: input.programId,
        name: input.name,
        order: input.order ?? existing.length + 1,
        notes: input.notes ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (program.scheduleType !== 'cycle' && existing.length >= 7)
        throw new Error('A program can contain at most seven training days.');
      if (day.weekday != null && existing.some((item) => item.weekday === day.weekday))
        throw new Error('This weekday already has a training day.');
      await this.db.programDays.add(day);
      await this.db.programs.put({ ...program, updatedAt: timestamp });
      return day;
    });
  }

  async updateDay(id: string, input: UpdateProgramDayInput): Promise<ProgramDay> {
    return this.db.transaction('rw', [this.db.programs, this.db.programDays], async () => {
      const current = requireRecord(await this.db.programDays.get(id), 'ProgramDay', id);
      const timestamp = createTimestamp();
      const updated = programDaySchema.parse({
        ...current,
        ...input,
        name: input.name ?? current.name,
        notes: input.notes === undefined ? current.notes : input.notes,
        updatedAt: timestamp,
      });
      const siblings = await this.db.programDays
        .where('programId')
        .equals(current.programId)
        .toArray();
      if (
        updated.weekday != null &&
        siblings.some((item) => item.id !== id && item.weekday === updated.weekday)
      )
        throw new Error('This weekday already has a training day.');
      await this.db.programDays.put(updated);
      await this.touchProgram(current.programId, timestamp);
      return updated;
    });
  }

  async duplicateDay(id: string, weekday?: number): Promise<ProgramDayWithExercises> {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const source = requireRecord(await this.db.programDays.get(id), 'ProgramDay', id);
        const siblings = await this.db.programDays
          .where('programId')
          .equals(source.programId)
          .toArray();
        const timestamp = createTimestamp();
        const program = requireRecord(
          await this.db.programs.get(source.programId),
          'Program',
          source.programId,
        );
        if (program.scheduleType !== 'cycle' && siblings.length >= 7)
          throw new Error('A program can contain at most seven training days.');
        if (weekday != null && siblings.some((item) => item.weekday === weekday))
          throw new Error('This weekday already has a training day.');
        const day = programDaySchema.parse({
          ...source,
          id: createEntityId(),
          name: `${source.name.slice(0, 115)} Copy`,
          order: siblings.length + 1,
          weekday: weekday ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        const exercises = (
          await this.db.programExercises.where('programDayId').equals(id).sortBy('order')
        ).map((sourceExercise) =>
          programExerciseSchema.parse({
            ...sourceExercise,
            id: createEntityId(),
            programDayId: day.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        );
        await this.db.programDays.add(day);
        if (exercises.length) await this.db.programExercises.bulkAdd(exercises);
        await this.touchProgram(source.programId, timestamp);
        return { day, exercises };
      },
    );
  }

  async reorderDays(programId: string, orderedIds: readonly string[]): Promise<void> {
    await this.db.transaction('rw', [this.db.programs, this.db.programDays], async () => {
      requireRecord(await this.db.programs.get(programId), 'Program', programId);
      const current = await this.db.programDays.where('programId').equals(programId).toArray();
      this.requireExactOrder(
        current.map((day) => day.id),
        orderedIds,
        'program days',
      );
      const byId = new Map(current.map((day) => [day.id, day]));
      const timestamp = createTimestamp();
      const reordered = orderedIds.map((id, index) =>
        programDaySchema.parse({
          ...requireRecord(byId.get(id), 'ProgramDay', id),
          order: index + 1,
          updatedAt: timestamp,
        }),
      );
      await this.db.programDays.bulkDelete([...orderedIds]);
      await this.db.programDays.bulkAdd(reordered);
      await this.touchProgram(programId, timestamp);
    });
  }

  async addExercise(input: CreateProgramExerciseInput): Promise<ProgramExercise> {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.exercises, this.db.programExercises],
      async () => {
        const day = requireRecord(
          await this.db.programDays.get(input.programDayId),
          'ProgramDay',
          input.programDayId,
        );
        if (day.kind === 'recovery') throw new Error('Recovery days cannot contain exercises.');
        requireRecord(await this.db.exercises.get(input.exerciseId), 'Exercise', input.exerciseId);
        const existing = await this.db.programExercises
          .where('programDayId')
          .equals(input.programDayId)
          .toArray();
        const timestamp = createTimestamp();
        const programExercise = programExerciseSchema.parse({
          id: createEntityId(),
          programDayId: input.programDayId,
          exerciseId: input.exerciseId,
          order: input.order ?? existing.length + 1,
          targetSets: input.targetSets ?? null,
          minReps: input.minReps ?? null,
          maxReps: input.maxReps ?? null,
          targetRirMin: input.targetRirMin ?? null,
          targetRirMax: input.targetRirMax ?? null,
          restSeconds: input.restSeconds ?? null,
          notes: input.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        await this.db.programExercises.add(programExercise);
        await this.touchProgram(day.programId, timestamp);
        return programExercise;
      },
    );
  }

  async updateExercise(
    id: string,
    input: ProgramExercisePrescriptionInput,
  ): Promise<ProgramExercise> {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const current = requireRecord(
          await this.db.programExercises.get(id),
          'ProgramExercise',
          id,
        );
        const day = requireRecord(
          await this.db.programDays.get(current.programDayId),
          'ProgramDay',
          current.programDayId,
        );
        const timestamp = createTimestamp();
        const updated = programExerciseSchema.parse({
          ...current,
          targetSets: input.targetSets === undefined ? current.targetSets : input.targetSets,
          minReps: input.minReps === undefined ? current.minReps : input.minReps,
          maxReps: input.maxReps === undefined ? current.maxReps : input.maxReps,
          targetRirMin:
            input.targetRirMin === undefined ? current.targetRirMin : input.targetRirMin,
          targetRirMax:
            input.targetRirMax === undefined ? current.targetRirMax : input.targetRirMax,
          restSeconds: input.restSeconds === undefined ? current.restSeconds : input.restSeconds,
          notes: input.notes === undefined ? current.notes : input.notes,
          updatedAt: timestamp,
        });
        await this.db.programExercises.put(updated);
        await this.touchProgram(day.programId, timestamp);
        return updated;
      },
    );
  }

  async transferExercise(id: string, destinationDayId: string, duplicate = false): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const source = requireRecord(await this.db.programExercises.get(id), 'ProgramExercise', id);
        const from = requireRecord(
          await this.db.programDays.get(source.programDayId),
          'ProgramDay',
          source.programDayId,
        );
        const to = requireRecord(
          await this.db.programDays.get(destinationDayId),
          'ProgramDay',
          destinationDayId,
        );
        if (from.programId !== to.programId) throw new Error('Choose a day in the same program.');
        if (to.kind === 'recovery') throw new Error('Recovery days cannot contain exercises.');
        if (from.id === to.id) throw new Error('Choose another day.');
        const destination = await this.db.programExercises
          .where('programDayId')
          .equals(to.id)
          .sortBy('order');
        if (destination.some((entry) => entry.exerciseId === source.exerciseId))
          throw new Error('This exercise already exists on the destination day.');
        const timestamp = createTimestamp();
        const moved = programExerciseSchema.parse({
          ...source,
          id: duplicate ? createEntityId() : source.id,
          programDayId: to.id,
          order: destination.length + 1,
          createdAt: duplicate ? timestamp : source.createdAt,
          updatedAt: timestamp,
        });
        if (!duplicate) await this.db.programExercises.delete(source.id);
        await this.db.programExercises.add(moved);
        if (!duplicate) {
          const remaining = await this.db.programExercises
            .where('programDayId')
            .equals(from.id)
            .sortBy('order');
          await this.db.programExercises.bulkDelete(remaining.map((entry) => entry.id));
          await this.db.programExercises.bulkAdd(
            remaining.map((entry, index) =>
              programExerciseSchema.parse({ ...entry, order: index + 1, updatedAt: timestamp }),
            ),
          );
        }
        await this.touchProgram(from.programId, timestamp);
      },
    );
  }

  async reorderExercises(programDayId: string, orderedIds: readonly string[]): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const day = requireRecord(
          await this.db.programDays.get(programDayId),
          'ProgramDay',
          programDayId,
        );
        const current = await this.db.programExercises
          .where('programDayId')
          .equals(programDayId)
          .toArray();
        this.requireExactOrder(
          current.map((exercise) => exercise.id),
          orderedIds,
          'exercises',
        );
        const byId = new Map(current.map((exercise) => [exercise.id, exercise]));
        const timestamp = createTimestamp();
        const reordered = orderedIds.map((id, index) =>
          programExerciseSchema.parse({
            ...requireRecord(byId.get(id), 'ProgramExercise', id),
            order: index + 1,
            updatedAt: timestamp,
          }),
        );
        await this.db.programExercises.bulkDelete([...orderedIds]);
        await this.db.programExercises.bulkAdd(reordered);
        await this.touchProgram(day.programId, timestamp);
      },
    );
  }

  async get(id: string): Promise<ProgramGraph | undefined> {
    return this.db.transaction(
      'r',
      [this.db.programs, this.db.programDays, this.db.programExercises],
      async () => {
        const rawProgram = await this.db.programs.get(id);
        if (rawProgram === undefined) return undefined;
        const program = programSchema.parse(rawProgram);
        const days = (await this.db.programDays.where('programId').equals(id).sortBy('order')).map(
          (day) => programDaySchema.parse(day),
        );
        const dayIds = days.map((day) => day.id);
        const allExercises = dayIds.length
          ? await this.db.programExercises.where('programDayId').anyOf(dayIds).toArray()
          : [];
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
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutExercises,
        this.db.workoutSessions,
      ],
      async () => {
        const day = requireRecord(await this.db.programDays.get(id), 'ProgramDay', id);
        const programExerciseIds = await this.db.programExercises
          .where('programDayId')
          .equals(id)
          .primaryKeys();
        if (programExerciseIds.length) {
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
        await this.compactDayOrder(day.programId);
        await this.touchProgram(day.programId, createTimestamp());
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
        this.db.appSettings,
      ],
      async () => {
        requireRecord(await this.db.programs.get(id), 'Program', id);
        const dayIds = await this.db.programDays.where('programId').equals(id).primaryKeys();
        if (dayIds.length) {
          const programExerciseIds = await this.db.programExercises
            .where('programDayId')
            .anyOf(dayIds)
            .primaryKeys();
          if (programExerciseIds.length) {
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
        if ((await this.getActiveIdInTransaction()) === id) {
          await this.db.appSettings.delete(ACTIVE_PROGRAM_KEY);
        }
      },
    );
  }

  async deleteExercise(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises, this.db.workoutExercises],
      async () => {
        const exercise = requireRecord(
          await this.db.programExercises.get(id),
          'ProgramExercise',
          id,
        );
        const day = requireRecord(
          await this.db.programDays.get(exercise.programDayId),
          'ProgramDay',
          exercise.programDayId,
        );
        await this.db.workoutExercises
          .where('programExerciseId')
          .equals(id)
          .modify({ programExerciseId: null });
        await this.db.programExercises.delete(id);
        await this.compactExerciseOrder(day.id);
        await this.touchProgram(day.programId, createTimestamp());
      },
    );
  }

  private async getActiveIdInTransaction(): Promise<string | null> {
    const setting = await this.db.appSettings.get(ACTIVE_PROGRAM_KEY);
    return typeof setting?.value === 'string' ? setting.value : null;
  }

  private async touchProgram(id: string, timestamp: string): Promise<void> {
    const program = requireRecord(await this.db.programs.get(id), 'Program', id);
    await this.db.programs.put(programSchema.parse({ ...program, updatedAt: timestamp }));
  }

  private requireExactOrder(
    currentIds: readonly string[],
    orderedIds: readonly string[],
    label: string,
  ): void {
    if (
      currentIds.length !== orderedIds.length ||
      new Set(orderedIds).size !== orderedIds.length ||
      currentIds.some((id) => !orderedIds.includes(id))
    ) {
      throw new Error(`Reordering ${label} requires each existing ID exactly once.`);
    }
  }

  private async compactDayOrder(programId: string): Promise<void> {
    const days = await this.db.programDays.where('programId').equals(programId).sortBy('order');
    if (!days.length) return;
    await this.db.programDays.bulkDelete(days.map((day) => day.id));
    await this.db.programDays.bulkAdd(
      days.map((day, index) => programDaySchema.parse({ ...day, order: index + 1 })),
    );
  }

  private async compactExerciseOrder(programDayId: string): Promise<void> {
    const exercises = await this.db.programExercises
      .where('programDayId')
      .equals(programDayId)
      .sortBy('order');
    if (!exercises.length) return;
    await this.db.programExercises.bulkDelete(exercises.map((exercise) => exercise.id));
    await this.db.programExercises.bulkAdd(
      exercises.map((exercise, index) =>
        programExerciseSchema.parse({ ...exercise, order: index + 1 }),
      ),
    );
  }
}

export const programRepository = new ProgramRepository();

import type { Exercise } from '../../../domain/entities';
import { exerciseSchema } from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { RelationshipError } from '../errors';
import { createEntityId, createTimestamp, parseMany, requireRecord } from './shared';

export interface CreateExerciseInput {
  name: string;
  notes?: string | null;
}

export interface UpdateExerciseInput {
  name?: string;
  notes?: string | null;
}

export class ExerciseRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async create(input: CreateExerciseInput): Promise<Exercise> {
    const timestamp = createTimestamp();
    const exercise = exerciseSchema.parse({
      id: createEntityId(),
      name: input.name,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.db.exercises.add(exercise);
    return exercise;
  }

  async get(id: string): Promise<Exercise | undefined> {
    const exercise = await this.db.exercises.get(id);
    return exercise === undefined ? undefined : exerciseSchema.parse(exercise);
  }

  async list(): Promise<Exercise[]> {
    return parseMany(exerciseSchema, await this.db.exercises.orderBy('name').toArray());
  }

  async update(id: string, input: UpdateExerciseInput): Promise<Exercise> {
    return this.db.transaction('rw', this.db.exercises, async () => {
      const current = requireRecord(await this.db.exercises.get(id), 'Exercise', id);
      const updated = exerciseSchema.parse({
        ...current,
        ...input,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: createTimestamp(),
      });

      await this.db.exercises.put(updated);
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.exercises, this.db.programExercises, this.db.workoutExercises],
      async () => {
        requireRecord(await this.db.exercises.get(id), 'Exercise', id);

        const [programReference, workoutReference] = await Promise.all([
          this.db.programExercises.where('exerciseId').equals(id).first(),
          this.db.workoutExercises.where('exerciseId').equals(id).first(),
        ]);

        if (programReference !== undefined || workoutReference !== undefined) {
          throw new RelationshipError(
            'An exercise referenced by a program or workout cannot be deleted.',
          );
        }

        await this.db.exercises.delete(id);
      },
    );
  }
}

export const exerciseRepository = new ExerciseRepository();

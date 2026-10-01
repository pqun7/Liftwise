import type { Exercise } from '../../../domain/entities';
import { createExerciseSearchText } from '../../../domain/exerciseSearch';
import { exerciseSchema } from '../../../domain/validation';
import { database, type LiftwiseDatabase } from '../database';
import { RelationshipError } from '../errors';
import { createEntityId, createTimestamp, parseMany, requireRecord } from './shared';

export interface CreateExerciseInput {
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment?: string | null;
  notes?: string | null;
}

export interface UpdateExerciseInput {
  name?: string;
  primaryMuscle?: string;
  secondaryMuscles?: string[];
  equipment?: string | null;
  notes?: string | null;
}

export class ExerciseRepository {
  constructor(private readonly db: LiftwiseDatabase = database) {}

  async create(input: CreateExerciseInput): Promise<Exercise> {
    const timestamp = createTimestamp();
    const id = createEntityId();
    const primaryMuscles = [input.primaryMuscle];
    const secondaryMuscles = input.secondaryMuscles ?? [];
    const equipment = input.equipment ?? null;
    const exercise = exerciseSchema.parse({
      id,
      sourceProvider: 'custom',
      sourceId: id,
      name: input.name,
      description: null,
      instructions: [],
      tips: [],
      category: null,
      forceType: null,
      mechanic: null,
      difficulty: null,
      equipment,
      bodyPart: null,
      primaryMuscles,
      secondaryMuscles,
      goals: [],
      tags: [],
      met: null,
      isUnilateral: false,
      isBodyweight: equipment === null,
      images: { start: null, peak: null, main: null },
      localizations: {
        en: { name: input.name, description: null, instructions: [], tips: [] },
      },
      importedAt: null,
      isActive: true,
      searchText: createExerciseSearchText({
        name: input.name,
        bodyPart: null,
        equipment,
        primaryMuscles,
        secondaryMuscles,
        goals: [],
        tags: [],
      }),
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
    const exercises = parseMany(exerciseSchema, await this.db.exercises.toArray());
    return exercises.sort((left, right) => left.name.localeCompare(right.name));
  }

  async update(id: string, input: UpdateExerciseInput): Promise<Exercise> {
    return this.db.transaction('rw', this.db.exercises, async () => {
      const current = requireRecord(await this.db.exercises.get(id), 'Exercise', id);
      if (current.sourceProvider !== 'custom') {
        throw new RelationshipError(
          'Provider-managed exercises are read-only. Duplicate the exercise as custom first.',
        );
      }
      const name = input.name ?? current.name;
      const primaryMuscles = input.primaryMuscle ? [input.primaryMuscle] : current.primaryMuscles;
      const secondaryMuscles = input.secondaryMuscles ?? current.secondaryMuscles;
      const equipment = input.equipment === undefined ? current.equipment : input.equipment;
      const updated = exerciseSchema.parse({
        ...current,
        name,
        equipment,
        primaryMuscles,
        secondaryMuscles,
        notes: input.notes === undefined ? current.notes : input.notes,
        localizations: {
          ...current.localizations,
          en: { ...current.localizations.en, name },
        },
        searchText: createExerciseSearchText({
          ...current,
          name,
          equipment,
          primaryMuscles,
          secondaryMuscles,
        }),
        id: current.id,
        sourceProvider: current.sourceProvider,
        sourceId: current.sourceId,
        createdAt: current.createdAt,
        updatedAt: createTimestamp(),
      });

      await this.db.exercises.put(updated);
      return updated;
    });
  }

  async duplicateAsCustom(id: string): Promise<Exercise> {
    const source = requireRecord(await this.get(id), 'Exercise', id);
    return this.create({
      name: `${source.name} (Custom)`,
      primaryMuscle: source.primaryMuscles[0] ?? 'unspecified',
      secondaryMuscles: source.secondaryMuscles,
      equipment: source.equipment,
      notes: source.notes,
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

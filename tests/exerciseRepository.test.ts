import { afterEach, describe, expect, it } from 'vitest';

import type { Exercise } from '../src/domain/entities';
import { RelationshipError } from '../src/lib/storage/errors';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);

describe('ExerciseRepository', () => {
  it('creates, updates, reads, and deletes validated exercises', async () => {
    const database = createTestDatabase('exercise-crud');
    const repository = new ExerciseRepository(database);

    const created = await repository.create({ name: 'Back Squat', primaryMuscle: 'quadriceps' });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await repository.get(created.id)).toEqual(created);

    const updated = await repository.update(created.id, { notes: 'High bar' });
    expect(updated.notes).toBe('High bar');
    expect(updated.createdAt).toBe(created.createdAt);

    await repository.delete(created.id);
    await expect(repository.get(created.id)).resolves.toBeUndefined();
  });

  it('rejects invalid persisted records when they cross the repository boundary', async () => {
    const database = createTestDatabase('invalid-exercise');
    const repository = new ExerciseRepository(database);
    const timestamp = new Date().toISOString();

    await database.exercises.add({
      id: crypto.randomUUID(),
      name: '',
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as unknown as Exercise);

    await expect(repository.list()).rejects.toThrow();
  });

  it('prevents deletion while an exercise is referenced by a program', async () => {
    const database = createTestDatabase('exercise-reference');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const exercise = await exercises.create({ name: 'Bench Press', primaryMuscle: 'pectorals' });
    const program = await programs.create({ name: 'Strength' });
    const day = await programs.addDay({ programId: program.id, name: 'Day 1', dayNumber: 1 });
    await programs.addExercise({ programDayId: day.id, exerciseId: exercise.id, order: 1 });

    await expect(exercises.delete(exercise.id)).rejects.toBeInstanceOf(RelationshipError);
  });
});

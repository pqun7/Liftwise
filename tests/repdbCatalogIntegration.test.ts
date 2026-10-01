import { afterEach, describe, expect, it } from 'vitest';

import { seedRepdbCatalog } from '../src/data/providers/repdb/seeder';
import { LiftwiseDatabase } from '../src/lib/storage/database';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { cleanupTestDatabases, createTestDatabase, trackDatabaseName } from './helpers/database';
import { createRawRepdbExercise, createRepdbArtifact, createRepdbMetadata } from './fixtures/repdb';

afterEach(cleanupTestDatabases);

describe('RepDB catalog persistence', () => {
  it('initializes idempotently and does not duplicate catalog records', async () => {
    const database = createTestDatabase('repdb-idempotent');
    const artifact = createRepdbArtifact();

    await expect(seedRepdbCatalog(artifact, database)).resolves.toEqual({
      inserted: 1,
      updated: 0,
      deactivated: 0,
      unchanged: 0,
    });
    await expect(seedRepdbCatalog(artifact, database)).resolves.toEqual({
      inserted: 0,
      updated: 0,
      deactivated: 0,
      unchanged: 1,
    });
    expect(await database.exercises.count()).toBe(1);
  });

  it('survives a database close and application-style reload', async () => {
    const name = `liftwise-repdb-reload-${crypto.randomUUID()}`;
    trackDatabaseName(name);
    const firstDatabase = new LiftwiseDatabase(name);
    await seedRepdbCatalog(createRepdbArtifact(), firstDatabase);
    firstDatabase.close();

    const reloadedDatabase = new LiftwiseDatabase(name);
    const exercise = await new ExerciseRepository(reloadedDatabase).get('repdb:bench-press');
    expect(exercise).toMatchObject({
      id: 'repdb:bench-press',
      sourceProvider: 'repdb',
      name: 'Bench Press',
    });
    expect(await reloadedDatabase.catalogMetadata.get('repdb')).toMatchObject({ exerciseCount: 1 });
    reloadedDatabase.close();
  });

  it('keeps custom exercises alongside provider exercises', async () => {
    const database = createTestDatabase('repdb-custom');
    const repository = new ExerciseRepository(database);
    const custom = await repository.create({
      name: 'My Rehab Press',
      primaryMuscle: 'pectoralis_major',
      equipment: 'band',
    });
    await seedRepdbCatalog(createRepdbArtifact(), database);

    expect(await repository.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: custom.id, sourceProvider: 'custom' }),
        expect.objectContaining({ id: 'repdb:bench-press', sourceProvider: 'repdb' }),
      ]),
    );
  });

  it('deactivates removed provider records while preserving stable program references', async () => {
    const database = createTestDatabase('repdb-update');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    await seedRepdbCatalog(createRepdbArtifact(), database);
    const program = await programs.create({ name: 'Stable plan' });
    const day = await programs.addDay({ programId: program.id, name: 'Day 1', order: 1 });
    await programs.addExercise({
      programDayId: day.id,
      exerciseId: 'repdb:bench-press',
      order: 1,
    });

    const replacement = createRepdbArtifact([
      createRawRepdbExercise({
        id: 'incline-bench-press',
        name_en: 'Incline Bench Press',
        images: { flat: { main: 'images/flat/incline-bench-press.webp' } },
      }),
    ]);
    replacement.metadata = createRepdbMetadata({
      sourceCommit: '1111111111111111111111111111111111111111',
      exerciseCount: 1,
      mediaFileCount: 1,
    });
    const result = await seedRepdbCatalog(replacement, database);

    expect(result).toMatchObject({ inserted: 1, deactivated: 1 });
    await expect(exercises.get('repdb:bench-press')).resolves.toMatchObject({ isActive: false });
    await expect(programs.get(program.id)).resolves.toMatchObject({
      days: [{ exercises: [{ exerciseId: 'repdb:bench-press' }] }],
    });
  });

  it('makes provider exercises read-only and supports duplicating them as custom', async () => {
    const database = createTestDatabase('repdb-readonly');
    const repository = new ExerciseRepository(database);
    await seedRepdbCatalog(createRepdbArtifact(), database);

    await expect(repository.update('repdb:bench-press', { name: 'Edited' })).rejects.toThrow(
      /read-only/i,
    );
    const duplicate = await repository.duplicateAsCustom('repdb:bench-press');
    expect(duplicate).toMatchObject({
      sourceProvider: 'custom',
      name: 'Bench Press (Custom)',
      primaryMuscles: ['pectoralis_major'],
    });
  });
});

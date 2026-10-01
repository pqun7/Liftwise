import { afterEach, describe, expect, it } from 'vitest';

import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { seedRepdbCatalog } from '../src/data/providers/repdb/seeder';
import { createRepdbArtifact } from './fixtures/repdb';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);

describe('ProgramRepository', () => {
  it('persists a program graph with ordered days and exercises', async () => {
    const database = createTestDatabase('program-graph');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const squat = await exercises.create({ name: 'Squat', primaryMuscle: 'quadriceps' });
    const program = await programs.create({ name: 'Two Day' });
    const secondDay = await programs.addDay({
      programId: program.id,
      name: 'Second',
      order: 2,
    });
    const firstDay = await programs.addDay({
      programId: program.id,
      name: 'First',
      order: 1,
    });
    const prescription = await programs.addExercise({
      programDayId: firstDay.id,
      exerciseId: squat.id,
      order: 1,
      targetSets: 3,
      minReps: 5,
      maxReps: 8,
      targetRirMin: 1,
      targetRirMax: 2,
      restSeconds: 180,
    });
    await programs.updateDay(firstDay.id, { name: 'Primary', notes: 'Start here' });
    await programs.updateExercise(prescription.id, { restSeconds: 150, notes: 'Controlled' });

    const graph = await programs.get(program.id);
    expect(graph?.days.map(({ day }) => day.id)).toEqual([firstDay.id, secondDay.id]);
    expect(graph?.days[0]?.day).toMatchObject({ name: 'Primary', notes: 'Start here' });
    expect(graph?.days[0]?.exercises[0]?.exerciseId).toBe(squat.id);
    expect(graph?.days[0]?.exercises[0]).toMatchObject({
      targetSets: 3,
      minReps: 5,
      maxReps: 8,
      targetRirMin: 1,
      targetRirMax: 2,
      restSeconds: 150,
      notes: 'Controlled',
    });
  });

  it('supports program CRUD, active selection, and deep duplication', async () => {
    const database = createTestDatabase('program-crud');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const exercise = await exercises.create({ name: 'Cable Press', primaryMuscle: 'chest' });
    const program = await programs.create({ name: 'Push Pull Legs', description: 'Six days' });
    expect(await programs.getActiveId()).toBe(program.id);
    const updated = await programs.update(program.id, { name: 'PPL', description: 'Three days' });
    const day = await programs.addDay({ programId: program.id, name: 'Push', notes: 'Heavy' });
    await programs.addExercise({
      programDayId: day.id,
      exerciseId: exercise.id,
      targetSets: 3,
      minReps: 6,
      maxReps: 8,
    });

    const copy = await programs.duplicate(program.id);
    expect(updated.name).toBe('PPL');
    expect(copy.program).toMatchObject({ name: 'PPL Copy', description: 'Three days' });
    expect(copy.program.id).not.toBe(program.id);
    expect(copy.days[0]?.day.id).not.toBe(day.id);
    expect(copy.days[0]?.exercises[0]).toMatchObject({
      exerciseId: exercise.id,
      minReps: 6,
      maxReps: 8,
    });
    await programs.setActive(copy.program.id);
    expect(await programs.getActiveId()).toBe(copy.program.id);
    await programs.delete(copy.program.id);
    expect(await programs.getActiveId()).toBeNull();
  });

  it('duplicates and reorders days and exercises atomically', async () => {
    const database = createTestDatabase('program-order');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const firstExercise = await exercises.create({ name: 'Press', primaryMuscle: 'chest' });
    const secondExercise = await exercises.create({ name: 'Raise', primaryMuscle: 'shoulders' });
    const program = await programs.create({ name: 'Order test' });
    const push = await programs.addDay({ programId: program.id, name: 'Push' });
    const pull = await programs.addDay({ programId: program.id, name: 'Pull' });
    const first = await programs.addExercise({
      programDayId: push.id,
      exerciseId: firstExercise.id,
    });
    const second = await programs.addExercise({
      programDayId: push.id,
      exerciseId: secondExercise.id,
    });

    await programs.reorderDays(program.id, [pull.id, push.id]);
    await programs.reorderExercises(push.id, [second.id, first.id]);
    const duplicated = await programs.duplicateDay(push.id);
    const graph = await programs.get(program.id);
    expect(graph?.days.map(({ day }) => [day.name, day.order])).toEqual([
      ['Pull', 1],
      ['Push', 2],
      ['Push Copy', 3],
    ]);
    expect(graph?.days[1]?.exercises.map((item) => item.exerciseId)).toEqual([
      secondExercise.id,
      firstExercise.id,
    ]);
    expect(duplicated.exercises.map((item) => item.exerciseId)).toEqual([
      secondExercise.id,
      firstExercise.id,
    ]);
    await expect(programs.reorderDays(program.id, [push.id, push.id])).rejects.toThrow(
      /each existing ID exactly once/i,
    );
  });

  it('persists RepDB and custom prescriptions exactly across database restart', async () => {
    const database = createTestDatabase('program-reload');
    await seedRepdbCatalog(createRepdbArtifact(), database);
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const custom = await exercises.create({ name: 'My Press', primaryMuscle: 'chest' });
    const program = await programs.create({ name: 'Offline PPL' });
    const day = await programs.addDay({ programId: program.id, name: 'Push Day' });
    await programs.addExercise({
      programDayId: day.id,
      exerciseId: 'repdb:bench-press',
      targetSets: 3,
      minReps: 6,
      maxReps: 8,
      targetRirMin: 1,
      targetRirMax: 2,
      restSeconds: 180,
    });
    await programs.addExercise({
      programDayId: day.id,
      exerciseId: custom.id,
      targetSets: 2,
      minReps: 10,
      maxReps: 12,
      restSeconds: 90,
    });
    const name = database.name;
    database.close();
    const reloaded = new (await import('../src/lib/storage/database')).LiftwiseDatabase(name);
    const graph = await new ProgramRepository(reloaded).get(program.id);
    expect(graph?.days[0]?.exercises).toEqual([
      expect.objectContaining({
        exerciseId: 'repdb:bench-press',
        targetSets: 3,
        minReps: 6,
        maxReps: 8,
        targetRirMin: 1,
        targetRirMax: 2,
        restSeconds: 180,
      }),
      expect.objectContaining({
        exerciseId: custom.id,
        targetSets: 2,
        minReps: 10,
        maxReps: 12,
        restSeconds: 90,
      }),
    ]);
    reloaded.close();
  });

  it('rejects invalid prescriptions and dangling exercise IDs', async () => {
    const database = createTestDatabase('program-validation');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const exercise = await exercises.create({ name: 'Press', primaryMuscle: 'chest' });
    const program = await programs.create({ name: 'Validation' });
    const day = await programs.addDay({ programId: program.id, name: 'Day' });
    await expect(
      programs.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: -1 }),
    ).rejects.toThrow();
    await expect(
      programs.addExercise({
        programDayId: day.id,
        exerciseId: exercise.id,
        minReps: 10,
        maxReps: 8,
      }),
    ).rejects.toThrow();
    await expect(
      programs.addExercise({
        programDayId: day.id,
        exerciseId: exercise.id,
        targetRirMin: 4,
        targetRirMax: 2,
      }),
    ).rejects.toThrow();
    await expect(
      programs.addExercise({ programDayId: day.id, exerciseId: crypto.randomUUID() }),
    ).rejects.toThrow();
  });

  it('cascades program structure deletion but preserves and unlinks workout history', async () => {
    const database = createTestDatabase('program-delete');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const workouts = new WorkoutRepository(database);
    const exercise = await exercises.create({ name: 'Deadlift', primaryMuscle: 'hamstrings' });
    const program = await programs.create({ name: 'Pull' });
    const day = await programs.addDay({ programId: program.id, name: 'Pull Day', order: 1 });
    const plannedExercise = await programs.addExercise({
      programDayId: day.id,
      exerciseId: exercise.id,
      order: 1,
    });
    const session = await workouts.createSession({ programId: program.id, programDayId: day.id });
    await workouts.addExercise({
      workoutSessionId: session.id,
      exerciseId: exercise.id,
      programExerciseId: plannedExercise.id,
      order: 1,
    });

    await programs.delete(program.id);

    expect(await programs.get(program.id)).toBeUndefined();
    expect(await database.programDays.count()).toBe(0);
    expect(await database.programExercises.count()).toBe(0);
    expect((await workouts.get(session.id))?.session).toMatchObject({
      programId: null,
      programDayId: null,
    });
    expect((await workouts.get(session.id))?.exercises[0]?.exercise.programExerciseId).toBeNull();
  });
});

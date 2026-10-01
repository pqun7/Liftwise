import { afterEach, describe, expect, it } from 'vitest';

import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
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
      dayNumber: 2,
    });
    const firstDay = await programs.addDay({
      programId: program.id,
      name: 'First',
      dayNumber: 1,
    });
    await programs.addExercise({
      programDayId: firstDay.id,
      exerciseId: squat.id,
      order: 1,
      targetSets: 3,
      targetRepsMin: 5,
      targetRepsMax: 8,
    });

    const graph = await programs.get(program.id);
    expect(graph?.days.map(({ day }) => day.id)).toEqual([firstDay.id, secondDay.id]);
    expect(graph?.days[0]?.exercises[0]?.exerciseId).toBe(squat.id);
  });

  it('cascades program structure deletion but preserves and unlinks workout history', async () => {
    const database = createTestDatabase('program-delete');
    const exercises = new ExerciseRepository(database);
    const programs = new ProgramRepository(database);
    const workouts = new WorkoutRepository(database);
    const exercise = await exercises.create({ name: 'Deadlift', primaryMuscle: 'hamstrings' });
    const program = await programs.create({ name: 'Pull' });
    const day = await programs.addDay({ programId: program.id, name: 'Pull Day', dayNumber: 1 });
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

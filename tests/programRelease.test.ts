import { afterEach, expect, it } from 'vitest';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { ProgramBuilderService } from '../src/features/plan/builderService';
import { programTemplates } from '../src/features/plan/programTemplates';
import { createRawRepdbExercise } from './fixtures/repdb';
import { transformRepdbExercise } from '../src/data/providers/repdb/adapter';
import { SaveQueue } from '../src/lib/storage/SaveQueue';
import { trainingCalendar } from '../src/domain/trainingCalendar';

afterEach(cleanupTestDatabases);

it('preserves eight sessions including two on Sunday without changing the weekly program', async () => {
  const db = createTestDatabase();
  const programs = new ProgramRepository(db);
  const workouts = new WorkoutRepository(db);
  const builder = new ProgramBuilderService(db);
  const program = await builder.saveBasics({ name: '  Weekly Strength  ' });
  await builder.chooseDays(program.id, [0, 2, 4], 'ppl');
  const exercise = await new ExerciseRepository(db).create({
    name: 'Press',
    primaryMuscle: 'chest',
  });
  const graph = (await programs.get(program.id))!;
  for (const { day } of graph.days)
    await programs.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 1 });
  await builder.finish(program.id);
  const before = await programs.get(program.id);
  const ids: string[] = [];
  for (const index of [0, 1, 2, 3, 4, 5, 6, 6]) {
    const start = new Date(2026, 9, 5 + index, index === 6 && ids.length === 7 ? 18 : 10);
    const scheduled = graph.days.find(({ day }) => day.weekday === index);
    const session = scheduled
      ? (await workouts.startPlannedWorkout(scheduled.day.id, start.toISOString())).session
      : await workouts.createSession({ name: 'Extra', startedAt: start.toISOString() });
    ids.push(session.id);
    await workouts.finish(session.id, new Date(start.getTime() + 3600000));
  }
  db.close();
  await db.open();
  const history = await db.workoutSessions.toArray();
  expect(history).toHaveLength(8);
  expect(new Set(ids).size).toBe(8);
  expect(history.filter(({ programDayId }) => programDayId !== null)).toHaveLength(3);
  expect(history.filter(({ scheduledDate }) => scheduledDate === '2026-10-11')).toHaveLength(2);
  expect(
    history.every(
      ({ status, startedAt, endedAt }) => status === 'completed' && startedAt && endedAt,
    ),
  ).toBe(true);
  expect(await programs.get(program.id)).toEqual(before);
  expect(before!.program.name).toBe('Weekly Strength');
});

it('applies a three-day PPL variation and a seven-day template atomically on selected weekdays', async () => {
  const db = createTestDatabase();
  const programs = new ProgramRepository(db);
  const builder = new ProgramBuilderService(db);
  const ids = new Set(
    programTemplates.flatMap(({ days }) =>
      days.flatMap(({ exercises }) => exercises.map(({ exerciseId }) => exerciseId)),
    ),
  );
  for (const id of ids)
    await db.exercises.add(
      transformRepdbExercise(
        createRawRepdbExercise({ id: id.replace('repdb:', '') }),
        '2026-10-05T10:00:00.000Z',
      ),
    );
  const program = await builder.saveBasics({ name: 'PPL variation' });
  await builder.applyTemplate(program.id, 'ppl-6', false, [4, 0, 2]);
  const three = (await programs.get(program.id))!;
  expect(three.days.map(({ day }) => [day.weekday, day.name])).toEqual([
    [0, 'Push A'],
    [2, 'Pull A'],
    [4, 'Legs A'],
  ]);
  expect(three.days.every(({ exercises }) => exercises.length > 0)).toBe(true);
  await expect(
    builder.applyTemplate(program.id, 'ppl-6', true, [0, 1, 2, 3, 4, 5, 6, 7]),
  ).rejects.toThrow();
  expect(await programs.get(program.id)).toEqual(three);
  await builder.applyTemplate(program.id, 'ppl-6', true, [0, 1, 2, 3, 4, 5, 6]);
  expect((await programs.get(program.id))!.days).toHaveLength(7);
  expect(await db.workoutSessions.count()).toBe(0);
});

it('serializes actual program saves and preserves newer edits after an earlier write fails', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const program = await repo.create({ name: 'Initial' });
  const queue = new SaveQueue();
  await Promise.allSettled([
    queue.save('name', () => repo.update(program.id, { name: 'Push A' })),
    queue.save('name', () => repo.update(program.id, { name: ' ' })),
    queue.save('name', () => repo.update(program.id, { name: 'Push Strength' })),
  ]);
  await queue.flush();
  expect(queue.error).toBeNull();
  db.close();
  await db.open();
  expect((await repo.get(program.id))!.program.name).toBe('Push Strength');
});

it('uses the assigned session date for midnight-spanning completion and ignores future completions', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const workouts = new WorkoutRepository(db);
  const program = await repo.create({ name: 'Midnight' });
  const day = await repo.addDay({ programId: program.id, name: 'Tuesday', weekday: 1 });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Press',
    primaryMuscle: 'chest',
  });
  await repo.addExercise({ programDayId: day.id, exerciseId: exercise.id, targetSets: 1 });
  const session = (
    await workouts.startPlannedWorkout(day.id, new Date(2026, 9, 5, 23, 50).toISOString())
  ).session;
  await workouts.finish(session.id, new Date(2026, 9, 6, 0, 20));
  const history = await db.workoutSessions.toArray();
  const graph = await repo.get(program.id);
  expect(trainingCalendar(graph, history, new Date(2026, 9, 6, 12)).startableToday?.day.id).toBe(
    day.id,
  );
  expect(
    trainingCalendar(
      graph,
      [
        {
          ...history[0]!,
          scheduledDate: '2026-10-06',
          endedAt: new Date(2026, 9, 6, 23).toISOString(),
        },
      ],
      new Date(2026, 9, 6, 12),
    ).startableToday?.day.id,
  ).toBe(day.id);
});

it('loads twenty programs and prescriptions from one to one hundred exercises after reopening', async () => {
  const db = createTestDatabase();
  const programs = new ProgramRepository(db);
  const exercises = new ExerciseRepository(db);
  const catalog = [];
  for (let i = 0; i < 100; i++)
    catalog.push(
      await exercises.create({
        name: `Single-Arm Cable Incline Lat Pulldown ${i}`,
        primaryMuscle: 'back',
      }),
    );
  for (let i = 0; i < 20; i++) {
    const program = await programs.create({
      name: `Advanced Upper Body Hypertrophy Strength Block ${i}`,
    });
    const dayCount = [0, 1, 3, 7][i % 4]!;
    for (let weekday = 0; weekday < dayCount; weekday++) {
      const day = await programs.addDay({
        programId: program.id,
        name: 'Posterior Chain Strength and Hypertrophy Session',
        weekday,
      });
      const exerciseCount = weekday === 0 ? [0, 1, 5, 10, 20, 30, 50, 100][i % 8]! : 1;
      for (const exercise of catalog.slice(0, exerciseCount))
        await programs.addExercise({
          programDayId: day.id,
          exerciseId: exercise.id,
          targetSets: 3,
          minReps: 6,
          maxReps: 10,
        });
    }
  }
  db.close();
  await db.open();
  const list = await programs.list();
  expect(list).toHaveLength(20);
  const graphs = await Promise.all(list.map(({ id }) => programs.get(id)));
  expect(graphs.every((graph) => graph && graph.days.length <= 7)).toBe(true);
  expect(
    graphs.some((graph) => graph?.days.some(({ exercises: targets }) => targets.length === 100)),
  ).toBe(true);
  expect(await db.workoutSessions.count()).toBe(0);
});

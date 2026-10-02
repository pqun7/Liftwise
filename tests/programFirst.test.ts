import { estimatedProgramMinutes } from '../src/features/plan/programDisplay';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { programTemplates } from '../src/features/plan/programTemplates';
import { ProgramBuilderService } from '../src/features/plan/builderService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { WorkoutRepository } from '../src/lib/storage/repositories/workoutRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { repdbCatalogArtifactSchema } from '../src/data/providers/repdb/schema';
import { seedRepdbCatalog } from '../src/data/providers/repdb/seeder';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';
afterEach(cleanupTestDatabases);

async function fixture() {
  const db = createTestDatabase('program-first');
  const artifact: unknown = JSON.parse(readFileSync('public/repdb/catalog.json', 'utf8'));
  await seedRepdbCatalog(repdbCatalogArtifactSchema.parse(artifact), db);
  const builder = new ProgramBuilderService(db);
  const programs = new ProgramRepository(db);
  const program = await builder.saveBasics({ name: 'Evidence-informed' });
  return { db, builder, programs, program };
}

it.each(programTemplates)(
  '$id resolves real stable IDs and produces editable days, targets and snapshots',
  async (template) => {
    const { db, builder, programs, program } = await fixture();
    const graph = (await builder.applyTemplate(program.id, template.id))!;
    expect(graph.days.map(({ day }) => [day.weekday, day.name])).toEqual(
      template.days.map((day) => [day.weekday, day.name]),
    );
    expect(graph.days.map((entry) => entry.exercises.length)).toEqual(
      template.days.map((day) => day.exercises.length),
    );
    const first = graph.days[0]!.exercises[0]!;
    expect(first).toMatchObject({
      targetSets: 3,
      targetRirMin: 1,
      targetRirMax: 3,
      restSeconds: 150,
    });
    await builder.finish(program.id);
    const workout = await new WorkoutRepository(db).startPlannedWorkout(graph.days[0]!.day.id);
    await programs.updateExercise(first.id, { targetSets: 4, maxReps: 12 });
    expect(
      (await new WorkoutRepository(db).get(workout.session.id))!.exercises[0]!.exercise
        .plannedTargetSets,
    ).toBe(3);
    db.close();
    await db.open();
    expect((await programs.get(program.id))!.days[0]!.exercises[0]!.targetSets).toBe(4);
  },
);

it('custom weekday naming, rename and rescheduling preserve IDs and targets', async () => {
  const { builder, programs, program, db } = await fixture();
  const graph = (await builder.chooseDays(program.id, [0, 2, 4], 'custom'))!;
  expect(graph.days.map((entry) => entry.day.name)).toEqual(['Monday', 'Wednesday', 'Friday']);
  const day = graph.days[0]!.day;
  const custom = await new ExerciseRepository(db).create({
    name: 'Custom movement',
    primaryMuscle: 'chest',
  });
  const target = await programs.addExercise({
    programDayId: day.id,
    exerciseId: custom.id,
    targetSets: 3,
    minReps: 6,
    maxReps: 10,
  });
  await programs.updateDay(day.id, { name: 'Push', weekday: 1 });
  const saved = (await programs.get(program.id))!;
  expect(saved.days[0]!.day).toMatchObject({ id: day.id, name: 'Push', weekday: 1 });
  expect(saved.days[0]!.exercises[0]).toEqual(target);
});

it('move and duplicate preserve targets, maintain ordering, reject collisions and survive reopen', async () => {
  const { builder, programs, program, db } = await fixture();
  const graph = (await builder.applyTemplate(program.id, 'upper-lower-4'))!;
  const from = graph.days[0]!,
    to = graph.days[1]!;
  const source = from.exercises[0]!;
  await programs.transferExercise(source.id, to.day.id);
  let saved = (await programs.get(program.id))!;
  expect(saved.days[0]!.exercises.map((entry) => entry.order)).toEqual([1, 2, 3, 4, 5]);
  expect(saved.days[1]!.exercises.at(-1)).toMatchObject({
    id: source.id,
    targetSets: source.targetSets,
    minReps: source.minReps,
    exerciseId: source.exerciseId,
  });
  await expect(programs.transferExercise(source.id, to.day.id)).rejects.toThrow();
  await programs.transferExercise(source.id, from.day.id, true);
  await expect(programs.transferExercise(source.id, from.day.id)).rejects.toThrow('already exists');
  db.close();
  await db.open();
  saved = (await programs.get(program.id))!;
  expect(saved.days[0]!.exercises.at(-1)!.id).not.toBe(source.id);
  expect(saved.days[1]!.exercises.at(-1)!.id).toBe(source.id);
});

it('template replacement requires confirmation and missing media never matters, while missing records or failed writes roll back', async () => {
  const { builder, programs, program, db } = await fixture();
  await builder.applyTemplate(program.id, 'full-body-3');
  const before = await programs.get(program.id);
  await expect(builder.applyTemplate(program.id, 'ppl-6')).rejects.toThrow('Confirm');
  await db.exercises.delete('repdb:hammer-curl');
  await expect(builder.applyTemplate(program.id, 'ppl-6', true)).rejects.toThrow('unavailable');
  expect(await programs.get(program.id)).toEqual(before);
  const failure = vi
    .spyOn(db.programExercises, 'add')
    .mockRejectedValueOnce(new Error('Quota full'));
  await expect(builder.applyTemplate(program.id, 'upper-lower-4', true)).rejects.toThrow(
    'Quota full',
  );
  failure.mockRestore();
  expect(await programs.get(program.id)).toEqual(before);
});

it('duration estimates are derived and omit unknown prescriptions', async () => {
  const { builder, program } = await fixture();
  const graph = await builder.applyTemplate(program.id, 'full-body-3');
  const exercises = graph!.days[0]!.exercises;
  const seconds =
    exercises.reduce(
      (sum, item) => sum + item.targetSets! * 45 + (item.targetSets! - 1) * item.restSeconds!,
      0,
    ) +
    (exercises.length - 1) * 60;
  expect(estimatedProgramMinutes(exercises)).toBe(Math.ceil(seconds / 300) * 5);
  expect(estimatedProgramMinutes([])).toBeNull();
  expect(estimatedProgramMinutes([{ ...exercises[0]!, restSeconds: null }])).toBeNull();
});

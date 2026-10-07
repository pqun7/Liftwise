import { afterEach, describe, expect, it } from 'vitest';
import { ProgramBuilderService, canReplaceStarter } from '../src/features/plan/builderService';
import { programTemplates } from '../src/features/plan/programTemplates';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { createRawRepdbExercise } from './fixtures/repdb';
import { transformRepdbExercise } from '../src/data/providers/repdb/adapter';
import { cleanupTestDatabases, createTestDatabase } from './helpers/database';

afterEach(cleanupTestDatabases);
async function fixture() {
  const db = createTestDatabase();
  const builder = new ProgramBuilderService(db);
  const repo = new ProgramRepository(db);
  for (const id of new Set(
    programTemplates.flatMap(({ days }) =>
      days.flatMap(({ exercises }) => exercises.map(({ exerciseId }) => exerciseId)),
    ),
  ))
    await db.exercises.add(
      transformRepdbExercise(
        createRawRepdbExercise({ id: id.replace('repdb:', '') }),
        '2026-10-07T10:00:00.000Z',
      ),
    );
  return { db, builder, repo };
}
describe('five-step builder data safety', () => {
  it.each(['weekly', 'cycle'] as const)(
    'keeps fresh Custom %s workouts empty until explicit addition and survives reopen',
    async (scheduleType) => {
      const { db, builder, repo } = await fixture();
      const program = await builder.saveBasics({ name: 'Custom', scheduleType });
      const graph = (await builder.selectTemplate(program.id, 'custom'))!;
      expect(graph.days).toHaveLength(3);
      expect(graph.days.every(({ exercises }) => exercises.length === 0)).toBe(true);
      expect(graph.days.map(({ day }) => day.weekday)).toEqual(
        scheduleType === 'weekly' ? [0, 2, 4] : [null, null, null],
      );
      const exercise = await new ExerciseRepository(db).create({
        name: 'My press',
        primaryMuscle: 'chest',
      });
      await repo.addExercise({
        programDayId: graph.days[0]!.day.id,
        exerciseId: exercise.id,
        targetSets: 4,
        minReps: 8,
        maxReps: 12,
        restSeconds: 90,
      });
      await builder.selectTemplate(program.id, 'custom');
      db.close();
      await db.open();
      expect((await repo.get(program.id))!.days[0]!.exercises).toMatchObject([
        { exerciseId: exercise.id, targetSets: 4 },
      ]);
    },
  );
  it('changes untouched starter structure predictably and clears only starter prescriptions for fresh Custom', async () => {
    const { builder, repo } = await fixture();
    const program = await builder.saveBasics({ name: 'Starter', scheduleType: 'weekly' });
    await builder.selectTemplate(program.id, 'full-body-3');
    expect(canReplaceStarter((await repo.get(program.id))!)).toBe(true);
    await builder.selectTemplate(program.id, 'upper-lower-4');
    expect((await repo.get(program.id))!.days.map(({ day }) => day.name)).toEqual([
      'Upper A',
      'Lower A',
      'Upper B',
      'Lower B',
    ]);
    await builder.selectTemplate(program.id, 'custom');
    expect((await repo.get(program.id))!.days.every(({ exercises }) => !exercises.length)).toBe(
      true,
    );
  });
  it('keeps customized draft names and every saved prescription when templates change', async () => {
    const { builder, repo } = await fixture();
    const program = await builder.saveBasics({ name: 'Safe', scheduleType: 'weekly' });
    await builder.selectTemplate(program.id, 'full-body-3');
    const before = (await repo.get(program.id))!;
    await repo.updateDay(before.days[0]!.day.id, { name: 'My workout', notes: 'Keep me' });
    const customized = (await repo.get(program.id))!;
    await builder.selectTemplate(program.id, 'custom');
    expect((await repo.get(program.id))!.days).toEqual(customized.days);
    await builder.finish(program.id);
    await builder.selectTemplate(program.id, 'ppl-6');
    expect((await repo.get(program.id))!.days).toEqual(customized.days);
  });
  it('supports long cycles, real recovery entities, ordering and duplication without a second persistence model', async () => {
    const { db, builder, repo } = await fixture();
    const program = await builder.saveBasics({ name: 'Cycle', scheduleType: 'cycle' });
    await builder.selectTemplate(program.id, 'custom');
    const rest = await repo.addDay({ programId: program.id, name: 'Recovery', kind: 'recovery' });
    for (let index = 0; index < 5; index++)
      await repo.addDay({ programId: program.id, name: `Extra ${index}`, kind: 'workout' });
    const copy = await repo.duplicateDay(rest.id);
    expect(copy.day.kind).toBe('recovery');
    expect(copy.exercises).toEqual([]);
    const ids = (await repo.get(program.id))!.days.map(({ day }) => day.id).reverse();
    await repo.reorderDays(program.id, ids);
    await builder.finish(program.id, false);
    expect(await repo.getActiveId()).toBeNull();
    await expect(
      builder.saveBasics({ name: 'Cycle', scheduleType: 'weekly' }, program.id),
    ).rejects.toThrow('more than seven');
    const exercise = (await db.exercises.toArray())[0]!;
    await expect(
      repo.addExercise({ programDayId: rest.id, exerciseId: exercise.id }),
    ).rejects.toThrow('Recovery');
    db.close();
    await db.open();
    expect((await repo.get(program.id))!.days.map(({ day }) => day.id)).toEqual(ids);
    await repo.setActive(program.id);
    db.close();
    await db.open();
    expect(await repo.getActiveId()).toBe(program.id);
  });
  it('converts schedule types transactionally while retaining workout identity, names, notes and prescriptions', async () => {
    const { builder, repo } = await fixture();
    const program = await builder.saveBasics({ name: 'Convert', scheduleType: 'weekly' });
    await builder.selectTemplate(program.id, 'full-body-3');
    const before = (await repo.get(program.id))!;
    await builder.saveBasics({ name: 'Convert', scheduleType: 'cycle' }, program.id);
    const cycle = (await repo.get(program.id))!;
    expect(cycle.days.every(({ day }) => day.weekday == null)).toBe(true);
    expect(cycle.days.map(({ exercises }) => exercises)).toEqual(
      before.days.map(({ exercises }) => exercises),
    );
    await builder.saveBasics({ name: 'Convert', scheduleType: 'weekly' }, program.id);
    expect((await repo.get(program.id))!.days.map(({ day }) => [day.id, day.name])).toEqual(
      before.days.map(({ day }) => [day.id, day.name]),
    );
  });
});

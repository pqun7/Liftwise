import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ProgramWorkoutDay } from '../src/features/plan/ProgramWorkoutDay';
import { updateProgramDay, transferPrescription } from '../src/features/plan/programService';
import { ProgramRepository } from '../src/lib/storage/repositories/programRepository';
import { ExerciseRepository } from '../src/lib/storage/repositories/exerciseRepository';
import { createTestDatabase, cleanupTestDatabases } from './helpers/database';

vi.mock('../src/features/plan/programService', async (original) => ({
  ...(await original<typeof import('../src/features/plan/programService')>()),
  updateProgramDay: vi.fn(() => Promise.resolve()),
  transferPrescription: vi.fn(() => Promise.resolve()),
}));
afterEach(async () => {
  vi.clearAllMocks();
  await cleanupTestDatabases();
});

it('captures dropdown values before a queued action yields and React restores the controlled select', async () => {
  const db = createTestDatabase();
  const repo = new ProgramRepository(db);
  const program = await repo.create({ name: 'Selections' });
  const first = await repo.addDay({ programId: program.id, name: 'Push', weekday: 0 });
  const second = await repo.addDay({ programId: program.id, name: 'Upper B', weekday: 3 });
  const exercise = await new ExerciseRepository(db).create({
    name: 'Bench',
    primaryMuscle: 'chest',
  });
  const target = await repo.addExercise({
    programDayId: first.id,
    exerciseId: exercise.id,
    targetSets: 3,
  });
  const graph = (await repo.get(program.id))!;
  render(
    <MemoryRouter>
      <ProgramWorkoutDay
        entry={graph.days[0]!}
        graph={graph}
        catalog={new Map([[exercise.id, exercise]])}
        busy={false}
        expanded
        toggle={() => {}}
        duplicate={() => {}}
        dirtyChange={() => {}}
        canLeave={() => true}
        run={async (action) => {
          await Promise.resolve();
          await action();
          return true;
        }}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Options for Push' }));
  fireEvent.change(screen.getByLabelText('Weekday for Push'), { target: { value: '1' } });
  await waitFor(() => expect(updateProgramDay).toHaveBeenCalledWith(first.id, { weekday: 1 }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Bench targets' }));
  fireEvent.change(screen.getByLabelText('Move to Bench'), { target: { value: second.id } });
  await waitFor(() =>
    expect(transferPrescription).toHaveBeenCalledWith(target.id, second.id, false),
  );
});

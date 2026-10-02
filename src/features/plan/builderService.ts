import { z } from 'zod';
import type { Program } from '../../domain/entities';
import { database, type LiftwiseDatabase } from '../../lib/storage/database';
import {
  ProgramRepository,
  type CreateProgramInput,
} from '../../lib/storage/repositories/programRepository';

export const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const splitTemplates = [
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    hint: '3 days · Popular',
    days: [0, 2, 4],
    names: ['Push Day', 'Pull Day', 'Legs Day'],
  },
  {
    id: 'upper-lower',
    name: 'Upper Lower',
    hint: '4 days · Balanced',
    days: [0, 1, 3, 4],
    names: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    hint: '3 days · Simple',
    days: [0, 2, 4],
    names: ['Full Body A', 'Full Body B', 'Full Body C'],
  },
  { id: 'custom', name: 'Custom', hint: 'Create from scratch', days: [], names: [] },
] as const;
export type SplitTemplate = NonNullable<Program['splitTemplate']>;
const daysInput = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((values) => new Set(values).size === values.length, 'Choose each weekday once.');

// Canonical Program/ProgramDay records are the durable draft; there is no parallel exercise graph.
export class ProgramBuilderService {
  private readonly programs: ProgramRepository;
  constructor(private readonly db: LiftwiseDatabase = database) {
    this.programs = new ProgramRepository(db);
  }

  saveBasics(input: CreateProgramInput, id?: string) {
    return id ? this.programs.update(id, input) : this.programs.create({ ...input, draft: true });
  }

  async chooseDays(
    programId: string,
    selected: number[],
    template: SplitTemplate,
    allowRemoval = false,
  ) {
    const ordered = daysInput.parse(selected).sort((a, b) => a - b);
    const split = splitTemplates.find((item) => item.id === template);
    if (!split) throw new Error('Choose a valid split template.');
    return this.db.transaction(
      'rw',
      [
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.workoutExercises,
        this.db.workoutSessions,
        this.db.appSettings,
      ],
      async () => {
        const graph = await this.programs.get(programId);
        if (!graph) throw new Error('Program not found.');
        const unassigned = graph.days.filter(({ day }) => day.weekday == null);
        const assignments = ordered.map((weekday) => ({
          weekday,
          entry: graph.days.find(({ day }) => day.weekday === weekday) ?? unassigned.shift(),
        }));
        const keep = new Set(assignments.flatMap(({ entry }) => (entry ? [entry.day.id] : [])));
        const removed = graph.days.filter(({ day }) => !keep.has(day.id));
        if (removed.length && !allowRemoval)
          throw new Error('Confirm removal of deselected training days first.');
        for (const { day } of removed) await this.programs.deleteDay(day.id);
        const ids: string[] = [];
        for (const [index, { weekday, entry }] of assignments.entries()) {
          const day = entry
            ? await this.programs.updateDay(entry.day.id, { weekday })
            : await this.programs.addDay({
                programId,
                name: split.names[index % (split.names.length || 1)] ?? `Training Day ${index + 1}`,
                weekday,
                defaultRestSeconds: 180,
              });
          ids.push(day.id);
        }
        await this.programs.reorderDays(programId, ids);
        await this.programs.update(programId, { splitTemplate: template });
        return this.programs.get(programId);
      },
    );
  }

  async finish(programId: string) {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises, this.db.appSettings],
      async () => {
        const graph = await this.programs.get(programId);
        if (!graph?.days.length) throw new Error('Add at least one training day before saving.');
        const saved = await this.programs.update(programId, { draft: false });
        if (!(await this.programs.getActiveId())) await this.programs.setActive(programId);
        return saved;
      },
    );
  }
}
export const programBuilder = new ProgramBuilderService();

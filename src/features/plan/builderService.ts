import { z } from 'zod';
import { programTemplates, type ProgramTemplateId } from './programTemplates';
import type { Program } from '../../domain/entities';
import { database, type LiftwiseDatabase } from '../../lib/storage/database';
import {
  ProgramRepository,
  type CreateProgramInput,
} from '../../lib/storage/repositories/programRepository';

export { weekdayNames as weekdays } from '../../domain/localCalendar';
import { weekdayNames as weekdays } from '../../domain/localCalendar';
import { Weekday } from '../../domain/localCalendar';
export const splitTemplates = [
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    hint: '6 days · Experienced / Higher frequency',
    days: [
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
      Weekday.SATURDAY,
    ],
    names: ['Push Day', 'Pull Day', 'Legs Day'],
  },
  {
    id: 'upper-lower',
    name: 'Upper Lower',
    hint: '4 days · Balanced',
    days: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.THURSDAY, Weekday.FRIDAY],
    names: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    hint: '3 days · Simple',
    days: [Weekday.MONDAY, Weekday.WEDNESDAY, Weekday.FRIDAY],
    names: ['Full Body A', 'Full Body B', 'Full Body C'],
  },
  { id: 'custom', name: 'Custom', hint: 'Create from scratch', days: [], names: [] },
] as const;
export type SplitTemplate = NonNullable<Program['splitTemplate']>;
export function canReplaceStarter(
  graph: import('../../lib/storage/repositories/programRepository').ProgramGraph,
) {
  if (!graph.program.draft) return false;
  if (!graph.days.length) return true;
  const source = programTemplates.find(({ split }) => split === graph.program.splitTemplate);
  if (!source)
    return (
      graph.days.length === 3 &&
      graph.days.every(
        ({ day, exercises }, index) =>
          !exercises.length &&
          !day.notes &&
          day.kind !== 'recovery' &&
          day.name === `Workout Day ${index + 1}`,
      )
    );
  return (
    graph.days.length === source.days.length &&
    graph.days.every(({ day, exercises }, index) => {
      const expectedDay = source.days[index]!;
      return (
        day.name === expectedDay.name &&
        !day.notes &&
        day.kind !== 'recovery' &&
        exercises.length === expectedDay.exercises.length &&
        exercises.every((prescription, position) => {
          const expected = expectedDay.exercises[position]!;
          return (
            !prescription.notes &&
            Object.entries(expected).every(
              ([key, value]) => prescription[key as keyof typeof prescription] === value,
            )
          );
        })
      );
    })
  );
}
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
    return id ? this.updateBasics(id, input) : this.programs.create({ ...input, draft: true });
  }

  private async updateBasics(id: string, input: CreateProgramInput) {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises, this.db.appSettings],
      async () => {
        const graph = await this.programs.get(id);
        if (!graph) throw new Error('Program not found.');
        if (input.scheduleType === 'weekly' && graph.program.scheduleType === 'cycle') {
          if (graph.days.length > 7)
            throw new Error(
              'This cycle has more than seven days. Keep Flexible Cycle or shorten it in Schedule first.',
            );
          // Preserve every entity, prescription and note when changing schedule type.
          for (const { day } of graph.days)
            await this.programs.updateDay(day.id, { weekday: null });
          for (const [index, { day }] of graph.days.entries())
            await this.programs.updateDay(day.id, { weekday: index });
        } else if (input.scheduleType === 'cycle' && graph.program.scheduleType !== 'cycle') {
          for (const { day } of graph.days)
            await this.programs.updateDay(day.id, { weekday: null });
        }
        return this.programs.update(id, input);
      },
    );
  }

  /** Selecting structure never replaces an existing saved plan or user prescriptions. */
  async selectTemplate(programId: string, choice: ProgramTemplateId | 'custom') {
    const graph = await this.programs.get(programId);
    if (!graph) throw new Error('Program not found.');
    const template = programTemplates.find(({ id }) => id === choice);
    const split = template?.split ?? 'custom';
    if (graph.program.splitTemplate === split && graph.days.length) return graph;
    if (graph.days.length && !canReplaceStarter(graph)) {
      await this.programs.update(programId, { splitTemplate: split });
      return this.programs.get(programId);
    }
    const cycle = graph.program.scheduleType === 'cycle';
    return this.db.transaction(
      'rw',
      [
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.exercises,
        this.db.workoutExercises,
        this.db.workoutSessions,
        this.db.appSettings,
      ],
      async () => {
        if (template) {
          await this.applyTemplate(programId, template.id, graph.days.length > 0);
        } else {
          for (const { day } of graph.days) await this.programs.deleteDay(day.id);
          for (const [index, weekday] of [0, 2, 4].entries())
            await this.programs.addDay({
              programId,
              name: `Workout Day ${index + 1}`,
              weekday: cycle ? null : weekday,
              kind: 'workout',
            });
          await this.programs.update(programId, { splitTemplate: 'custom' });
        }
        if (cycle) {
          const updated = await this.programs.get(programId);
          for (const { day } of updated!.days)
            await this.programs.updateDay(day.id, { weekday: null });
        }
        return this.programs.get(programId);
      },
    );
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
                name: split.names[index % (split.names.length || 1)] ?? weekdays[weekday]!,
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

  async applyTemplate(
    programId: string,
    templateId: ProgramTemplateId,
    replace = false,
    selected?: number[],
  ) {
    const template = programTemplates.find((item) => item.id === templateId);
    if (!template) throw new Error('Unknown template.');
    const ordered = daysInput
      .parse(selected ?? template.days.map(({ weekday }) => weekday))
      .sort((a, b) => a - b);
    const sources = ordered.map((weekday, index) => ({
      ...template.days[index % template.days.length]!,
      weekday,
    }));
    return this.db.transaction(
      'rw',
      [
        this.db.programs,
        this.db.programDays,
        this.db.programExercises,
        this.db.exercises,
        this.db.workoutExercises,
        this.db.workoutSessions,
        this.db.appSettings,
      ],
      async () => {
        const graph = await this.programs.get(programId);
        if (!graph) throw new Error('Program not found.');
        if (graph.days.length && !replace)
          throw new Error('Confirm replacement of existing days first.');
        // Validate ALL catalog references before removing any user prescriptions.
        for (const day of sources)
          for (const exercise of day.exercises) {
            if (!(await this.db.exercises.get(exercise.exerciseId)))
              throw new Error(
                `Template exercise unavailable: ${exercise.exerciseId}. No changes saved.`,
              );
          }
        for (const { day } of graph.days) await this.programs.deleteDay(day.id);
        for (const source of sources) {
          const day = await this.programs.addDay({
            programId,
            name: source.name,
            weekday: source.weekday,
            defaultRestSeconds: 150,
          });
          for (const prescription of source.exercises)
            await this.programs.addExercise({ programDayId: day.id, ...prescription });
        }
        await this.programs.update(programId, { splitTemplate: template.split });
        return this.programs.get(programId);
      },
    );
  }

  async finish(programId: string, activate?: boolean) {
    return this.db.transaction(
      'rw',
      [this.db.programs, this.db.programDays, this.db.programExercises, this.db.appSettings],
      async () => {
        const graph = await this.programs.get(programId);
        if (!graph?.days.some(({ day }) => day.kind !== 'recovery'))
          throw new Error('Add at least one training day before saving.');
        const scheduled = graph.days.flatMap(({ day }) =>
          day.weekday == null ? [] : [day.weekday],
        );
        if (
          graph.program.scheduleType !== 'cycle' &&
          (graph.days.length > 7 || new Set(scheduled).size !== scheduled.length)
        )
          throw new Error('Use at most seven training days with unique weekdays before saving.');
        const saved = await this.programs.update(programId, { draft: false });
        if (activate === true || (activate === undefined && !(await this.programs.getActiveId())))
          await this.programs.setActive(programId);
        return saved;
      },
    );
  }
}
export const programBuilder = new ProgramBuilderService();

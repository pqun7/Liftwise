import { Weekday } from '../../domain/localCalendar';
import type { ProgramExercisePrescriptionInput } from '../../lib/storage/repositories/programRepository';

export const targetDefaults = {
  compound: {
    targetSets: 3,
    minReps: 6,
    maxReps: 10,
    targetRirMin: 1,
    targetRirMax: 3,
    restSeconds: 150,
  },
  secondary: {
    targetSets: 3,
    minReps: 8,
    maxReps: 12,
    targetRirMin: 1,
    targetRirMax: 3,
    restSeconds: 120,
  },
  isolation: {
    targetSets: 2,
    minReps: 10,
    maxReps: 15,
    targetRirMin: 1,
    targetRirMax: 3,
    restSeconds: 90,
  },
} satisfies Record<string, ProgramExercisePrescriptionInput>;
type Target = keyof typeof targetDefaults;
const entry = (
  id: string,
  target: Target = 'secondary',
  overrides: ProgramExercisePrescriptionInput = {},
) => ({ exerciseId: `repdb:${id}`, ...targetDefaults[target], ...overrides });
const squat = () => entry('squat', 'compound');
const bench = () => entry('bench-press', 'compound');
const row = () => entry('seated-cable-row');
const rdl = () => entry('romanian-deadlift', 'compound');
const lateral = () => entry('lateral-raise', 'isolation', { minReps: 12, maxReps: 20 });
const press = () => entry('dumbbell-shoulder-press', 'compound');
const pulldown = () => entry('lat-pulldown');
const incline = () => entry('incline-db-press');
const supportedRow = () => entry('chest-supported-db-row');
const legPress = () => entry('leg-press');
const hip = () => entry('hip-thrust', 'secondary');
const split = () => entry('bulgarian-split-squat');
const curl = () => entry('leg-curl', 'isolation');
const calves = () => entry('standing-calf-raise', 'isolation');
const biceps = () => entry('bicep-curl', 'isolation');
const triceps = () => entry('tricep-pushdown', 'isolation');
const extension = () => entry('ez-bar-lying-tricep-extension', 'isolation');
const rear = () => entry('rear-delt-fly', 'isolation', { minReps: 12, maxReps: 20 });

export const programTemplates = [
  {
    id: 'full-body-3',
    split: 'full-body',
    version: 1,
    name: 'Full Body',
    context: '3 days · Beginner / General',
    description: 'Whole-body sessions on non-consecutive days. Simple, editable starting targets.',
    days: [
      {
        weekday: Weekday.MONDAY,
        name: 'Full Body A',
        exercises: [
          squat(),
          bench(),
          row(),
          entry('romanian-deadlift', 'secondary', { targetSets: 2 }),
          lateral(),
        ],
      },
      {
        weekday: Weekday.WEDNESDAY,
        name: 'Full Body B',
        exercises: [
          legPress(),
          press(),
          pulldown(),
          entry('hip-thrust', 'secondary', { targetSets: 2 }),
          entry('incline-db-press', 'secondary', { targetSets: 2 }),
          biceps(),
        ],
      },
      {
        weekday: Weekday.FRIDAY,
        name: 'Full Body C',
        exercises: [split(), incline(), supportedRow(), curl(), lateral(), calves()],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    split: 'upper-lower',
    version: 1,
    name: 'Upper / Lower',
    context: '4 days · Balanced',
    description: 'Two upper and two lower sessions with recovery between similar sessions.',
    days: [
      {
        weekday: Weekday.MONDAY,
        name: 'Upper A',
        exercises: [bench(), row(), press(), pulldown(), biceps(), triceps()],
      },
      {
        weekday: Weekday.TUESDAY,
        name: 'Lower A',
        exercises: [
          squat(),
          rdl(),
          entry('leg-press', 'secondary', { targetSets: 2 }),
          curl(),
          calves(),
        ],
      },
      {
        weekday: Weekday.THURSDAY,
        name: 'Upper B',
        exercises: [incline(), supportedRow(), pulldown(), lateral(), biceps(), extension()],
      },
      {
        weekday: Weekday.FRIDAY,
        name: 'Lower B',
        exercises: [
          legPress(),
          hip(),
          entry('bulgarian-split-squat', 'secondary', { targetSets: 2 }),
          curl(),
          calves(),
        ],
      },
    ],
  },
  {
    id: 'ppl-6',
    split: 'ppl',
    version: 1,
    name: 'Push / Pull / Legs',
    context: '6 days · Experienced / Higher frequency',
    description:
      'Push, pull and legs twice weekly. Higher frequency is optional, not universally better.',
    days: [
      {
        weekday: Weekday.MONDAY,
        name: 'Push A',
        exercises: [bench(), press(), incline(), lateral(), triceps()],
      },
      {
        weekday: Weekday.TUESDAY,
        name: 'Pull A',
        exercises: [
          pulldown(),
          row(),
          entry('chest-supported-db-row', 'secondary', { targetSets: 2 }),
          rear(),
          biceps(),
        ],
      },
      {
        weekday: Weekday.WEDNESDAY,
        name: 'Legs A',
        exercises: [
          squat(),
          rdl(),
          entry('leg-press', 'secondary', { targetSets: 2 }),
          curl(),
          calves(),
        ],
      },
      {
        weekday: Weekday.THURSDAY,
        name: 'Push B',
        exercises: [
          entry('incline-bench-press', 'compound'),
          press(),
          entry('cable-fly', 'isolation'),
          lateral(),
          extension(),
        ],
      },
      {
        weekday: Weekday.FRIDAY,
        name: 'Pull B',
        exercises: [
          supportedRow(),
          pulldown(),
          entry('seated-cable-row', 'secondary', { targetSets: 2 }),
          rear(),
          entry('hammer-curl', 'isolation'),
        ],
      },
      {
        weekday: Weekday.SATURDAY,
        name: 'Legs B',
        exercises: [
          legPress(),
          hip(),
          entry('bulgarian-split-squat', 'secondary', { targetSets: 2 }),
          curl(),
          calves(),
        ],
      },
    ],
  },
] as const;
export type ProgramTemplateId = (typeof programTemplates)[number]['id'];

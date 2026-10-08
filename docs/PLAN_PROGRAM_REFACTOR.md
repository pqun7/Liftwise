# Plan / Program / Workout responsibilities

## Existing architecture retained

The app uses React Router loaders over Dexie repositories, with locally persisted
Program, ProgramDay, ProgramExercise and WorkoutSession records. There is no new
Plan store, workout-day model, schedule table, font, or theme. The existing Manrope,
dark surfaces, mint primary actions, Card, Button, SegmentedControl, BuilderHeader,
ExerciseImage, exercise picker and workout logger are reused.

## Information architecture

- `/plan` defaults to Schedule; `?tab=program` shows program management.
- Schedule displays dated days and session summaries. It never starts or logs a session.
- Program Details defaults to Overview with Training Days and an existing editor entry.
- `?mode=preview` renders a training-day definition without logging controls.
- `/workout?day=<ProgramDay ID>` previews the same canonical day before execution.
- Calendar and day details live under Plan; Schedule settings change timing only.
- Existing editor return links preserve the day hash and explicitly select the editor.
- The shell remembers the last Plan route during navigation to another main section.

## Shared data and derived state

`trainingCalendar` is the common date projection for Schedule, Calendar, Home and
Workout. Weekly programs reuse ProgramDay.weekday. An optional, validated
Program.cycleStartDate anchors the ordered cycle, including recovery days, to dates.
An unanchored cycle remains undated and keeps its existing completion rotation.
Cycle order is never inferred from weekday assignments.

Plan's loader reads a consistent database transaction and derives progress from
the existing unfinished WorkoutGraph using the same set-count calculation as Home
and Workout. Active sessions have priority, including sessions started earlier.
Completion lookup is shared; scheduled, rest, empty and missed dates are projections,
not separately persisted statuses. Historical completion remains visible when weekday
assignments change. Schedule changes are atomic, preserve IDs and prescriptions,
support weekday swaps and roll back invalid or conflicting assignments.

WorkoutExercise prescriptions in execution/history are intentional snapshots of the
session, not competing program definitions. Editing a program updates subsequent
previews and sessions without rewriting logged sessions or completed history.

## Deliberately preserved UX

The existing Current Program empty-state card, artwork, copy and controls are unchanged.
New empty states reuse that card's visual language. Program creation, templates,
exercise selection, images, target editing, local/offline storage, rest timers,
logging, completion, backups and the five bottom-navigation destinations are retained.
There are no new execution controls inside Plan or Program previews.

## Scenario coverage

`tests/planResponsibilities.test.tsx` covers no program, no schedule, scheduled,
rest, empty, missed, an older active session, completion, canonical program/name/target
edits, atomic rescheduling and durable reopening. Existing workout and editor suites
cover logging, completion, autosave, failed saves, images and execution snapshots.
`e2e/plan-responsibilities.spec.ts` exercises creation → scheduling → calendar →
program preview → Workout → active summary → completion, checks context restoration,
and captures the interface at 320/390/430px.

## Verification results

- All 228 unit/integration tests passed; the 11 Home tests passed again after the
  small key correction for repeated dated cycle occurrences.
- Production build and TypeScript checks passed.
- New full journey passed on Mobile Safari and Desktop Chrome, including logging,
  completion, reload, calendar indicators and restoration of the Plan context.
- Existing workout-quality journey passed on both browsers. An earlier Safari
  timeout did not recur when the journey ran in isolation.
- Chrome checks passed for plan-experience, program-release and all three
  five-step-builder journeys (creation, template switching and flexible cycles).
- Formatting and whitespace checks passed for the changed files.
- Lint passed with the existing `work/plan-qa.config.ts` excluded. Unfiltered lint
  encounters a project-service configuration error in that pre-existing QA file;
  it was left outside this refactor's scope.

Screenshots from the successful full journey are retained in
`output/plan-refactor/`: schedule, calendar, active summary and the preserved
Current Program empty state.

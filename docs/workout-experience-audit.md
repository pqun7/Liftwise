# Workout Experience V2 — implementation audit

## Scope

Only workout execution and its regression tests changed. The existing workout-start page,
Home, Plan, Progress and Settings were preserved. The app shell only adjusts navigation
visibility for workout completion, alongside its existing active/paused behavior.

## Canonical state and derived views

The loader hydrates the existing Dexie session, exercise snapshots and sets. The focused
view derives the current exercise from `currentExerciseId` and the current set from the
first incomplete recorded set. A persisted rest deadline plus an unfinished current set
selects the dedicated Rest view, including an expired deadline. Completed current sets
select Exercise Complete; completed session status selects Workout Complete. Pause uses
the existing session status. No persisted screen enum, timer counter, new state library,
backend, schema, migration or second persistence layer was added.

## Reused implementation

- WorkoutRepository and workoutService retain planned snapshots, history, transactional
  creation and single unfinished workout protection.
- Existing workoutPrefill rules and weight increment remain authoritative. Untouched
  blank next sets retain the existing fallback from today's recorded set.
- The shared WorkoutSaveQueue and useWorkoutSetDrafts coordinate editing, completion,
  overview operations and route departure. Failed drafts remain visible and retryable.
- Rest edits render the same SetLogger numeric editor with completion disabled. Start Set
  and Skip only clear the persisted rest fields; neither records a set.
- Existing overview retains jumping, skipping/resuming, adding, replacing, reordering,
  collapsing and removing exercises. Management actions moved to the overflow menu.
- WorkoutSummary retains its read-only recorded set recap behind View Workout.

## Completion and timer invariants

The service asks the existing repository completion transaction to finish automatically
when all non-skipped exercises with recorded sets are complete. A zero-set unfinished
exercise prevents automatic completion. The final set and completed session commit in
one transaction, with rest cleared. Final exercise sets clear rest; positive planned rest
starts only when another set remains in that exercise. Repeated completion of the same
persisted set is rejected inside the transaction.

The existing undo token validates the set's exact completion revision. Undo also supports
reopening a just-completed workout, provided another unfinished workout has not started.
Rest restoration preserves the existing rule: a subsequently changed deadline is not
overwritten by an old undo token.

The session's `restEndsAt - now` determines remaining time. An interval only refreshes
presentation; visibility/focus refresh timestamps and the loader. The SVG ring derives
its fraction from the persisted deadline and start. Extension modifies the deadline in
Dexie. At zero, Rest remains displayed until Start Set or Skip. Pause preserves existing
semantics: workout elapsed time pauses; the absolute rest deadline continues to run.

## Visual decisions

A large mint SVG ring, centered tabular countdown, saved set result, next-set preview,
Edit, +30 sec, Skip Rest and Start Set compose the full-screen Rest view. Snapshot targets
use compact prose; active values use three large metric cards. Segmented exercise progress
has accessible names, completion/skipping states and scrolls for long workouts. The logging
CTA stays in document flow with sticky positioning to avoid keyboard-related layout jumps.
The container remains capped at 430 px, and primary actions respect safe areas.

Exercise volume uses calculateWorkoutVolume. Best set is the completed set with the largest
weight × reps, with original set order breaking ties. No estimated PR/progression metrics
are invented. Completion reports recorded volume, sets, duration, exercises, unlogged sets
and the average of known RIR values.

## Verification and limits

Focused integration coverage includes slow/failed writes, double completion, rest entry,
extension, expired reopen, next-set editing, Start, exercise completion, next exercise,
atomic final completion, final undo, zero rest and simultaneous repository completions.
Browser coverage follows the existing start page through rest, undo, pause/resume, reload,
expiry, completion, recap and recovery. Responsive screenshot checks cover 320, 360, 375,
390, 430, 768 and 1280 px, with a centered mobile workout at larger widths.

Physical iPhone screen lock, OS termination and software-keyboard behavior require a real
device acceptance pass. Desktop WebKit covers browser semantics, while timestamp and
IndexedDB tests cover persistence mechanics. Existing cross-tab draft edits retain the
repository's last-write semantics; transactional completion and session creation are guarded.

## Final check results — October 3, 2026

- TypeScript, zero-warning ESLint, changed-file formatting and production build passed.
- All 164 unit/component/repository integration tests passed across 28 files.
- Full Playwright suite: 35 passed, 3 intentional platform skips, zero failures.
- Screenshot review covered active logging, full-screen Rest, Exercise Complete and
  Workout Complete against both supplied references, including iPhone WebKit.
- Production build retains pre-existing dependency annotation and bundle-size warnings.

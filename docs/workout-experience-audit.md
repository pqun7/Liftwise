# Workout experience audit

## System and preserved behavior

Program prescriptions create transactional workout exercise snapshots and working sets in
`WorkoutRepository.startPlannedWorkout`. The snapshots, not the mutable plan, feed the session
loader. `previousSetFor` chooses the same completed historical set number/type, then the last
matching type. Completed history prefills planned and added sets without completing them.
Set completion and prescribed rest start share a Dexie transaction; undo validates the exact
completion and restores rest only if it has not subsequently changed. Session timestamps,
pause duration, current exercise, notes and sets survive reopening. Creation is serialized
with the unfinished-session check across tabs. History/progress use the same stored graph.

Active and overview set editors serve different purposes; preserve both presentations and
share draft/save behavior rather than merge their UI. Existing overview supports add, skip,
resume, replace (before completion), reorder, delete and jump. Leave preserves the session;
discard preserves a discarded record. No schema or migration is needed for this work.

## Findings and implementation decisions

| Current behavior / problem                                                                                                                                                                 | Severity / frequency                              | Solution / affected files                                                                                                                                                                                  | Regression risk                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Editor-local queues do not coordinate with finish, exercise navigation or unmount; overview edits save only on blur. Slow or failed writes can leave the displayed draft ahead of storage. | P0 potential unsaved edits; every edit/navigation | Session-scoped save coordinator, immediate valid draft writes, flush before operations/navigation, retained failures and retry. SetLogger, WorkoutSetRow, WorkoutSessionPage, new shared editor hook/queue | Preserve canonical repository validation and transaction boundaries; test delayed/failed saves |
| Previous lookup stops at latest matching exercise even when it has no completed sets, hiding older usable history (also duplicates).                                                       | P1; skipped/empty recent workouts                 | Search newest sessions for an exercise with actual completed performance; workoutRepository                                                                                                                | Test empty and duplicate historical exercises                                                  |
| Targets are tiny prose alongside a large image; planned rest is absent from the main target display.                                                                                       | P1; every exercise                                | Four labeled snapshot metrics: sets, reps, RIR, rest; CurrentExerciseCard, workoutFormat                                                                                                                   | Null, one-sided and zero values need explicit handling                                         |
| All sets look equally editable; current values appear again in separate adjustment cards.                                                                                                  | P1; every set                                     | Current-set heading, integrated inputs/steppers, secondary all-set disclosure; SetLogger                                                                                                                   | Preserve future-set edits and overview editing; keep completion/undo                           |
| Last workout displays an aggregate or final set rather than the reference for the current set.                                                                                             | P1; every historical set                          | Use existing previousSetFor to show the matching reference; CurrentExerciseCard                                                                                                                            | Do not change existing history-first prefill priority                                          |
| Following blank sets remain blank even after today's first set is logged.                                                                                                                  | P1; first-time workouts                           | Fill only untouched blank next sets of matching type from today's completed set, inside completion transaction                                                                                             | Never overwrite deliberate edits, cleared values or historical prefill                         |
| Finish is immediate even with unfinished work; pause is hidden and logging remains possible while paused.                                                                                  | P1; interruptions/early finish                    | Explicit pause/resume state; inline early-finish review; ActiveWorkoutLogger                                                                                                                               | Normal fully completed finish remains one tap; repository compatibility retained               |
| Dots conflate skipped/completed and hide exercise identity and partial progress.                                                                                                           | P2; busy equipment/many exercises                 | Numbered nodes, separate skip/partial state, named direct jump selector; WorkoutExerciseProgress                                                                                                           | Preserve incomplete status on jump; avoid forced order                                         |
| Rest depends on selected exercise's current set and disappears on skipped exercise.                                                                                                        | P2; switching during rest                         | Always render persisted timer, refer to next work on selected exercise, announce expiration once; ActiveWorkoutLogger, RestTimer                                                                           | Preserve wall-clock countdown through pause/background                                         |
| Retry writes all sets, including completed/untouched records; completion layout remount can discard future drafts.                                                                         | P1; failure/rapid input                           | Retry only failed latest full drafts, avoid completion-based logger key; shared queue/hook                                                                                                                 | Sync clean fields from storage while retaining pending drafts                                  |
| Fixed action can compete with software keyboard and overview editing.                                                                                                                      | P2; direct entry                                  | Flow action while a field is focused; no fixed completion beneath overview; workout.css                                                                                                                    | Verify 320/375/390/430 widths and safe area                                                    |
| Landing already prioritizes scheduled/recoverable workout; preview order is only implicit and recovery action says Continue.                                                               | P2; each start                                    | Keep single primary start, explicit resume wording and numbered preview; WorkoutPage/Preview                                                                                                               | Preserve rest-day/completed/no-program selection behavior                                      |

## Workflow and interaction goals

- Scheduled landing → Start Workout: one primary tap (existing behavior retained).
- Prefilled current set → Complete set: one tap; small weight change + complete: two taps.
- Completion → prescribed timestamp rest + next set ready: no navigation tap.
- Last set → Next Exercise: one tap; busy equipment → named exercise selector: one selection.
- Leave/reload → Resume Workout: one primary tap, same session and current exercise.
- All sets, notes, management and replacement remain available through overview/disclosure.
- Finish with unfinished work → explicit count and Finish anyway; fully finished → one tap.

## Validation scope

Unit/component coverage: serialized slow writes, error retention/retry, completion double taps,
external refresh, range/zero targets, blank-next-set fallback, unchanged historical prefill,
empty historical workouts, transaction rollback and recovery. Browser coverage: planned
logging → rest → undo → out-of-order navigation → pause/resume → reload → finish/summary;
offline and narrow viewports. Real iOS screen lock/PWA lifecycle cannot be fully established
by desktop browser automation; timestamp/reopen tests cover the persistence mechanics.

## Final self-review and verified results

The final visual pass covered landing, logging with history and rest, exercise navigation and
the completed recap. Prescribed rest now sits immediately below the current values, ahead of
optional all-set controls. Copy Previous Set appears when the current draft differs from its
historical reference. Native exercise selection retains the app's dark styling. Primary touch
completion preserves focus through pointer-down, then dismisses the keyboard after the click;
this fixes the missed first tap found during browser verification. Overview disclosure flushes
drafts without an unnecessary full-route revalidation. Add Exercise waits for management
operations to finish, avoiding navigation/revalidation races.

Normal start and prefilled completion remain one primary tap; a weight-step adjustment plus
completion takes two taps. The existing implementation already met those tap counts: the
improvement is clear current-set orientation, less competing UI, prepared blank next sets,
and coordinated persistence rather than an invented reduction from an assumed baseline.

Validation completed on October 3, 2026:

- TypeScript, zero-warning ESLint, changed-file formatting and production build: passed.
- Full unit/component/repository integration suite: **158 tests in 28 files passed**.
- Selected browser matrix: **12 applicable tests passed**, with two intentional desktop skips
  for iPhone-only tests, across final runs. Six remaining checks were rerun after fixing stale
  Home/Progress selectors; all six passed. There are no unresolved failures in these checks.
- Safari/WebKit and Chrome: planned workout, history prefill, fractional weight, zero/optional
  RIR, automatic rest, next-set preparation, equipment-busy jumps, undo, pause/resume, reload,
  preserved session identity, early finish and canonical summary/history.
- Existing Safari legacy-session flow: add, skip, replace, collapse/expand and recover.
- Offline smoke: logging, history, charts, all CSV exports, backup, isolated test-data deletion
  and restored workout recap passed in both browsers.
- Narrow layout: 320, 375, 390 and 430 px; no document overflow, minimum 44 px adjustment/rest
  targets, numeric typography at least 16 px, safe-area and bottom-navigation separation.
- Build retains existing dependency annotation and large-main-bundle warnings; build succeeds.

Real-device screen lock, OS termination, PWA relaunch and the physical software keyboard remain
useful acceptance checks. Desktop WebKit emulates iPhone browser behavior but cannot prove
every iOS lifecycle behavior. Simultaneous edits to the same set in separate tabs still use
the repository's last-write behavior; transaction guards prevent duplicate completion and
duplicate active-session creation, and focus/visibility refreshes clean drafts from storage.
A dedicated cross-tab editing conflict UI is a future opportunity.

## Changed-file inventory

| File                                                | Reason                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/workout/ActiveWorkoutLogger.tsx`      | Visible pause/resume, safe early-finish review, useful total set progress, independent rest visibility, zero-set add action, safe overview/management navigation and immediate note saves.      |
| `src/features/workout/CurrentExerciseCard.tsx`      | Four snapshot target metrics and historical performance corresponding to the current set; smaller recognition image.                                                                            |
| `src/features/workout/SetLogger.tsx`                | One current set, integrated input/step controls, optional other sets, contextual copy, friendly numeric validation and touch-safe completion.                                                   |
| `src/features/workout/WorkoutSetRow.tsx`            | Reuse immediate draft saves in overview; serialize structural actions and guard repeated completion.                                                                                            |
| `src/features/workout/useWorkoutSetDrafts.ts`       | Shared numeric drafts and validation; retain failed text across editor switches and follow refreshed storage for clean values.                                                                  |
| `src/features/workout/workoutSaveQueue.ts`          | Session save ordering, management barriers, retained latest failed writes, retry and route-departure flush.                                                                                     |
| `src/features/workout/WorkoutSaveContext.ts`        | Connect focused and overview editors to the same session coordinator.                                                                                                                           |
| `src/features/workout/WorkoutSessionPage.tsx`       | Coordinate management with edits, block unsafe departure, show retry, refresh on return to foreground and return to the undone exercise.                                                        |
| `src/features/workout/WorkoutExerciseProgress.tsx`  | Distinct skipped/completed/partial nodes and named direct exercise selection.                                                                                                                   |
| `src/features/workout/RestTimer.tsx`                | Announce rest expiration without announcing every countdown tick.                                                                                                                               |
| `src/features/workout/WorkoutPage.tsx`              | Clear Resume Workout action and remove redundant recovery explanation.                                                                                                                          |
| `src/features/workout/WorkoutPreview.tsx`           | Explicit exercise numbering.                                                                                                                                                                    |
| `src/features/workout/workoutFormat.ts`             | Explicit missing, one-sided and zero target formatting.                                                                                                                                         |
| `src/lib/storage/repositories/workoutRepository.ts` | Transactional untouched-next-set fallback; distinguish deliberate edits by timestamp; search past empty historical instances.                                                                   |
| `src/styles/workout.css`                            | Remove duplicated adjustment styling, refine image/progress sizing, distinguish skipped/partial states and keep direct-entry action scrollable with keyboard focus.                             |
| `tests/workoutLogger.test.tsx`                      | Delayed saves, rapid edits plus completion, retained failed drafts, bodyweight/optional-RIR validation and full-draft persistence expectations.                                                 |
| `tests/workoutExperience.test.tsx`                  | Route-save barrier, failed finish/departure, current historical comparison, target edge cases, next-set preservation and empty/duplicate history.                                               |
| `tests/workoutSaveQueue.test.ts`                    | Serialized writes, failure isolation, latest-draft retry and writes added during departure flush.                                                                                               |
| `tests/workoutLanding.test.tsx`                     | Updated recovery action terminology.                                                                                                                                                            |
| `e2e/workout-logger.spec.ts`                        | Out-of-order jumps, prepared next set, undo and pause/resume coverage; updated secondary-row and current Progress assertions.                                                                   |
| `e2e/workout-quality.spec.ts`                       | Add 320 px landing and active-layout verification.                                                                                                                                              |
| `e2e/workout-speed.spec.ts`                         | Verify automatic prefill and contextual copy while retaining add/skip/replace/recovery coverage.                                                                                                |
| `e2e/workoutUi.ts`                                  | Explicit early-finish helper and current metric-card assertions.                                                                                                                                |
| `e2e/hardening.spec.ts`                             | Secondary completed-row assertions; follow current history/export/insight routes for offline integrity checks.                                                                                  |
| `e2e/home.spec.ts`                                  | Secondary completed-row assertions and use existing weekly progress after completion.                                                                                                           |
| `e2e/progress.spec.ts`                              | Locate completed status inside the secondary all-set disclosure. This broader Progress spec was not included in the selected E2E run; its workout path is covered by the logger/offline checks. |
| `docs/workout-experience-audit.md`                  | Lifecycle investigation, severity audit, workflow decisions, regression risks and verified results.                                                                                             |

## Data compatibility

No database version, schema, migration, backup shape, entity field or network dependency changed.
The new coordinator holds transient drafts only; committed workout data remains in the same
Dexie tables through the existing service/repository boundary. Planned creation, completion,
next-set fallback and prescribed rest keep transactional guarantees. Completed history and
mutable program prescriptions remain separate.

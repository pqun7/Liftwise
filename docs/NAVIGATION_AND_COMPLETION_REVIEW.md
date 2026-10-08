# Liftwise navigation and completion review

## Repository and architecture

The repository is a React 19 / TypeScript application using Vite, Tailwind, React Router data routes, Lucide, and Dexie IndexedDB. It contains no Flutter/Dart application or pubspec.yaml. The existing architecture was retained; no routing, state-management, database, font, or UI dependency was added.

The entry point is `src/main.tsx`. `src/app/router.tsx` owns loaders and destinations; AppShell owns the shared shell, five navigation destinations, scroll restoration, and the calendar foreground/midnight revalidation hook. Feature services hydrate data from repositories. Workout session/exercise/set records own durable training state. React owns temporary UI state; the workout save queue serializes drafts and blocks departure until saving succeeds.

The review started on `feat/schedule-engine` with uncommitted Plan/schedule and design-system changes. Those changes were preserved. QA output and temporary scripts are excluded from commits. A separate activity-chart removal during verification was retained, with only its unused imports/calculations cleaned up.

## Problems corrected

- Exercise details always linked back to the library, even when entered from Workout or a training-day preview.
- Logger and completion screens unconditionally scrolled to the top on mounting, competing with React Router restoration.
- Overview, collapsed exercises, undo pointers, review mode, Home selection, exercise filters/pagination, history filters/order, and selected insight metrics were lost when their routes unmounted.
- Home grouped completion by finish timestamp while Plan/Workout grouped by the session's calendar date. Completing after midnight placed indicators on different days.
- An explicit `?day=` selection could replace the completion state with another Start prompt for the same finished workout.
- Legacy sessions completed without an active program returned to the no-program prompt.
- Home's Today row could still label completed training as scheduled.
- Home and Plan date controls used separate appearance/indicator implementations.
- Training-day cards repeated the same rest-duration label.

## Navigation and state ownership

ContextBackLink uses a real history Back action for destinations reached through an in-app context link, with a safe library/Progress fallback for direct links. Entry context is passed from workout preview/current/overview, the exercise library, and training-day previews; exercise history can return to its originating detail screen.

A shell-scoped ScreenStateProvider retains only presentation state, independently keyed by route/entity and control name. The cache is bounded to 100 values. It does not persist domain records, retain stale loader data, or replace the save queue. New query/entity scopes receive their own defaults even when React reuses the screen instance. Isolated components without a provider retain normal local-state behavior.

Existing ScrollRestoration handles history entries. Root destination keys also retain scroll across tab switches. Logger scroll-to-top now responds only to actual set/exercise/rest changes, and completion scrolls to the top only when the session transitions to completed. Returning from details no longer resets it. URL-based Plan tabs, dates, range filters, and month selection remain URL-based.

## Workout lifecycle and completion

The existing repository remains authoritative. Starting checks for an unfinished session inside an IndexedDB transaction. Logging validates values and writes the current set; automatic completion occurs only when every non-skipped exercise has at least one set and all those sets are completed. The final set and completed session are committed together. Duplicate completion attempts are rejected; paused set logging requires resuming. Explicit early Finish retains its existing incomplete-set review/confirmation workflow.

Completion is stored on the original WorkoutSession (`status`, `endedAt`, cleared rest/pause fields), alongside WorkoutExercise and WorkoutSet records. No duplicate completion record/table or ephemeral Completed Today flag was introduced. Home, Plan, and Workout derive status from those records. `scheduledDate` is the canonical local YYYY-MM-DD key; legacy records fall back to their start timestamp, never the reopening time. Actual finish timestamps still serve duration/history analytics.

Completed workouts survive database reopen and browser reload. A finished workout selected by query stays in review mode. Completion without an active program is visible while a different active program's scheduled training is not falsely completed by unrelated training. Midnight/foreground revalidation remains intact. Undo retains the existing expiration and repository validation.

## UI and typography

The existing Workout Complete identity and semantic token system remain canonical. Shared cards, buttons, controls, dialogs, focus states, borders, radii, and restrained accent depth are retained. Manrope remains locally bundled at weights 400–800 with centralized typography; no font package or network font was added.

CalendarDayButton unifies Home and Plan's weekly selection. CalendarDayMarker also serves the monthly calendar and its legend. Today uses aria-current, selected dates use aria-pressed, and accessible labels communicate workout status independently of color. Completed dates display a check. Calendar targets remain at least 44px wide at 360px. A contextual Back button has the same readable focus and touch treatment as other navigation.

## Regression coverage

- `tests/navigationRestoration.test.tsx`: actual Workout → details → Back, retained overview/collapse state, no mount scroll reset, direct-link fallback, null state, bounded/scoped subscriptions, independent query defaults.
- `tests/completionDateConsistency.test.ts`: completion after midnight, canonical Home/Plan dates, database reopen, no duplicate records, legacy completion without a program, next-day transition.
- `tests/workoutLanding.test.tsx`: current rest-day/program behavior and completed day-query protection. Stale removed-selector assertions were updated while retaining read-only landing and start checks.
- `e2e/navigation-restoration.spec.ts`: production browser Back/scroll restoration, draft persistence, real final-set completion, reload, one durable session, Home/Plan indicators, library query and Home selection retention, 360/390/430px geometry, and 150% text sizing.
- Existing mobile form, workout logging, planning, offline Progress, custom exercise, and backup suites remain in place. The overview helper is idempotent because retaining overview state is now intentional.

## Verification

Final command results are recorded below after the last checks. Browser tests use Desktop Chrome and emulated mobile WebKit, not physical devices. Screenshots are local QA evidence and are intentionally not versioned.

- `node node_modules/typescript/bin/tsc -b --pretty false`: passed.
- `node node_modules/eslint/bin/eslint.js src tests e2e --max-warnings 0`: passed.
- `node node_modules/vitest/vitest.mjs run`: 238 passed, zero failures. JSON evidence: `output/ui-refactor/navigation-final-unit.json`.
- `node node_modules/vite/bin/vite.js build`: passed with PWA generation. Final screenshots also use an isolated production output so another preview build cannot change the tested assets. Existing dependency-annotation and large-chunk warnings remain.
- Production Chrome: exact prescription/offline reload and backup/delete/restore passed; Home states, navigation restoration (two journeys), and Plan/Program/calendar responsibilities passed. WebKit: mobile form typography and both navigation journeys passed. Final navigation screenshots include 360/390/430px layouts, completion, enlarged text, and the monthly calendar.
- Application lint and type safety are clean. Repository-wide lint still reports the pre-existing `work/plan-qa.config.ts` project-service error. Temporary isolated build assets/configuration are removed after browser verification; no generated build files or lint exemptions are committed.
- Repository-wide formatting retains unrelated existing warnings. Affected UI files and these reports are formatted. `git diff --check` is clean.

No Flutter analyze/build command applies to this repository. Physical-device testing and an exhaustive run of every existing browser scenario remain outside the verified matrix; the documented critical browser journeys and complete unit suite were run.

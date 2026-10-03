# Progress and calendar streaks

## Source of truth and loading

`WorkoutRepository.finish()` persists `status: completed` and an ISO `endedAt`
in the existing Dexie workout session records. The Progress overview loader
loads completed workout graphs once through `ProgressRepository.history()`.
That single snapshot supplies period metrics, weekday activity, and the global
streak calculator. The active program's nonempty dated training days supply the
weekly schedule. There is no streak table, counter, context, or global store.

Other Progress loaders and Home load only completed session records for the
same calculator through `ProgressRepository.streak()`. The shell loader supplies
this optional header data on the remaining routes with a header. It does not
duplicate the overview's history query or read streak data on Plan/Workout.
Settings remains accessible if optional header history cannot be read.
`useRouteStreak()` selects the owning loader result; the badge receives only the
calculated count and performs no storage reads or calculation.

## Calendar contract

- Only canonical completed sessions qualify. Dates come from `endedAt`; legacy
  completed records without that timestamp use `startedAt`, matching Home's
  existing compatibility convention. Invalid, reversed, and future timestamps
  do not qualify.
- UTC ISO strings preserve instants in storage. Local year/month/day fields
  produce calendar keys in the device's current timezone.
- Unique completed dates count once regardless of sessions per date.
- Tracking begins on the first qualifying completion. No earlier dates are missed.
- Current streak anchors at today if completed, otherwise yesterday. An open
  today does not break the run. Scheduled rest bridges consecutive completed
  training dates without adding a completed day. Best streak uses the same rule.
- Missed days count uncompleted ended training dates from the later of tracking
  start and selected period start through yesterday. Rest never counts as missed.
- A valid active, nonarchived, nondraft program with nonempty dated training
  days establishes rest on its remaining weekdays. Undated, absent, or empty
  schedules retain the daily-calendar rule; missing workouts do not imply rest.
- A completed workout on a rest date takes priority and counts once as completed.
- The timeline uses the actual local Monday–Sunday week, with completed,
  missed, blue rest, pending today, future, and pre-tracking states. Future rest
  is blue; dates before tracking remain neutral. Today's identity is independent
  of completion or rest status.
- The overview's 7D window contains today and the preceding six whole local
  dates. Month/year boundaries subtract local calendar months and clamp month
  ends. Existing unrelated analytics ranges retain their prior contracts.

`localCalendar.ts` centralizes Home's existing local key and Monday helpers and
adds calendar adjacency/period boundaries. `setDate` and `setMonth` operate on
calendar fields; elapsed 24-hour increments and UTC date slices are not used.
The browser's timezone is the interpretation authority because stored records
contain instants, not the user's historical timezone.

The existing data model does not store historical versions of training schedules.
Rest classification therefore uses the current active schedule, including past
dates, and recalculates after a schedule change or deactivation.

## Refresh and presentation

Navigation and normal router revalidation reconstruct the streak after a
workout completion. A single shell effect revalidates on visibility resume and
at the next actual local midnight. It cleans up its listeners/timer and avoids
Workout/Plan routes. Home's former duplicate polling effect was removed.

The Progress layout retains shared cards, range controls, routes, theme tokens,
safe areas, and bottom navigation. It replaces Training Days with the reference
streak card, uses real completion weekdays, and preserves the four exploration
links. All interactive targets are at least 44px. Week status labels expose
dates and textual semantics; icons accompany colors. Badge width/opacity
transitions respect reduced motion.

Visual review refined metric heights, rounded statistic surfaces, icon emphasis,
and the chart's width and integer scale. Static weights of the existing licensed
Manrope font address a confirmed variable-font weight mismatch in Windows WebKit,
scoped to Progress and the streak badge.

## Verification evidence

Focused unit/integration coverage checks calendar boundaries, actual 23/25-hour
New York DST transitions, duplicate sessions, gaps, first completion,
pending today, period invariance, legacy timestamps, local-night completion,
IndexedDB reopen, immediate loader revalidation, and a screen left open at
midnight. Browser tests exercise completion through the real workout UI,
reload/offline use, shared Home badge data, date rollover, exploration links,
and widths 320, 360, 375, 390, 393, 402, and 430.

The user already had changes in `RestTimer.tsx`, `workout.css`, and image assets
when this task started. Those are preserved. Workout timer assertions expecting
the former completion heading, zero-padded countdown, and Add 30 Seconds action
fail against those pre-existing timer changes; this task does not modify them.

## Original Progress refactor check results

| Check                                 | Actual result                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                            | Passed                                                                                                                                                  |
| Lint                                  | Passed                                                                                                                                                  |
| Focused unit/integration              | 45 passed across Progress, analytics, storage, headers, and Home                                                                                        |
| New streak/DST integration            | 15 passed with `TZ=America/New_York`, including verified 23/25-hour transitions                                                                         |
| Full unit suite                       | 175 passed, 4 failures in pre-existing workout timer assertions                                                                                         |
| Progress/offline/header/lifecycle E2E | 8 passed, Safari and Chrome                                                                                                                             |
| Final visual refinement E2E           | 2 passed; all seven widths, navigation clearance, exploration actions, and no browser errors                                                            |
| Broader E2E run                       | 28 passed, 9 failed, 3 platform skips. Three Safari loading timeouts passed in the subsequent serial focused run; six failures were workout timer flows |
| Build                                 | Passed; the four local font instances are included in the PWA precache                                                                                  |

Screenshots and raw logs are retained locally in `work/progress-verification/`
(ignored by Git). Preview screenshots contain test fixtures, never production
placeholder records. The final browser run rechecked the scoped navigation font
refinement after rebuilding.

## Scheduled rest follow-up

Rest is shown with the shared blue token, a coffee icon, a textual status for
assistive technology, and a Rest legend entry. Today retains its date identity
and a stronger blue ring. The legend fits all seven tested mobile widths.

- 52 focused unit/integration tests passed under `TZ=America/New_York`, including
  23 calendar/streak cases and 4 persisted-data/rendering cases.
- Edge coverage includes rest between completions, weekends, once-weekly plans,
  missed scheduled training, duplicate sessions, completion on rest, never-trained
  users, invalid/empty/draft/archived schedules, period boundaries, DST, schedule
  edits/deactivation, database reopen, and shared Home/Progress results.
- All 10 distinct focused browser tests passed in Safari/WebKit and Chrome:
  6 Progress/offline/visual/shared-control tests plus 4 streak lifecycle tests.
  The initial new test reloaded before route navigation finished; an explicit
  destination-heading assertion fixed that test race, and all 4 streak tests
  passed on rerun.
- Visual screenshots were reviewed at 320 and 390px, with automated color,
  seven-column layout, and overflow checks at 320, 360, 375, 390, 393, 402, and
  430px in both browsers. Offline and local-midnight behavior passed; Chrome
  exercises native offline reload, WebKit uses the existing network-abort helper.
- TypeScript, lint, and production build passed.
- The full unit suite finished with 188 passed and the same 4 pre-existing
  workout timer assertion failures in `sharedUi.test.tsx`,
  `workoutExperience.test.tsx`, and `workoutLogger.test.tsx`. No additional
  failures appeared; the user's existing timer changes remain preserved.

Final previews: `work/progress-verification/Rest-390.png` and `Rest-320.png`.
Logs: `rest-e2e.log`, `rest-streak-e2e.log`, `rest-full-unit.log`, `rest-build.log`.

## Actual files changed

- `src/app/router.tsx`
- `src/app/shell/AppShell.tsx`
- `src/assets/fonts/README.md`
- `src/components/home/HomeHeader.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/home/homeData.ts`
- `src/features/home/homeService.ts`
- `src/features/progress/ProgressPage.tsx`
- `src/features/progress/ProgressUI.tsx`
- `src/features/progress/loaders.ts`
- `src/features/progress/overviewAnalytics.ts`
- `src/features/progress/progressService.ts`
- `src/styles/index.css`
- `tests/app.test.tsx`
- `e2e/progress.spec.ts`
- `e2e/progressVisual.spec.ts`

## Actual new files

- `src/domain/localCalendar.ts`
- `src/domain/streak.ts`
- `src/components/ui/StreakBadge.tsx`
- `src/features/progress/StreakCard.tsx`
- `src/features/progress/useRouteStreak.ts`
- `src/app/shell/useCalendarRevalidation.ts`
- `src/styles/progress.css`
- `src/assets/fonts/Manrope-Progress-400.woff2`
- `src/assets/fonts/Manrope-Progress-600.woff2`
- `src/assets/fonts/Manrope-Progress-700.woff2`
- `src/assets/fonts/Manrope-Progress-800.woff2`
- `tests/streak.test.ts`
- `tests/progressStreak.test.tsx`
- `e2e/streak.spec.ts`
- `docs/progress-streak-audit.md`

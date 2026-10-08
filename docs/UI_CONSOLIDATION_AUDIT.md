# v1.2 UI consolidation audit

## Baseline and screenshot ownership

Started on `feat/schedule-engine` at `4f12a37`, matching origin/main. The existing
uncommitted `.gitignore` change is preserved and excluded from the release commit.
There are no applicable workspace AGENTS.md files. Package manager: pnpm 10.15.1.
Production: Vercel Git integration, main branch, existing vercel.json SPA rewrite.
Version: 1.1.0 → requested 1.2.1; the intermediate 1.2.0 candidate was not published.

| Supplied screenshot | Owner                                    | Observed issue                                                             |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| IMG_1609            | ProgramDayPage, BuilderChrome, plan.css  | Oversized recovery artwork/title; builder minimum height and sticky footer |
| IMG_1610            | PlanPage, ScheduleView, AppShell         | Oversized hero and unrelated Plan header; fixed navigation collision       |
| IMG_1612            | AppShell, ExerciseDetailPage, legacy.css | Large global header and repeated top safe inset before contextual Back     |
| IMG_1613            | PlanPage, ScheduleView                   | Separate header language, oversized typography and vertical gaps           |

Before consolidation, AppShell's top bar, HomeHeader, PlanPage's inline header,
ProgressHeader's brand row and BuilderHeader supplied separate geometry.
AppShell and Plan compatibility styles both applied top insets. AppShell reserved
112px plus the bottom inset; builder/workout actions separately assumed navigation
heights. Home and Progress owned loader streak data; Plan/Workout had no badge.

## Final ownership

AppHeader is the sole global title/badge component; the final request removes its
App Wordmark. HomeHeader is removed;
Plan's inline header and Progress's duplicate brand/badge row are retired.
ProgressHeader now composes descriptions and ContextToolbar for secondary routes.
BuilderHeader retains only builder-specific step paths and uses ContextToolbar.
Duplicate Back rows in builder forms/pickers are removed. Other detail screens use
the existing ContextBackLink with the same 20px arrow and minimum 44px target.

AppShell owns the 430px width, 16px horizontal padding, one top-inset path and
measured navigation clearance. Builder footer actions are in flow. Workout's
dedicated logger remains intentional; all routes retain the one BottomNavigation.
Normal cards retain 16px padding/18px radius and heroes 20px/22px. Recovery artwork
uses a 190px maximum with its original aspect ratio and a compact linked Up Next.
The saved weekly editor also uses ContextToolbar. Semantic tokens
define 28px page titles, 20px sections, 16px cards, 15px body, 13px secondary,
12px captions, 48px standard buttons/editable controls and 52px large actions.
Icon and contextual controls retain a 44px minimum. Manrope is unchanged.

Streak domain rules, Dexie schema/migrations, backup format, media caching,
visibility/midnight revalidation and prompted service-worker updates are preserved.
No second app, navigation, design system, persistence path or streak store exists.

## Verification record

Formatting, lint, TypeScript, the 241-test full unit round, catalog verification,
the normal build and the deployment build pass. The deployment build preserves
601 exercise records, 1,056 media files and the existing service-worker strategy.
Existing dependency annotation/chunk-size warnings are non-fatal.

The complete browser round ran 76 cases: 72 passed, three existing project-specific
skips remained, and the startup compatibility test exposed an obsolete assumption
that program names appear in Schedule. Selecting Program explicitly preserved its
data assertions; its focused rerun passed in both browsers. All 73 applicable cases
are therefore validated against the same artifact without rerunning unaffected
successes. GitHub's full browser job remains a required merge/release gate.

WebKit passes all eight requested widths on six main routes and Recovery/Schedule
screens, long names, injected top/bottom insets, navigation clearance, 150%/200%
text, focus-visible, reduced motion, 16px controls and reduced-height keyboard
simulation. Offline navigation, media caching, backup/restore, workout completion,
streak refresh, standalone manifest and unrestricted zoom configuration pass.
Actual pinch gestures, iOS keyboard and VoiceOver remain physical-device checks.
Raw logs and screenshots are retained in ignored `output/` and `test-results/`.
Physical-iPhone verification of this release is pending.

## v1.2.1 streak correction

Progress/History previously bypassed the repository's flexible-cycle rest-day
predicate. Their loaders now use ProgressRepository.streak() with a shared clock
and the selected missed-day period. Current/best counts are lifetime projections
of completed workouts, deduplicated by local completion date. No attendance record
is created by opening the app. The regression reproduces a workout/recovery/workout
cycle with a duplicate completion and proves consistency across Home, both loaders,
period changes and reopening IndexedDB. Existing weekly, gap, midnight, timezone,
backup and invalid-record tests remain in force.

The final header omits the wordmark and keeps the existing mint Flame badge beside
the optional page title. The streak calendar uses actual date numbers and joins
only adjacent completed days; scheduled rest never becomes invented attendance.

PR review identified that the schedule calendar intentionally treats pre-anchor
dates as rest, which must not excuse attendance gaps. The repository now limits
cycle rest forgiveness to dates on/after the cycle's start. The fixture preserves
five stored sessions, including pre-program gaps and a duplicate date. Failed
loader snapshots remain unavailable, with explicit header and shell regressions.
All 47 affected unit tests pass, including the two additional unavailable-state
cases; unchanged tests retain their preceding successful results. Navigation and
clearance browser assertions now require real destinations and visible content.
All 14 affected browser cases pass on WebKit and Chrome against the rebuilt
deployment artifact, including the full eight-width matrix and offline destinations.

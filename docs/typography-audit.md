# Unified Liftwise typography

## Canonical system

`src/styles/index.css` owns the Manrope family, five deliberate weights, semantic
sizes, leading, tracking, and numeric defaults. CSS feature styles reference
those same tokens; Tailwind `type-*` utilities apply the roles to shared UI.
Existing display/text aliases continue to resolve to the same family. No
provider, font manager, context, remote font, or package dependency was added.

| Role                  | Size at the default root | Weight                                 |
| --------------------- | ------------------------ | -------------------------------------- |
| Major display         | 28px                     | 800 when the display utility is needed |
| Page title            | 26px                     | 700                                    |
| Section               | 18px                     | 700                                    |
| Card                  | 16px                     | 600                                    |
| Body / secondary body | 14px / 13px              | 400                                    |
| Label / caption       | 12px / 11px              | 600 / 400                              |
| Large / medium metric | 28px / 22px              | 700                                    |
| Rest timer            | 48–72px, responsive      | 700                                    |
| Button / navigation   | 15px / 12px              | 600 / 500                              |

Headings use 1.25 leading, body 1.5, and labels/captions 1.35. Display uses 1.15.
Important editable fields stay at least 16px. Tabular numerals are inherited
globally and explicitly retained by numeric controls and metric/timer roles.
Relative sizes permit text enlargement; content is not clipped into fixed text
heights. Metric/explore/streak grids reflow with enlarged text, and navigation
labels wrap within their targets at 200%. Focused workout headers use the card-size token as an optical exception
so full program names fit beside back/menu actions. Existing safe areas, routes,
workout behavior, colors, and icon selection are preserved.

## Actual font inspection and compatibility decision

The original `Manrope-Variable.ttf` is unchanged: its `wght` axis is 200–800,
default 200, and `tnum` is present. It remains the canonical source. Five local
static WOFF2 instances (400/500/600/700/800) are generated from that file using
fontTools and retain its copyright/OFL metadata. Their combined size is 153,888
bytes, compared with 164,700 bytes for the source TTF.

This is a necessary exception to the preferred single-variable runtime asset.
Windows WebKit reports correct weight and glyph widths but rasterizes the source
variable font's outlines at its default light weight. The problem reproduces
with explicit axis settings, inline weight overrides, and compressed variable
WOFF2. A screenshot comparison reveals the failure that CSS/width assertions
miss. Static instances restore the actual outline weights. The original scoped
Progress instances were replaced by a single global Manrope registration; only
the five required local faces ship, with no runtime TTF duplication. Loading
remains `font-display: swap` and PWA precached.

## Wordmark

`AppWordmark` bundles the existing `docs/image/app name.png` directly through
Vite. The documentation source is neither moved nor modified nor duplicated.
The RGBA artwork is 617×230, with nontransparent bounds (19, 5)–(603, 203).
It includes the original Liftwise+ mark and tagline. The shared image is 104px
wide, about 38.77px high (including the tagline and transparent margins), with
preserved aspect ratio, intrinsic dimensions, and alt text `Liftwise`.

It replaces branding in Home, the Progress overview, and the shell header on
general pages. Contextual Plan/Progress detail/focused workout headers retain
their navigation. Ordinary prose about Liftwise is retained. Header wrapping
supports enlarged text and long streak counts. The bundled PNG is precached
alongside application assets for offline reopening.

## Reused

The existing root theme, Tailwind integration, feature CSS, `PageIntro`,
`SectionHeader`, `Button`/link styles, form controls, bottom navigation,
`StreakBadge`, card layouts, PWA cache, and local font license are reused.

## Modified files for this request

- `src/styles/index.css`
- `src/styles/home.css`
- `src/styles/plan.css`
- `src/styles/workout.css`
- `src/styles/progress.css`
- `src/styles/legacy.css`
- `src/components/PageIntro.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/FormControl.tsx`
- `src/components/ui/controlStyles.ts`
- `src/components/layout/BottomNavigation.tsx`
- `src/components/home/HomeHeader.tsx`
- `src/app/shell/AppShell.tsx`
- `src/features/progress/ProgressUI.tsx`
- `src/features/progress/ProgressPage.tsx`
- `src/features/progress/BodyMetrics.tsx`
- `src/features/progress/WorkoutHistoryPage.tsx`
- `src/features/plan/PlanPage.tsx`
- `src/features/workout/ActiveWorkoutLogger.tsx`
- `src/features/workout/WorkoutSessionPage.tsx`
- `src/features/workout/WorkoutSummary.tsx`
- `src/features/workout/RestTimer.tsx`
- `src/assets/fonts/README.md`
- `vite.config.ts`
- `e2e/shared-ui.spec.ts`

These are changes in this typography request. Pre-existing Progress/streak,
timer, and image-asset work in the shared checkout is not listed as newly done.

## New files for this request

- `src/components/ui/AppWordmark.tsx`
- `src/assets/fonts/Manrope-400.woff2`
- `src/assets/fonts/Manrope-500.woff2`
- `src/assets/fonts/Manrope-600.woff2`
- `src/assets/fonts/Manrope-700.woff2`
- `src/assets/fonts/Manrope-800.woff2`
- `e2e/typography.spec.ts`
- `docs/typography-audit.md`

## Cleanup

Removed the Plan/Workout system-font overrides, Home's repeated family settings,
the separate `Manrope Progress` family/registration, unused textual brand CSS,
and the obsolete `font-app` timer class. Replaced scattered size/weight decisions
with the shared scale and restrained heavy weights. The four previous
`Manrope-Progress-*.woff2` instances were replaced with global instance names.
The original TTF, artwork, and license remain intact.

## Verification

The full unit run recorded 188 passing tests and the same four existing workout
timer expectation failures in `sharedUi`, `workoutExperience`, and
`workoutLogger`. The new typography test uses an isolated local database, the
real set logger/rest/finish flow, and long names at 320, 360, 375, 390, 393, 402,
and 430px. It checks actual font loading and glyph widths, tabular digits,
numeric input sizes/fit, wordmark proportions, horizontal overflow, text
enlargement, offline asset caching, and browser errors. Final browser and code
checks cover Chrome and Windows WebKit; this does not establish native iPhone
hardware rendering. TypeScript, lint, and the production build passed. A fresh
full unit rerun completed in 49.42 seconds with 188 passing and four existing
timer expectation failures. The earlier interrupted run produced two additional
time-related failures; both passed on the fresh run.

The broader browser run passed ten of twelve scenarios; the two failures were
the old shared-control assertion requiring a precached TTF. That assertion now
requires all five shipped Manrope WOFF2 faces. After the final enlarged-text
refinement, all six affected browser scenarios (typography, shared controls,
and Progress visual interactions in both browsers) passed in 3.2 minutes.
The remaining six history/offline and streak scenarios passed in the broader
run, including blue scheduled rest, midnight transitions, and lifetime runs.
Thus all twelve distinct scenarios have passing results across these runs.

The typography journey captures eleven screens at each of seven widths in each
browser, plus the Progress 200% text view. Its enlarged-text checks also verify
the actual text bounds for navigation labels, Explore titles, and streak
numbers. Screenshots were reviewed visually, including the original wordmark,
long names, active logger, rest, completion, Plan, Library, and Settings.
Formatting and `git diff --check` passed. No native iPhone device was tested.

Raw logs and preview images are retained in ignored `work/typography-verification/`.

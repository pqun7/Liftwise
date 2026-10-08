# Liftwise design system

Workout Complete defines the palette, restrained depth, typography, and action hierarchy. Other pages retain their workflows and composition.

## Audit before migration

- Stack: React 19 / TypeScript, Vite 7, Tailwind 4, Lucide, React Router, Dexie local persistence.
- Canonical screen: `src/features/workout/WorkoutComplete.tsx`, integrated by `WorkoutSummary.tsx`.
- Routes: Home; exercise library, detail and creation; Plan schedule, calendar/day, schedule settings, program overview/edit, five builder stages, training day creation/edit/detail, exercise selection and prescriptions; workout landing, active/paused/completed session and exercise selection; Progress overview/history, measurements, exercise insights/history; Settings and Data Safety; route errors/not-found.
- Shared shell: AppShell, MobilePage, BottomNavigation, PageIntro, BuilderHeader, ProgressHeader.
- Existing primitives: Card (default/active/subtle/glass), Button and link classes, IconButton, Input/NumericInput/Select/Textarea, SegmentedControl, StreakBadge.
- Duplicates: legacy action links/buttons; Home and builder card surfaces; metric cards in Progress and completion; forms in custom exercises and shared FormControl.
- Separate surface systems: white-wash Home/legacy cards, unrelated green gradients in Plan/Progress, bright mint borders and several radii. Completion used direct color values rather than the existing theme.
- Dialogs/sheets: native PlanSheet, leave confirmation, workout finish review, menus and inline disclosures. Preserve native modality, focus handling, callbacks, and keyboard semantics.
- States: existing skeletons, empty placeholders, catalog/media fallbacks, storage/download status, validation, route errors, success/undo, disabled and pending controls.
- Narrow risks: seven-day calendars, three-column statistics, long program titles between back controls, workout numeric controls and large chart metrics.

## Foundation

`src/styles/tokens.css` owns semantic colors, status/chart colors, radius, spacing, shadows and motion. Tailwind's existing aliases (`mint`, `primary` for text, `surface-2`, etc.) remain compatible and resolve to the same tokens. New utilities expose `accent`, `foreground`, `background`, `surface-elevated`, `surface-highlight`, `border-strong`, `danger`, `warning`, and `info`.

Manrope remains locally bundled. Page titles: 32px/800; section titles: 20px/700; primary metrics: 32px/700; supporting metrics: 24px/700; body: 14px; metadata: 12–13px. Compact navigation/header and logger contexts retain smaller sizes when necessary. Numerical values use tabular figures.

## Primitives and composition

`primitives.css` provides shared `ui-card`, `ui-button`, `ui-control`, and `ui-icon-container` appearance. Existing React primitives retain their prop contracts. Feature layout classes control only composition, data-specific emphasis, and intentional exceptions such as photographic heroes, circular indicators and native sheets.

Cards: supporting 18px; elevated/hero 22px. Inputs: 16px. Primary full-width actions: 58px tall / 19px radius. Compact and icon actions: at least 44px. Secondary actions use surface/border contrast. Destructive states remain distinct. Ordinary cards have no glow; success/achievement states may use localized accent illumination.

Focus: 2px accent outline with 4px offset. Inputs also use a subtle focus halo. Motion: 180–200ms interactions, nonessential motion disabled for reduced-motion preference.

## Baseline before this migration

- Unit suite: 226 passed, 2 failures in `workoutLanding.test.tsx` (removed Push selection / next-workout copy).
- Type check: four unused declarations in the already-edited `WorkoutPage.tsx`.
- Repository lint: the same unused declarations, temporary `work/plan-qa.config.ts` outside its TS project, and preview-only files from the previous completion task.
- The workspace contains ongoing Plan/domain/persistence changes. The visual migration must not overwrite them or alter their behavior.

## Initial migration verification (before navigation follow-up)

- `node node_modules/typescript/bin/tsc -b --pretty false`: passed. Removed four dead declarations from WorkoutPage; no service, persistence, validation, or routing behavior changed by the visual migration.
- `node node_modules/vite/bin/vite.js build`: passed, including PWA generation. Existing large-chunk and dependency annotation warnings remain.
- `node node_modules/eslint/bin/eslint.js src tests e2e --max-warnings 0`: passed.
- Repository-wide ESLint: one remaining pre-existing project-service error in `work/plan-qa.config.ts`. The temporary completion-preview code and migration scripts were cleaned up rather than exempted from lint.
- Full Vitest suite: 226 passed, the same two baseline failures in `tests/workoutLanding.test.tsx`. No additional failures. Results: `output/ui-refactor/unit-results.json`.
- Production Desktop Chrome checks passed for Plan responsibilities, offline Progress, shared navigation/controls, workout logging, offline application/media availability, and exercise search/custom creation. Two broader `app.spec.ts` checks still encounter stale expectations from the earlier Plan migration: an ambiguous `3 min rest` locator and a removed `Edit Program` link. Backup/delete/restore actions execute before the latter locator fails.
- Final production Mobile Safari run: `shared-ui.spec.ts`, `mobile-form-zoom.spec.ts`, and `workout-quality.spec.ts`: all three passed. These cover navigation/touch sizes, zoom-safe editable forms, workout controls, and primary-action placement across narrow widths.
- Browser route/layout audit: 38 screen/state combinations at each of 360px, 390px, and 430px (114 total), with no horizontal overflow or route error UI. Includes empty/populated Home, builder stages, calendar, workout logger/completion, exercise forms, Progress sections, Settings/Data Safety, and deliberate not-found states. Geometry: `output/ui-refactor/layout-results.json`; captures: `output/ui-refactor/`.
- Final 360px keyboard/reduced-motion probe: visible 2px focus outline, zero transition duration, 44px action height, no overflow.
- Full repository Prettier check retains unrelated formatting warnings. Migrated UI source and design-system files were formatted; existing services, tests, documentation, and configuration were left intact.

The migration retains the locally bundled font and installed dependencies. Existing completion actions, details disclosure, live workout data, and undo callbacks are preserved. Existing shared component contracts remain compatible.

## Final navigation/completion follow-up

See `NAVIGATION_AND_COMPLETION_REVIEW.md` for the final architecture, regression coverage and verification results. The two initial unit failures are resolved; the complete suite now passes 238 tests. Production browser checks now pass exact program editing, backup/delete/restore, Home states, Plan/calendar responsibilities, retained navigation, completion persistence and mobile form typography. Rest duration remains visible once in training-day metadata. Shared navigation typography accommodates 150% text sizing without splitting labels at 360px.

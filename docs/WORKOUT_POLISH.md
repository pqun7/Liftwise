# Workout UX and visual pass

The active logger was compared directly with `Downloads/app desgin/in the exercises.png`. This pass changes presentation and existing navigation only. It does not change storage, the data model, workout calculations, Plan, Home, or Progress rendering.

## Changes

- Landing: smaller hero, clearer Start/Continue hierarchy, compact exercise rows, 48px thumbnails, subdued previous performance, and a single pinned Start action for long previews above the bottom navigation.
- Logger: compact centered session header, 44px progress controls, active double ring, completed connectors, a restrained exercise card, readable prescription/history, and consistent native system typography.
- Sets: aligned columns, 46px numeric fields with readable decimal weights, 44px status/control areas, consistent active borders, and compact grouped adjustments. Completed values are protected from accidental changes in the focused logger; existing Workout Overview still permits corrections.
- Rest: a 66px ring with a thinner stroke, prominent time, adjacent Next Set text, and equally sized 44px Add 30 Seconds/Skip controls.
- Action: Complete Set, Next Exercise, and Finish Workout share a 54px mint action at the bottom, with content clearance. Exercise changes return the header to view without moving the viewport after each set.
- Summary: the existing completed-session route now presents actual duration, completed exercises/sets, compact performed-set recaps, notes when present, and Done. Finishing opens this view; Done returns to Workout. No new PR calculations or insights were introduced.
- Consistency: scoped Workout radii, colors, spacing, image fallbacks, and reduced-motion treatment. The generic app brand header is omitted on Workout routes only.

## Files

- `src/features/workout/WorkoutPage.tsx`
- `src/features/workout/WorkoutLandingHero.tsx`
- `src/features/workout/WorkoutPreview.tsx`
- `src/features/workout/ActiveWorkoutLogger.tsx`
- `src/features/workout/WorkoutExerciseProgress.tsx`
- `src/features/workout/CurrentExerciseCard.tsx`
- `src/features/workout/SetLogger.tsx`
- `src/features/workout/RestTimer.tsx`
- `src/features/workout/WorkoutSessionPage.tsx`
- `src/features/workout/WorkoutSummary.tsx`
- `src/styles/workout.css`
- `src/styles/index.css` (scoped stylesheet import)
- `src/app/shell/AppShell.tsx` (Workout-only header condition)
- `e2e/workout-quality.spec.ts`
- `e2e/workout-logger.spec.ts`
- `e2e/workoutUi.ts`
- `e2e/hardening.spec.ts`

## Validation

Build, TypeScript, lint, and formatting pass. The full unit suite passes all 141 tests. The final targeted browser run passes 9 tests with 1 expected desktop skip (the iPhone-specific workout-speed test). It runs Workout quality, logging, workout speed, and offline hardening checks in Mobile Safari and Desktop Chrome.

Browser validation measures horizontal overflow, bottom-navigation clearance, single primary actions, numeric typography, and touch targets at 375, 390, 393, and 430px. It also exercises decimal persistence, rest extension/skip, undo, prefill, progress connectors, summary counts, reload, and offline backup/restore.

Safari screenshots were compared to the reference. Exercise illustrations retain their full content rather than cropping body positions. Physical iPhone keyboard and Home Indicator behavior still require device verification. Existing production bundle-size/dependency annotation warnings remain.

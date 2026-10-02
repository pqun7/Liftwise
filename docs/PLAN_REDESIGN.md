# Training plan redesign

The supplied “After” screens guided the overview and editor. Existing React/Vite/Tailwind architecture, exercise catalog, IndexedDB schema, workout snapshots, and local persistence remain in use. No dependencies were installed. Existing uncommitted work was retained.

## Architecture and interaction

- `/plan` presents My Training Plan: one active-program card, the derived next workout, a primary Start Workout action, a secondary Edit Program action, a Monday–Sunday schedule, and useful program details. The active program is excluded from the other-program list.
- `/plan/:programId` is the dedicated editor, with Schedule, Settings, and Preview views. Program metadata uses progressive disclosure. Training-day cards sort by weekday; only one is expanded at a time.
- Exercise rows show thumbnails, names, compact sets/reps/rest, and a details chevron. Target editing exposes the existing sets, rep ranges, RIR ranges, rest, and notes. Reordering uses accessible Up/Down controls, without decorative drag handles.
- The exercise picker retains instant search and existing filters. Adding or configuring an exercise returns to the same expanded day. Missing results and duplicate selections have clear explanations.
- Contextual day options retain rename, weekday assignment, duplication, exercise reordering, removal, notes, and detailed day management.

## State and persistence

Counts, schedules, durations, and next workouts derive from persisted program records. Next-workout selection handles empty days, rest days, today’s completed workout, week rollover, and undated legacy rotation. The overview refreshes on focus and periodically to account for calendar changes. Workout landing uses the same scheduled-day calculation and explicitly represents no-program and completed-today states.

The existing local save model is preserved. Changes commit through repository transactions; errors stay visible and editable target values are preserved for retry. Finalizing a draft is explicit; already-persisted programs show Saved. Pending actions use immediate locks to prevent duplicate submissions. Navigation and refresh warn about unfinished input edits; the dialog uses native modal focus trapping and Escape support. Local context changes ask before discarding edits.

Form navigation releases its unsaved-input guard only after persistence succeeds, and keeps that release through the route transition. Failed writes retain the guard. First-time exercise catalog import is allowed the same 20-second allowance in the shared browser fixture as in existing library tests.

Weekday collisions are checked inside add/update/duplicate transactions, beyond disabled picker options. Creation and duplication reject an eighth day. Copies receive independent day/prescription IDs and a chosen free weekday. Finalization checks schedule integrity again. Empty days delete immediately; populated days and program deletion require confirmation. Existing historical workout snapshots remain separate.

## Mobile and accessibility

The existing safe-area navigation remains in place. The editor reserves scroll space for its fixed save bar. Native system typography avoids Safari variable-font inconsistencies. Inputs use at least 16px text and appropriate numeric/search types. Buttons and weekday rows retain 44px touch targets. Long labels wrap; thumbnails retain existing missing/broken-image fallbacks. Accordions expose `aria-expanded`, editor selectors expose their selected state, and the existing navigation supplies `aria-current`. Transitions respect reduced-motion preferences.

## Files touched in this task

- `src/features/plan/PlanPage.tsx`
- `src/features/plan/ProgramDetailPage.tsx`
- `src/features/plan/ProgramWorkoutDay.tsx`
- `src/features/plan/WeeklySchedule.tsx` (new)
- `src/features/plan/programDisplay.ts`
- `src/features/plan/ExerciseTargetEditor.tsx`
- `src/features/plan/ExercisePickerPage.tsx`
- `src/features/plan/PrescriptionFormPage.tsx`
- `src/features/plan/ProgramDayFormPage.tsx`
- `src/features/plan/ProgramFormPage.tsx`
- `src/features/plan/UnsavedChanges.tsx`
- `src/features/plan/builderService.ts`
- `src/features/plan/programService.ts`
- `src/features/workout/workoutLanding.ts`
- `src/lib/storage/repositories/programRepository.ts`
- `src/styles/plan.css`
- `tests/planExperience.test.ts` (new)
- `e2e/plan-experience.spec.ts` (new)
- `e2e/program-builder.spec.ts`
- `e2e/programHelpers.ts`
- `e2e/app.spec.ts`
- `e2e/hardening.spec.ts`
- `e2e/mobile-form-zoom.spec.ts`
- `e2e/home.spec.ts`
- `e2e/workout-logger.spec.ts`
- `docs/PLAN_REDESIGN.md` (this report)

## Verification

- `pnpm lint`: passed with no warnings.
- TypeScript validation (standalone and production build): passed.
- `pnpm test`: all 141 tests across 26 files passed on the final source.
- `pnpm build`: passed, including the offline service worker.
- Formatting: all files touched in this task passed the Prettier check.
- Final browser regression run: 27 passed, 3 skipped, 4 failed across Mobile Safari and Desktop Chrome. All six plan-focused checks (the reference flow and both builder flows in both browsers) passed. Prescription persistence, backup/restore, complete offline flows, history/charts, and workout logging passed in both browsers.
- The remaining failures are two Home-screen assertions in each browser: `home.spec.ts:128` expects a recent completed-workout link on today's Home screen, and `shared-ui.spec.ts:17` expects Home's Create Program action to have a mint background. The current Home renders that action as secondary and shows date-specific workout links only when a non-today date is selected. This task did not change Home's rendering to satisfy those assertions.
- The reference flow verifies widths 320, 375, 390, 393, 402, 430, 768, and 1280 without horizontal overflow, picker context restoration, target errors, unsaved-input protection, weekday duplication integrity, saved-state feedback, reload persistence, and starting the real workout logger. Safari screenshots were visually inspected.

## Remaining platform limitations

Persistence is local IndexedDB; there is no remote save API or authentication integration to add to this flow. Database validation surfaces malformed persisted records through the existing recovery/error screens rather than silently deleting them. Existing bundle-size and dependency annotation warnings remain. Browser tests emulate iPhone Safari; physical-device software keyboard, Home Indicator, and rotation behavior still need a real iPhone check.

# Plan redesign implementation

Plan now uses Overview and Details views. Overview combines the real selected-day workout state, weekly schedule, next workout, and current program. Details retains the active program summary, shared week, editing, program viewing, saved-program activation, and creation flows. Without an active program, the guided empty card includes the supplied circular dumbbell illustration and three creation benefits; saved programs remain available for activation.

## Shared implementation

- `AppHeader` and `BottomNavigation` remain unchanged and are rendered once by `AppShell`, including streak/calendar actions and safe-area/navigation clearance.
- The global Manrope family, weights, typography roles, emerald surfaces, mint colors, and storage schema remain unchanged.
- Home's existing `WeekSelector` is reused by Plan, with a detailed presentation through the same `CalendarDayButton` primitive. `calendarWeek` supplies one Monday-first date/day projection to both pages. Both still derive schedule and workout status through `trainingCalendar`; Home retains its history/performance enrichment and interactions.
- The existing `SegmentedControl` has an optional pill presentation; its default presentation remains available to existing callers.
- No dependencies, mock programs, storage migrations, or new header/navigation implementations were added.

## Modified files

Application:

- `src/features/plan/PlanPage.tsx`
- `src/features/plan/ScheduleView.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/home/homeData.ts`
- `src/components/home/WeekSelector.tsx`
- `src/components/ui/CalendarDayButton.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/styles/plan.css`
- `src/assets/images/plan/README.md`
- `src/assets/images/plan/program-orb.webp` (new)
- `src/assets/images/plan/recovery-bed.webp` (new)
- `src/assets/images/plan/program-dumbbell.webp` (new)

Validation:

- `tests/planResponsibilities.test.tsx`: new landing/tab expectations and explicit wait for program details before asserting its tab.
- `e2e/plan-redesign.spec.ts`: new real-builder test covering empty, rest, training, details, next workout, matching Home/Plan statuses and font, 320–430px widths, and 44px weekly touch targets.
- Existing tab selectors updated in `e2e/app.spec.ts`, `e2e/five-step-builder.spec.ts`, `e2e/hardening.spec.ts`, `e2e/plan-experience.spec.ts`, `e2e/plan-responsibilities.spec.ts`, `e2e/program-release.spec.ts`, `e2e/programHelpers.ts`, and `e2e/startup-compatibility.spec.ts`.
- This implementation report.

## Validation results

- Production build and TypeScript compilation passed. Build retains dependency annotation and large-bundle warnings.
- ESLint passed; changed-file Prettier checks and whitespace checks passed.
- Full unit suite: 240 passed, 3 failed. The remaining failures concern the unchanged shared header: two `appHeader.test.tsx` cases expect a zero streak without a title or an unavailable streak without loader data; `progressStreak.test.tsx` expects the shell's unavailable-streak indicator. The current shared header omits those elements. These cases were not changed as part of the Plan redesign.
- Affected Plan, Home, and shared UI unit tests: 27 passed.
- iPhone Safari browser tests: all 6 selected scenarios passed (3 five-step builder scenarios, Home, Plan/calendar/workout responsibilities, and the dedicated redesign scenario). The final redesign scenario was rerun after spacing and current-day border refinements.
- Repository-wide formatting check remains unsuccessful because of 126 formatting warnings outside the formatted changes; unrelated files were not reformatted.

## Visual verification and differences

Rendered iPhone screenshots were inspected for empty, active/details, training, and recovery states. The dedicated test captured `empty.png`, `recovery.png`, `training.png`, `details.png`, and `home.png` under `test-results/plan-redesign-unified-Plan-602fa-es-and-shares-the-Home-week-Mobile-Safari/`.

The app preserves Manrope, shared header/navigation dimensions, and existing tokens rather than copying the reference's typography. The three newly supplied transparent illustrations are now used for distinct purposes: circular dumbbell only in the creation empty state, sculpted recovery bed only in the overview rest card, and standalone dumbbell only in program details. The overview program summary has no image, and generic schedule prompts use a calendar icon. The supplied artwork is encoded as WebP with alpha transparency and consistent aspect ratios; the three files total about 83 KB. The recovery illustration previously reported missing is now supplied and integrated. Longer workout labels truncate visually in the compact week, with complete names available in accessible labels and on selection. At smaller widths the week can scroll internally to preserve 44px targets; the document itself does not overflow. Longer names and training cards can require vertical scrolling, with bottom clearance provided by the existing shell.

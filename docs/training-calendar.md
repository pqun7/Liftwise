# Training calendar and session dates

`domain/trainingCalendar.ts` resolves the active program against the device's local
calendar. Home and Workout share the Home loader snapshot; Plan uses the same
resolver. Progress uses the same local-date, weekday and week-start utilities.

- `scheduledToday` is the program entry assigned to the current local date. It
  remains scheduled even when a session is completed or another session is active.
- `activeSession` is an unfinished persisted session, independent of the program's
  current schedule. The repository restores its saved exercise and set snapshots.
- `next` is strictly after today for dated programs. An undated program has a
  completion-based rotation with a null scheduled date, labelled "Next in program".
- `startableToday` is separate from the schedule: completion of that day's program
  workout suppresses another suggested start without removing its calendar entry.

Weekdays are Monday-first in existing storage. The `Weekday` constants preserve
that format; `weekdayOf` is the only JavaScript Sunday-first conversion. No database
weekday remapping is necessary.

New sessions capture `scheduledDate` as a local calendar key at creation. Start,
completion, pause and rest-timer fields remain UTC timestamps. Resume, hydration,
program edits and midnight refresh never rewrite the session's calendar key.
Old sessions without the key remain valid, including backups: `sessionCalendarDate`
derives a date from their original start timestamp, never from reopening time.
No destructive migration or inferred rewrite of legacy timestamps is performed.
Legacy data did not record its originating timezone; its fallback uses the current
device timezone. New calendar keys preserve the originating date across travel.

Completed activity, history, charts, weekly totals and streaks are grouped by the
local completion date (falling back to start time for legacy completed sessions
without an end timestamp). This means a Saturday session completed on Sunday counts
as Sunday activity, while the session origin continues to display Saturday.
Progress periods include whole local dates and clamp month ends. Seven days includes
today and the preceding six dates; DST is handled with calendar arithmetic.

Missed days exclude rest dates, future dates and the open current day. A training
date becomes eligible to be missed at the next local midnight. Tracking starts at
the first completed workout. Rest dates are inferred from the current active
program, consistent with the existing product policy; the application does not
store historical versions of schedules.

The shell watches Home, Plan overview, Workout landing and Progress. It schedules
one timeout for the next actual local midnight and revalidates on foreground,
calendar-day changes and timezone changes detected on focus. Cleanup removes the
timer and listeners. Editors and the active logger retain their existing save-safe
lifecycle handling, avoiding background revalidation of unsettled drafts.

Regression coverage is in `tests/trainingCalendar.test.tsx` and
`e2e/training-calendar.spec.ts`: Saturday Legs B with 2/12 sets, Sunday rest,
Monday Push A, reopening storage, offline use, all four screens, local midnight,
foreground refresh, UTC/local date disagreement, Cairo/Los Angeles and DST dates.

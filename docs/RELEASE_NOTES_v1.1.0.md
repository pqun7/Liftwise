# Liftwise v1.1.0 — Program Builder and Workout redesign

## Changes

- Four-step creation: Basics, Schedule, Exercises and Review. Real Full Body, Upper/Lower and PPL templates populate the selected weekdays; Custom keeps an editable routine. Empty Plan guides creation.
- Saved programs retain the continuous editor, inline prescriptions, add/move/copy/reorder and seven unique weekdays. Program metadata saves in order with honest progress/error indicators, retry and navigation protection.
- Workout entry distinguishes scheduled, rest, completed, active, no-program and empty-day states. Empty days open exercise management; starting and resuming use the existing session engine. Recent history is visible again.
- Completed sessions use their assigned date across midnight. Extra sessions, repeated Sunday workouts and reopening never rewrite the weekly program.
- Deferred editor selections are captured before awaiting autosave. Progress metric-grid styles no longer squeeze its header at narrow widths.

## Compatibility and verification

- Application and package version: 1.1.0; no separate native build number. Database schema, historical migrations, backup versions, exercise IDs, fonts and dependencies are unchanged.
- 212 unit/integration tests across 35 files cover existing compatibility and new ordered saves, retry, real database reopening, template rollback, eight weekly sessions, programs with up to seven days and 100 exercises per day, and consistent package/application version metadata.
- Final local gate (2026-10-05): formatter, lint, typecheck, unit/integration tests and deployment build passed. The complete browser suite passed 51 tests with three existing intentional skips in 5.9 minutes. Workbox precaches 69 entries (4142.48 KiB); initial JavaScript is 631.27 kB (194.38 kB gzip).
- Browser coverage uses production builds in WebKit with iPhone emulation and Chrome. It includes creation/review, templates, editing, reload/resume, backup/restore, offline caching, calendar/timezones, typography, 200% text, 320–430px layouts and 44px weekday targets. Existing intentional project-specific skips remain.
- Run the complete formatter, lint, typecheck, test, deployment build and browser gates before merging. The existing GitHub Actions workflow uploads `production-build`; the Git-integrated Vercel project publishes `main`. Confirm the resulting deployment commit and live application version before reporting publication.

## Limitations

- No reference screenshots accompanied the request; exact screenshot fidelity is unverified. Layout follows the written visual requirements and existing local design system.
- Physical iPhone installation, VoiceOver, force-close/background behavior, storage eviction and gym-soak acceptance are unverified. WebKit emulation does not replace the procedures in `IPHONE_TESTING.md` and `SOAK_TESTING.md`.
- Existing bundle-size and dependency annotation build warnings remain visible. Browser storage can be evicted; backups remain the recovery mechanism.

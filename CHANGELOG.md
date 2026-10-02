# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versioning follows Semantic Versioning.

## [Unreleased]

### Refactored

- Tailwind-first shared buttons, cards, named icon actions, form controls, segmented selectors and section headers. Home, Plan, Workout and Progress share semantic emerald tokens and one 430px safe-area-aware shell/navigation.
- Workout exercise/timer presentation extracted without changing timestamp timers or persistence; legacy styles are isolated below utilities for incremental migration.

### Added

- Reference-led Program Builder: Basic Info, Training Days, compact exercise management and Review/Save, with shared stepper and accessible segmented selectors.
- Durable inactive program drafts, optional goal/level/weekday/default-rest metadata, controlled split templates and unsaved-field navigation protection.
- Reference-led mobile Home with suggested-workout, in-progress and rest-day states; photographic heroes, date selection, local program/history cards, weekly progress and insights.
- Reusable Home components, Lucide navigation, contextual Exercise Library links, and three small bundled offline photographs.

### Changed

- Existing exercise search, prescription editing and transactional reordering remain authoritative; programs activate only after explicit finalization. No database-index or released-migration changes.
- Home now derives data through existing validated repositories; Start/Continue actions use the established workout engine. More opens the existing Settings route.
- Date cards retain 44px targets via a compact local scroller on narrow devices. Home and its navigation stay centered at 430px on desktop.
- Compact-form regression assertions now wait for computed typography after viewport resizing, retaining the 16px minimum.

## [1.0.0] - 2026-10-02 — Prepared; device sign-off pending

### Changed

- Updated application/package version and release documentation without changing frozen domain behavior, database schemas or backup formats.
- Strengthened the isolated offline release journey: backup, delete test-only user data, restore, verify workouts and historical prescription, and recover the program.
- Physical-iPhone acceptance and the documented gym soak remain required before stable sign-off.

## [0.9.0] - 2026-10-02

### Added

- Optional screen-awake preference during visible active workouts, with non-blocking unsupported/denied handling and lifecycle cleanup.
- Root screen-error recovery, compact-width/large-text audits, and complete offline training/backup/CSV/chart regression coverage.
- Explicit physical-iPhone QA matrix and multi-session soak plan before v1.0.

### Fixed

- PWA reload safety now also guards controlling events from updates activated in another tab; failed workout checks postpone updates.
- Recovery/read/discard errors are visible instead of silently hidden; media download stops on quota exhaustion without touching user data.
- Storage API failures report Unavailable, and invalid estimates are discarded.
- Current-exercise and Undo controls share one sticky stack instead of overlapping.
- PWA status messages stay in document flow instead of covering form buttons; scrolling reserves bottom-navigation space.
- Touch-device typography also stays zoom-safe in landscape without restricting manual zoom.
- Existing pinned catalogs are read from IndexedDB after restart; failed local artifact initialization can retry.

### Changed

- Feature screens load in separate locally precached chunks. Database remains v6 and backup format remains v2; no historical migrations changed.

## [0.8.0] - 2026-10-02

### Added

- Completed workout and per-exercise history based on session snapshots, with weekly summaries.
- Selectable, locally bundled progress charts and calendar date ranges; accessible chart-value lists.
- Deterministic Epley estimates and reproducible weight, rep-at-load, estimated 1RM, set-volume and exercise-session volume PRs.
- Optional body measurements with edit/delete, plus workouts/sets/body-metrics CSV exports.
- Forward Dexie v6 date-range index, frozen v5 fixture, body measurement and backup compatibility tests.

### Changed

- No stored analytics or award records; corrections recalculate from canonical completed workouts.
- CSV text fields neutralize spreadsheet formulas. Existing backup format v2 remains compatible with older records.

## [0.7.0] - 2026-10-02

### Added

- Glanceable Previous/Today comparison, Copy Previous Set, last-used values, weight/reps adjustments, and draft-only Duplicate Set.
- Atomic set completion/rest and a ten-second Undo with durable reversal.
- Session-only skip/resume and draft exercise replacement; completed exercise identity remains protected.
- Collapsible completed exercises and a safe-area-aware current-exercise/rest control.
- Focused persistence/component tests and one realistic Mobile WebKit gym workflow.

### Changed

- Workout input state remains local to each set row while mutations use the existing repository layer.
- Optional `WorkoutExercise.skipped` persists in IndexedDB and backup v2; older records remain valid without a schema migration.

## [0.6.1] - 2026-10-02

### Fixed

- Editable controls compute to at least 16 CSS px at mobile widths, preventing iPhone WebKit focus auto-zoom while preserving manual pinch zoom.
- Program and day forms no longer focus their name fields automatically on navigation.

## [0.6.0] - 2026-10-02

### Added

- Planned and quick workout flows with session-owned prescription snapshots and locally persisted sets.
- Active-workout recovery, pause/resume, current-exercise state, notes, exercise ordering, and timestamp-based workout/rest timers.
- Recent completed-workout access and previous performance from completed sessions only.
- Backup format v2 carrying the complete v0.6 workout graph, with explicit v0.5 backup migration.

### Changed

- Added forward-only IndexedDB schema version 5; released versions 1–4 remain unchanged.
- Meaningful workout actions now write immediately through repository-owned Dexie transactions.
- PWA activation is deferred while an unfinished workout exists.

### Security

- Historical sessions retain their original prescription after a program is edited or deleted.
- Backup restore retains the v0.5 validation, checksum, preview, transactional replacement, and rollback guarantees.

## [0.5.0] - 2026-10-01

### Added

- Versioned, Zod-validated local backup envelopes with deterministic SHA-256 integrity checks.
- Data Safety screen with database health, last-backup time, storage estimates, honest persistence status, backup creation, restore preview, and strongly confirmed deletion.
- Replace-only restore pipeline with compatibility checks, explicit backup migration, relationship validation, unresolved-provider-reference reporting, transactional import, and in-transaction post-import verification.
- User-data-only export that excludes the RepDB catalog and exercise artwork while preserving stable provider references.
- Custom-exercise CSV export foundation and deterministic v1/v2/v3 database migration fixtures.
- Automated backup round-trip, corruption, compatibility, rollback, restart, storage API, CSV, and Mobile Safari/Chromium recovery coverage.

### Changed

- Settings now separates user-owned data safety from disposable offline exercise media.
- Migration tests use committed historical fixture definitions without rewriting released Dexie schemas.

### Security

- Restore never changes current data until parsing, schema/checksum validation, compatibility checks, migration, and relationship validation succeed.
- A failed transactional replacement rolls back to the exact original user data.
- Backup checksums detect accidental corruption; they are not authentication, encryption, or a digital signature.

## [0.4.1] - 2026-10-01

### Fixed

- Vercel deployments now synchronize the pinned RepDB media pack before building, preventing every optional offline image request from returning 404.
- Offline media caching rejects non-image fallback responses instead of storing them as successful exercise images.
- The accessibility skip link remains visually clipped when iPhone Safari restores ordinary focus and appears only for keyboard-visible focus.

### Changed

- Deployment and browser CI builds now verify that a real RepDB WebP asset is present and served with an image content type.

## [0.4.0] - 2026-10-01

### Added

- iPhone-first program list, program detail, training-day, exercise-picker, and prescription-editor flows.
- Program creation, editing, active selection, deep duplication, and confirmed deletion.
- Training-day creation, editing, duplication, deletion, and accessible Move Up/Move Down ordering.
- RepDB and custom exercise assignment through the existing provider-neutral exercise catalog.
- Deterministic target sets, rep range, RIR range, rest duration, and exercise notes.
- ADR documenting editable program prescriptions versus immutable future workout snapshots.

### Changed

- Added IndexedDB schema version 4 while retaining released versions 1–3.
- Migrated `ProgramDay.dayNumber` to `order` with notes and expanded ProgramExercise prescriptions without changing IDs or references.
- Replaced the Plan placeholder with a complete offline Program Builder.

### Fixed

- Custom exercise creation no longer waits for full RepDB initialization before its local write.

## [0.3.0] - 2026-10-01

### Added

- Pinned RepDB ingestion, validation, transformation, provenance, and verification tooling.
- 601-exercise built-in catalog with deterministic `repdb:<source-id>` identifiers and retained English, German, and Spanish provider text.
- iPhone-first Exercise Library search, filters, incremental rendering, detail pages, image-state handling, and custom exercise form.
- Optional, progress-aware Cache Storage media download and isolated media clearing.
- IndexedDB schema version 3 with provider metadata, catalog seeding, provider/custom separation, and safe inactive records for removed upstream exercises.

### Changed

- Expanded Exercise into a provider-neutral domain model without changing existing program or workout references.
- Upgraded existing v2 exercises in place as custom exercises while preserving stable IDs and notes.

### Security

- No runtime request to RepDB, GitHub, or exercise-dataset.com is required for exercise metadata or user activity.
- Provider records are read-only; users duplicate them as custom records rather than creating synchronization conflicts.

## [0.2.0] - 2026-10-01

### Added

- Nine validated local domain entities with UUIDs and ISO timestamps.
- Dexie schema version 2 with indexes for program and workout relationships.
- Exercise, program, workout, body-metric, and application-settings repositories.
- Immediate transactional workout-set writes and reload-safe workout reconstruction.
- Tested v1→v2 migration preserving existing application settings.
- Relationship validation, explicit deletion rules, and derived workout-volume calculation.
- Local database documentation and IndexedDB architecture decision record.

### Changed

- Expanded the v0.1 storage boundary into separate domain, validation, migration, and repository modules.
- Updated visible application version metadata to v0.2.0 without redesigning the interface.

## [0.1.0] - 2026-10-01

### Added

- React, TypeScript, Vite, and Tailwind CSS application foundation.
- Accessible, iPhone-safe-area-aware shell with Home, Plan, Workout, Progress, and Settings routes.
- Offline-capable PWA manifest, Workbox precache, navigation fallback, and user-controlled update prompt.
- Versioned Dexie database boundary with Zod validation for non-domain application settings.
- Vitest, React Testing Library, fake IndexedDB, and Playwright coverage.
- ESLint, Prettier, strict TypeScript, and GitHub Actions quality gates.
- Architecture, ADR, testing, iPhone validation, roadmap, development log, and issue templates.

[Unreleased]: https://github.com/pqun7/Liftwise/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/pqun7/Liftwise/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/pqun7/Liftwise/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/pqun7/Liftwise/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/pqun7/Liftwise/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/pqun7/Liftwise/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/pqun7/Liftwise/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/pqun7/Liftwise/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/pqun7/Liftwise/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/pqun7/Liftwise/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pqun7/Liftwise/releases/tag/v0.1.0

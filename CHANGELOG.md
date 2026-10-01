# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versioning follows Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/pqun7/Liftwise/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/pqun7/Liftwise/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/pqun7/Liftwise/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/pqun7/Liftwise/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/pqun7/Liftwise/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/pqun7/Liftwise/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/pqun7/Liftwise/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pqun7/Liftwise/releases/tag/v0.1.0

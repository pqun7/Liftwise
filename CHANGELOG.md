# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versioning follows Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/pqun7/Liftwise/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/pqun7/Liftwise/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/pqun7/Liftwise/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pqun7/Liftwise/releases/tag/v0.1.0

# Architecture

## Goals

Liftwise prioritizes reliable installed-iPhone operation, offline availability, device-local privacy, and safe workout data. The application is a static client and has no backend boundary in v0.6.0.

## Layers

```text
Feature UI → feature service → provider-neutral domain → repositories → IndexedDB
                                      ↑
                 build-time provider adapter and local artifact
     ↓
Shared app shell, routing, and presentation components

Data Safety UI → backup service → validation/migration → transactional repository
```

- `src/app` owns composition, top-level routing, navigation, and PWA-facing shell behavior.
- `src/domain` owns framework-independent entity contracts, validation, and derived calculations.
- `src/features` owns product areas. A feature may contain its own components and hooks as it grows.
- `src/lib/backup` owns the portable backup contract, canonical checksum, relationship validation, and backup-format errors without depending on React.
- `src/data/providers` isolates external schemas, validation, adapters, provenance, catalog initialization, and media-cache behavior.
- `src/components` contains shared presentation only. Components should not reach directly into persistence.
- `src/lib/storage` owns database versions, migrations, repositories, transaction boundaries, and validation at storage edges.
- Domain calculations are framework-independent TypeScript modules and are tested without rendering React.

Dependencies should point inward: feature UI may call domain or persistence services, while storage and domain code must not import React.

## Persistence

IndexedDB through Dexie is the durable source of truth. Database version 5 adds active-workout recovery and session snapshots while retaining versions 1–4 and preserving every existing ID/reference. React components do not access tables directly; feature services and repositories validate inputs and persisted reads, check relationships, and own transactions. See `docs/DATABASE.md` for the schema and deletion rules.

Released schema version 1 remains registered, and the v1→v2 migration preserves existing settings while adding their creation timestamp. Future schemas require:

- stable, generated identifiers;
- created and updated timestamps;
- Zod validation at input and read/import boundaries;
- explicit Dexie schema versions and tested migrations;
- transactions for multi-record consistency;
- immediate writes after important workout actions;
- export and recovery design before irreplaceable records ship.

Completed-set volume is calculated from validated set records and is not persisted as duplicated state.

## Backup and restore boundary

The backup service is independent of React and owns the versioned envelope, canonical serialization, SHA-256 checksum, compatibility policy, migrations, preview, and restore orchestration. The data-safety repository owns the precise user-data allowlist and the Dexie replacement transaction.

```text
parse → envelope validation → checksum → compatibility → backup migration
      → relationship validation → preview → explicit confirmation
      → one IndexedDB transaction → canonical post-import verification
```

Only user-owned data is portable. RepDB rows, catalog metadata, and Cache Storage media are excluded; stable `repdb:*` references are retained. An unavailable provider reference is reported and preserved rather than silently deleting user history. Backup v2 includes the v0.6 workout graph; v1 files from v0.5 migrate explicitly. Restore remains replace-only—merge is deliberately deferred until a conflict model can be proven safe. See `docs/BACKUP_AND_RESTORE.md` and ADR-005.

RepDB's raw schema stops at the provider adapter. Program and workout records reference the stable Liftwise ID (`repdb:<RepDB ID>`), never image filenames or raw provider objects. Provider records are read-only; a user edit starts as a separate custom record. Missing upstream exercises become inactive instead of being deleted, preserving historical references.

## Program prescription and workout history

```text
Exercise → stable exerciseId → ProgramExercise prescription → ProgramDay → Program
                                  │
                                  └── start-workout transaction
                                         ↓ snapshot
                                  WorkoutSession → WorkoutExercise → WorkoutSet
```

ProgramExercise is current editable intent. Starting a planned workout copies only the user-relevant prescription and display-name fallback into WorkoutExercise; no complete RepDB record is copied. Historical screens read the snapshot and remain correct after program edits or deletion.

```text
Meaningful workout action → feature service/repository → Dexie transaction → durable state
```

The active session, ordered exercises, sets, notes, current exercise, pause state, and rest timestamps are recoverable after refresh or restart. Timers derive from persisted timestamps. A pending PWA update cannot trigger a reload while an unfinished workout exists.

`localStorage` is reserved for tiny, non-critical preferences and is not currently used.

## Offline model

The Vite PWA plugin generates a Workbox service worker during production builds. The application shell and local catalog artifact are precached. Exercise illustrations use a versioned Cache Storage namespace and are downloaded only after the user chooses the offline media pack. Clearing that cache cannot touch IndexedDB. There are no runtime fonts, CDNs, analytics, or provider API dependencies.

Updates use a prompt rather than forced activation. This prevents a future active workout from being interrupted by an automatic reload.

## Accessibility and mobile behavior

Semantic landmarks, visible focus styles, a skip link, text labels, 44-pixel-or-larger primary controls, reduced-motion support, and sufficient contrast form the baseline. Layout padding incorporates all four CSS safe-area environment values. The viewport uses `viewport-fit=cover`, and the manifest uses standalone portrait mode.

## Testing boundaries

- Unit and integration tests cover schemas, repository behavior, relationships, deletions, migrations, reload persistence, and domain calculations.
- Component tests cover accessible rendering, navigation, and user behavior.
- Playwright tests cover the production bundle, key routes, manifest, and service-worker registration on mobile Safari and desktop Chromium profiles.
- Manual physical-iPhone checks remain required for installation, safe areas, lifecycle interruption, and true offline behavior.

## Security and privacy

No data leaves the browser. The static deployment should use HTTPS, restrictive security headers, immutable hashed assets, and `index.html` with revalidation. Dependency updates are reviewed rather than automatically trusted.

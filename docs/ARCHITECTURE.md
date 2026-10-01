# Architecture

## Goals

Liftwise prioritizes reliable installed-iPhone operation, offline availability, device-local privacy, and safe workout data. The application is a static client and has no backend boundary in v0.3.0.

## Layers

```text
Feature UI → feature service → provider-neutral domain → repositories → IndexedDB
                                      ↑
                 build-time provider adapter and local artifact
     ↓
Shared app shell, routing, and presentation components
```

- `src/app` owns composition, top-level routing, navigation, and PWA-facing shell behavior.
- `src/domain` owns framework-independent entity contracts, validation, and derived calculations.
- `src/features` owns product areas. A feature may contain its own components and hooks as it grows.
- `src/data/providers` isolates external schemas, validation, adapters, provenance, catalog initialization, and media-cache behavior.
- `src/components` contains shared presentation only. Components should not reach directly into persistence.
- `src/lib/storage` owns database versions, migrations, repositories, transaction boundaries, and validation at storage edges.
- Domain calculations are framework-independent TypeScript modules and are tested without rendering React.

Dependencies should point inward: feature UI may call domain or persistence services, while storage and domain code must not import React.

## Persistence

IndexedDB through Dexie is the durable source of truth. Database version 3 adds provider-aware Exercise records and CatalogMetadata while preserving all v2 stores and identifiers. React components do not access tables directly; feature services and repositories validate inputs and persisted reads, check relationships, and own transactions. See `docs/DATABASE.md` for the schema and deletion rules.

Released schema version 1 remains registered, and the v1→v2 migration preserves existing settings while adding their creation timestamp. Future schemas require:

- stable, generated identifiers;
- created and updated timestamps;
- Zod validation at input and read/import boundaries;
- explicit Dexie schema versions and tested migrations;
- transactions for multi-record consistency;
- immediate writes after important workout actions;
- export and recovery design before irreplaceable records ship.

Completed-set volume is calculated from validated set records and is not persisted as duplicated state.

RepDB's raw schema stops at the provider adapter. Program and workout records reference the stable Liftwise ID (`repdb:<RepDB ID>`), never image filenames or raw provider objects. Provider records are read-only; a user edit starts as a separate custom record. Missing upstream exercises become inactive instead of being deleted, preserving historical references.

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

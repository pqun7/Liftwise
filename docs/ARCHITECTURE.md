# Architecture

## Goals

Liftwise prioritizes reliable installed-iPhone operation, offline availability, device-local privacy, and safe workout data. The application is a static client and has no backend boundary in v0.1.0.

## Layers

```text
Feature UI → domain services (future) → validated persistence boundary → IndexedDB
     ↓
Shared app shell, routing, and presentation components
```

- `src/app` owns composition, top-level routing, navigation, and PWA-facing shell behavior.
- `src/features` owns product areas. A feature may contain its own components, hooks, schemas, and services as it grows.
- `src/components` contains shared presentation only. Components should not reach directly into persistence.
- `src/lib/storage` owns database versions, migrations, transaction boundaries, and validation at storage edges.
- Domain calculations will be framework-independent TypeScript modules and tested without rendering React.

Dependencies should point inward: feature UI may call domain or persistence services, while storage and domain code must not import React.

## Persistence

IndexedDB through Dexie is the durable source of truth. Database version 1 creates only a generic application-settings table; workout entities are deliberately absent. Future schemas require:

- stable, generated identifiers;
- created and updated timestamps;
- Zod validation at input and read/import boundaries;
- explicit Dexie schema versions and tested migrations;
- transactions for multi-record consistency;
- immediate writes after important workout actions;
- export and recovery design before irreplaceable records ship.

`localStorage` is reserved for tiny, non-critical preferences and is not currently used.

## Offline model

The Vite PWA plugin generates a Workbox service worker during production builds. Built application assets are precached, old caches are removed, and navigation requests fall back to the local application shell. There are no runtime fonts, CDNs, analytics, remote APIs, or other network dependencies.

Updates use a prompt rather than forced activation. This prevents a future active workout from being interrupted by an automatic reload.

## Accessibility and mobile behavior

Semantic landmarks, visible focus styles, a skip link, text labels, 44-pixel-or-larger primary controls, reduced-motion support, and sufficient contrast form the baseline. Layout padding incorporates all four CSS safe-area environment values. The viewport uses `viewport-fit=cover`, and the manifest uses standalone portrait mode.

## Testing boundaries

- Unit tests cover schemas, storage, migrations, and future domain calculations.
- Component tests cover accessible rendering, navigation, and user behavior.
- Playwright tests cover the production bundle, key routes, manifest, and service-worker registration on mobile Safari and desktop Chromium profiles.
- Manual physical-iPhone checks remain required for installation, safe areas, lifecycle interruption, and true offline behavior.

## Security and privacy

No data leaves the browser. The static deployment should use HTTPS, restrictive security headers, immutable hashed assets, and `index.html` with revalidation. Dependency updates are reviewed rather than automatically trusted.

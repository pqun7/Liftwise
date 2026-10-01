# ADR 0002: Prompted service-worker updates

- Status: Accepted
- Date: 2026-10-01

## Context

An offline-first PWA needs predictable caching and updates. Automatically reloading an installed application could interrupt a future active workout.

## Decision

Generate a Workbox service worker with vite-plugin-pwa, precache local build assets, provide a navigation fallback, and ask the user before applying an available update. Notify once the application is ready offline.

## Consequences

- Users control reload timing and active state is not unexpectedly discarded.
- A user may run an older version until accepting the update.
- Production-preview and physical-device tests are required because service workers are disabled during development.

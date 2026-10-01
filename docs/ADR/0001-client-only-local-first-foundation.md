# ADR 0001: Client-only local-first foundation

- Status: Accepted
- Date: 2026-10-01

## Context

Liftwise must work after installation without an account, connection, backend, or external API. Workout records will be private and must survive ordinary network and application interruptions.

## Decision

Build Liftwise as a static React PWA. IndexedDB, accessed through Dexie and guarded by Zod schemas, is the source of truth. The initial database contains no workout-domain entities. React UI, future domain logic, and persistence remain separate modules.

## Consequences

- Hosting is simple and ordinary usage has no server dependency.
- Data privacy is strong by default, but users will need explicit export and recovery tools before valuable records ship.
- Multi-device sync and accounts are intentionally unavailable.
- Schema migration quality becomes a core product responsibility.

## Alternatives considered

- A backend and account system would add network, privacy, security, and operational dependencies without serving the first release.
- `localStorage` lacks transactional, structured, scalable storage and is inappropriate for workout records.

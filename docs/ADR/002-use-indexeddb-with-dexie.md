# ADR 002: Use IndexedDB with Dexie for local data

- Status: Accepted
- Date: 2026-10-01

## Context

Liftwise must remain fully usable without connectivity, keep workout data on the device, survive application restarts, and persist completed sets immediately. The data is relational enough to require indexes, transactions, schema versions, and migrations, but the product deliberately has no backend.

## Decision

Use browser IndexedDB as the durable source of truth and Dexie as the typed access and migration layer. Keep Zod schemas at repository boundaries, and keep database operations outside React components. Register every released Dexie schema version and exercise upgrades with migration tests.

## Why not localStorage

`localStorage` is synchronous, string-only, non-transactional, and poorly suited to indexed or relational workout records. It also encourages whole-document rewrites that make interruption safety harder. It remains permissible only for tiny, non-critical preferences; v0.2.0 does not use it.

## Why not server SQLite

A server-hosted SQLite database would introduce hosting, networking, authentication, synchronization, availability, privacy, and operational requirements. It would violate the initial no-backend and offline-first product constraints.

## Why not a cloud database

A cloud database would make core features depend on connectivity and third-party infrastructure, require accounts or device identity, and move private workout data away from the device. These costs do not serve the initial product goal.

## Consequences

- Important actions can be written transactionally and queried efficiently without a network.
- Browser storage eviction, device loss, and app deletion can still remove data; export and recovery are required before the workout UI is released.
- Referential integrity is enforced by repositories because IndexedDB has no foreign keys.
- Migrations and validation are long-term product responsibilities.
- Multi-device access and cloud synchronization are intentionally absent.

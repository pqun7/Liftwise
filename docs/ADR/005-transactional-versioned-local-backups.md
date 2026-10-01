# ADR-005: Use versioned, transactional local backups

- Status: Accepted
- Date: 2026-10-01

## Context

Liftwise stores valuable user-owned data locally without an account or server. Browser-managed storage can be cleared or evicted, and future IndexedDB migrations must remain testable. A restore that wipes data before validating the input would violate the product's safety promise.

## Decision

Liftwise exports a strongly versioned, Zod-validated JSON envelope containing only user-owned records and stable provider references. Canonical serialization plus a Web Crypto SHA-256 checksum detects accidental corruption. Restore is previewed and replace-only, then runs deletion, insertion, and exact post-import verification inside one Dexie transaction.

Backup-format migrations live in a dedicated registry outside React screens and outside database migrations. Known older formats migrate forward; unknown future formats are rejected. Missing provider references are reported and preserved. RepDB catalog rows and Cache Storage media never enter the backup.

## Alternatives considered

- **Cloud backup:** conflicts with the current no-account, no-backend, privacy-first boundary.
- **Raw IndexedDB dump:** couples recovery to browser internals and bypasses entity validation and compatibility policy.
- **Validate then clear/import in separate transactions:** can strand the user with partially restored or empty data.
- **Merge on restore:** conflict behavior for IDs, ordering, and historical references is not yet unambiguous.
- **Digital signatures:** require a trusted signing identity/key model that a local user-created file does not have.

## Consequences

Backups are inspectable, deterministic, migration-aware, and recoverable without network access. Failed restores roll back. The checksum is useful against accidental damage but does not prove authorship or prevent deliberate tampering. Replace semantics require explicit confirmation and encourage a pre-restore safety export. New portable formats require new immutable migration fixtures and compatibility tests.

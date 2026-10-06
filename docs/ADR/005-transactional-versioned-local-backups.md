# ADR-005: Use versioned, transactional local backups

- Status: Accepted
- Date: 2026-10-01

## Context

Liftwise stores valuable user-owned data locally without an account or server. Browser-managed storage can be cleared or evicted, and future IndexedDB migrations must remain testable. A restore that wipes data before validating the input would violate the product's safety promise.

## Decision

Liftwise exports a strongly versioned, Zod-validated JSON envelope containing only user-owned records and stable provider references. Canonical serialization plus a Web Crypto SHA-256 checksum detects accidental corruption. Restore is previewed and replace-only, then runs deletion, insertion, and exact post-import verification inside one Dexie transaction.

Backup-format migrations live in a dedicated registry outside React screens and outside database migrations. Known older formats migrate forward; unknown future formats are rejected. Missing provider references are reported and preserved. RepDB catalog rows and Cache Storage media never enter the backup.

### Additive program metadata compatibility (2026-10-06)

Program and program-day validators retain unknown JSON metadata while validating all known fields. This applies to repository reads, updates, duplication, export, and transactional restore. `scheduleType` is an optional nonempty string: `weekly` follows assigned weekdays, `cycle` rotates workouts by completion and permits more than seven days. Missing or future modes retain the existing weekday inference without overwriting the stored value. Cycle weekday metadata is preserved but does not establish calendar rest dates or weekday uniqueness during restore.

No IndexedDB or backup version bump is required. Both the weekly-only release and the schedule redesign already write database version 6; an upgrade callback alone would not repair records arriving later through restore or another client. Adding defaults or deleting `scheduleType` would change legacy scheduling or lose information. Existing version 3-to-4 migrations still convert day numbers to order, and regression tests cover that upgrade and reopening version 6 data.

This compatibility contract covers additive JSON fields on programs/days, not arbitrary changes to required fields or backup/database versions. Malformed known fields, missing references, and unsupported future backup versions remain explicit restore errors before deletion. Future schedule modes are preserved using weekday inference until a client implements their semantics. The weekly editor on `main` does not provide the newer branch's cycle/recovery editing interface.

## Alternatives considered

- **Cloud backup:** conflicts with the current no-account, no-backend, privacy-first boundary.
- **Raw IndexedDB dump:** couples recovery to browser internals and bypasses entity validation and compatibility policy.
- **Validate then clear/import in separate transactions:** can strand the user with partially restored or empty data.
- **Merge on restore:** conflict behavior for IDs, ordering, and historical references is not yet unambiguous.
- **Digital signatures:** require a trusted signing identity/key model that a local user-created file does not have.

## Consequences

Backups are inspectable, deterministic, migration-aware, and recoverable without network access. Failed restores roll back. The checksum is useful against accidental damage but does not prove authorship or prevent deliberate tampering. Replace semantics require explicit confirmation and encourage a pre-restore safety export. New portable formats require new immutable migration fixtures and compatibility tests.

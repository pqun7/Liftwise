# Backup and restore

## Purpose

Liftwise v0.5.0 makes device-local user data portable before live workout logging ships. Backup and restore remain entirely client-side: files are created and selected by the user and are never uploaded by Liftwise.

## Versioned envelope

The current format is `backupVersion: 1`:

```json
{
  "application": "liftwise",
  "backupVersion": 1,
  "schemaVersion": 4,
  "appVersion": "0.5.0",
  "createdAt": "2026-10-01T00:00:00.000Z",
  "data": {},
  "checksum": "sha256-hex"
}
```

Zod validates the envelope and every included entity. `backupVersion` describes this portable file contract; `schemaVersion` records the source IndexedDB schema for compatibility checks. They evolve independently.

The backup contains custom exercises, programs, program days, program prescriptions, portable settings, body metrics, and any existing workout sessions/exercises/sets. It excludes RepDB exercise records, catalog metadata, and downloaded artwork. User-owned records retain stable `repdb:*` references.

## Integrity checksum

Liftwise recursively sorts object keys, preserves array order, serializes the envelope without `checksum`, and calculates SHA-256 using Web Crypto. The checksum detects accidental file corruption or editing. It is **not** encryption, cryptographic authentication, a MAC, or a digital signature; anyone able to modify a file can calculate a replacement checksum.

## Restore pipeline

Restore uses this fixed sequence:

1. Parse JSON without touching IndexedDB.
2. Identify and validate the backup envelope.
3. Verify the checksum.
4. Reject unsupported future backup or database schema versions.
5. Migrate a known older backup through the explicit migration registry.
6. Validate duplicate IDs, ordering, relationships, and exercise references.
7. Show the source date and meaningful entity counts.
8. Require explicit user confirmation for **Replace Current User Data**.
9. Replace user-owned records in one Dexie transaction.
10. Read back, validate, and canonically compare the imported graph before commit.

No destructive write happens during steps 1–8. If any write or verification in steps 9–10 fails, Dexie aborts the transaction and the original data remains intact. The preview offers a fresh safety export before replacement.

Version 0 backup files are supported through one explicit migration that renames the legacy `appSettings` collection to the portable-settings contract. Unknown future versions are rejected; Liftwise never guesses their meaning. Merge is intentionally not implemented because no safe conflict model exists yet.

## Reference handling

Missing custom exercise references are invalid because the backup must contain its own custom records. An unavailable `repdb:*` reference is different: Liftwise reports it in the preview and retains the ProgramExercise or WorkoutExercise. This preserves user structure and stable history until the provider entry is available again.

## Storage and deletion boundaries

IndexedDB holds structured catalog and user data. Versioned Cache Storage holds optional RepDB media. **Delete My Liftwise Data** removes user-owned IndexedDB records but retains provider catalog rows and downloaded media. **Clear Offline Exercise Images** removes only media and cannot remove programs, workouts, measurements, settings, or custom exercises.

`navigator.storage.estimate()`, `persisted()`, and `persist()` are progressive enhancement. Unsupported results are shown as unavailable/unsupported. A granted persistence request reduces eviction risk but does not guarantee permanent storage on iPhone; external backup files remain necessary.

## CSV foundation

The shared CSV encoder handles quoting, commas, line breaks, UTF-8 BOM output, and reusable typed columns. v0.5.0 exports custom exercises only. Workout CSV rows are deliberately deferred until real workout behavior and semantics exist.

## User workflow

Open **Settings → Data Safety**. Use **Create Backup** and store the downloaded `liftwise-backup-YYYY-MM-DD.json` outside browser storage. To restore, choose the file, review the counts and warnings, optionally download the current data, confirm replacement, then restore.

# Local database

## Source of truth

The `liftwise` IndexedDB database is the source of truth for all durable Liftwise data. Dexie owns schema registration, transactions, and upgrades. Zod validates records when they enter repositories and when persisted values return to application code.

React components must not contain complex database queries or write directly to tables. They will call the repositories in `src/lib/storage/repositories`. No core record uses `localStorage`.

## Entity relationships

```text
Program 1 ── * ProgramDay 1 ── * ProgramExercise * ── 1 Exercise
   │                 │                                      │
   └── optional provenance ── WorkoutSession                │
                                  │                         │
                                  1                         │
                                  │                         │
                                  *                         │
                           WorkoutExercise * ───────────────┘
                                  │
                                  1
                                  │
                                  *
                             WorkoutSet

BodyMetric and AppSettings are independent records.
```

References are identifiers rather than nested objects. IndexedDB does not enforce foreign keys, so repositories validate relationships in the same transaction as writes.

## Entities

All record IDs are stable UUIDs created with `crypto.randomUUID()` unless a natural key is explicitly documented. Every entity has ISO `createdAt` and `updatedAt` timestamps.

### Exercise

A provider-neutral movement definition. RepDB records use deterministic IDs such as `repdb:bench-press`; custom records retain UUIDs from `crypto.randomUUID()`. Records include provider identity, localized descriptions/instructions/tips, classification, muscles, goals, structured image slots, activity state, normalized search text, and timestamps. Provider records are read-only. Existing or new custom exercises use the same abstraction and may omit artwork.

### CatalogMetadata

One record per built-in provider containing repository, source commit, upstream schema, import timestamp, exercise count, and measured source/media sizes. This makes initialization version-aware and auditable.

### Program

A named training program with an optional description and archive state.

### ProgramDay

An ordered day belonging to one program with optional notes. The `(programId, order)` pair is unique. Rest days are represented by the absence of a scheduled training day rather than fake exercises.

### ProgramExercise

An ordered, editable prescription belonging to a program day. It references a stable provider-neutral exercise ID and stores target sets, minimum/maximum reps, minimum/maximum RIR, rest seconds, and notes. The `(programDayId, order)` pair is unique. It is current intent—not historical workout truth.

### WorkoutSession

A performed workout with active, paused, completed, or discarded status; start/end/pause timestamps; accumulated paused duration; current-exercise ID; rest start/end timestamps; notes; and optional program provenance. Program references are optional, so quick and historical workouts remain valid. `updatedAt` is the durable last-modified timestamp.

### WorkoutExercise

An ordered performed exercise belonging to a workout session. It references a stable Exercise ID, stores an exercise-name fallback, and may retain optional ProgramExercise provenance. Planned sets, reps, RIR, rest, and notes are copied here at workout start so history never reads mutable ProgramExercise values. The `(workoutSessionId, order)` pair is unique.

### WorkoutSet

An immediately persisted set belonging to a WorkoutExercise:

- `setNumber`: positive integer unique within the workout exercise;
- `setType`: `warmup`, `working`, `drop`, or `failure`;
- `weight`: non-negative number or `null` while drafting;
- `reps`: non-negative integer or `null` while drafting;
- `rir`: value from 0 through 10 or `null`;
- `completed`: completed sets require both weight and reps.

Total volume is derived from completed sets as `weight × reps`; it is not duplicated in IndexedDB.

### BodyMetric

A measurement timestamp with body weight and/or body-fat percentage plus optional notes. At least one numeric measurement is required.

### AppSettings

JSON-safe values keyed by a stable string. Settings cannot contain functions, `undefined`, or non-JSON runtime objects. The v1 natural key remains unchanged so installed v0.1.0 databases upgrade safely.

## Schema versions

### Version 1 — v0.1.0

Created the `appSettings` store with `key` as its primary key and `updatedAt` indexed.

### Version 2 — v0.2.0

Adds all domain stores and relationship indexes. Existing settings gain `createdAt`. A missing or invalid legacy timestamp is repaired during the upgrade rather than causing the entire database to become unavailable.

### Version 3 — v0.3.0

Expands Exercise and adds provider indexes plus `catalogMetadata`. The v2→v3 migration preserves each existing ID and reference, classifies the record as custom, retains name/notes/timestamps, and fills provider-neutral defaults. Catalog initialization is transactional and idempotent. A later provider snapshot upserts matching stable IDs and marks removed built-ins inactive rather than deleting them.

### Version 4 — v0.4.0

Changes the ProgramDay compound order index from `(programId, dayNumber)` to `(programId, order)`, adds day notes, renames prescription rep fields to `minReps`/`maxReps`, and adds target RIR and rest seconds. The forward migration preserves program, day, prescription, and exercise IDs, timestamps, notes, ordering, and references. Missing new fields receive `null`, meaning no target.

### v0.5.0 data-safety note

v0.5.0 does not change the IndexedDB schema, so the current Dexie version remains 4. Backup format versions are intentionally independent from database schema versions. The last successful backup timestamp uses the existing AppSettings store and is not itself portable.

### Version 5 — v0.6.0

Adds session recovery/timer fields and the session-owned prescription snapshot. The v4→v5 migration preserves every ID and relationship, fills recovery fields with safe defaults, and resolves the exercise-name fallback from the existing local catalog where available.

Committed, deterministic v1, v2, v3, and v4 fixture definitions exercise every released upgrade path to the latest database. Historical fixtures and old Dexie version declarations are immutable release evidence; new migrations add a new fixture/version instead of editing old ones.

## Future migration strategy

1. Never edit an already released Dexie version declaration.
2. Add a new `version(n).stores(...)` declaration while keeping all earlier versions registered.
3. Use `upgrade(transaction => ...)` for data transformations and keep every read/write inside that transaction.
4. Preserve stable IDs and user-entered data. Repair safely when possible; reject or quarantine ambiguous imported data rather than silently discarding it.
5. Add tests that open the previous schema, insert representative data, upgrade with the current database class, and verify all records and relationships.
6. Test direct upgrades from every supported historical version when multiple-version jumps become possible.
7. Backward migration is not supported; export/restore must be designed before irreversible transformations are introduced.

## Write and recovery rules

- Each important action performs an awaited IndexedDB write immediately.
- Multi-table actions use Dexie transactions so partial graphs are not committed.
- Records are validated before writes and after reads.
- The UI must show success only after the relevant repository promise resolves.
- Active workout state is reconstructed from WorkoutSession, WorkoutExercise, and WorkoutSet records after refresh or restart.
- Set edits/completion/deletion, session exercise changes, notes, ordering, current exercise, rest, pause, and resume update IndexedDB immediately in a repository transaction.
- Workout duration and rest remaining are derived from persisted timestamps and `Date.now()`; an in-memory countdown is never authoritative.
- Repositories return errors to callers; they do not hide failed writes.
- Backup restore validates the complete portable graph before opening its replacement transaction.
- Replacement clears only user-owned tables/rows, never RepDB catalog records or Cache Storage media.
- Insert and canonical post-import verification happen in the same Dexie transaction. Any error aborts the transaction and preserves the original user data.
- Missing custom references are fatal. Missing `repdb:*` references are reported and preserved so user-owned program/workout structure is not silently discarded.

## Deletion rules

- Exercise deletion is restricted while a program or workout references it.
- RepDB refresh never deletes custom exercises or provider records referenced by history. Removed upstream provider records are retained as inactive.
- Program deletion cascades through ProgramDay and ProgramExercise.
- Program deletion never deletes workout history. Optional program and planned-exercise provenance is set to `null`.
- ProgramDay deletion cascades through its ProgramExercise records and clears optional workout provenance.
- ProgramExercise deletion clears the optional link on historical WorkoutExercise records.
- WorkoutSession deletion cascades through WorkoutExercise and WorkoutSet.
- WorkoutSet, BodyMetric, and AppSettings records may be deleted directly through their repositories.

These rules preserve performed workout history unless the user explicitly deletes the workout session itself.

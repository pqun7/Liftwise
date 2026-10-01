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

A reusable movement definition with a UUID, name, and optional notes. Exercises are referenced by planned and performed exercises.

### Program

A named training program with an optional description and archive state.

### ProgramDay

An ordered day belonging to one program. The `(programId, dayNumber)` pair is unique.

### ProgramExercise

An ordered exercise prescription belonging to a program day. It references an exercise and may include target sets, minimum/maximum reps, and notes. The `(programDayId, order)` pair is unique.

### WorkoutSession

A performed workout with active, completed, or discarded status; start/end timestamps; notes; and optional program provenance. Program references are not required, so ad-hoc and historical workouts remain valid.

### WorkoutExercise

An ordered performed exercise belonging to a workout session. It always references an Exercise and may reference the ProgramExercise that inspired it. The `(workoutSessionId, order)` pair is unique.

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
- Active workout state will be reconstructed from WorkoutSession, WorkoutExercise, and WorkoutSet records after refresh or restart.
- Repositories return errors to callers; they do not hide failed writes.

## Deletion rules

- Exercise deletion is restricted while a program or workout references it.
- Program deletion cascades through ProgramDay and ProgramExercise.
- Program deletion never deletes workout history. Optional program and planned-exercise provenance is set to `null`.
- ProgramDay deletion cascades through its ProgramExercise records and clears optional workout provenance.
- ProgramExercise deletion clears the optional link on historical WorkoutExercise records.
- WorkoutSession deletion cascades through WorkoutExercise and WorkoutSet.
- WorkoutSet, BodyMetric, and AppSettings records may be deleted directly through their repositories.

These rules preserve performed workout history unless the user explicitly deletes the workout session itself.

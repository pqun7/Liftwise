# Development log

## 2026-10-01 — v0.2.0 local data foundation

### Goal

Create a reliable, validated, versioned local data layer that can safely support future planning and workout interfaces without introducing a backend or changing the visual design.

### Work completed

- Added Exercise, Program, ProgramDay, ProgramExercise, WorkoutSession, WorkoutExercise, WorkoutSet, BodyMetric, and AppSettings entities.
- Added UUID creation, consistent ISO timestamps, strict Zod validation, JSON-safe settings, and completed-set invariants.
- Expanded Dexie to schema version 2 while retaining the released version 1 declaration.
- Added explicit repositories for exercise, program, workout, body-metric, and settings operations.
- Added relationship checks, compound uniqueness indexes, immediate workout-set writes, multi-store transactions, and validated reads.
- Added deletion behavior that preserves workout history and removes only records the user explicitly targets.
- Added pure derived workout-volume calculation rather than duplicating totals in IndexedDB.
- Added the database reference and IndexedDB decision record.

### Important decisions

- Existing v1 settings keep their natural `key` primary key so upgrades do not require destructive store replacement.
- Program references are optional workout provenance. Removing a program clears those links but never deletes performed workouts.
- Exercise deletion is restricted while any plan or workout references it.
- Draft sets may have null weight and reps, while completed sets require both.
- Repository promises represent completed IndexedDB writes; future UI must await them before showing success.

### Problems encountered

- The released v1 settings records had no `createdAt`. The migration copies a valid `updatedAt`, or repairs an invalid legacy timestamp with the migration time.
- IndexedDB has no foreign keys. Relationship validation and deletion behavior therefore live in repository transactions and are covered by integration tests.
- Optional program provenance could have become dangling during cascade deletion; deletion now clears WorkoutSession and WorkoutExercise provenance atomically.

### Bugs fixed

- Prevented program and program-day deletion from leaving stale references in historical workout records.
- Rejected completed workout sets that do not contain both weight and reps.
- Rejected invalid persisted records when they cross repository read boundaries.

### Tests added

- v1→v2 migration preservation and timestamp repair.
- Exercise creation, update, deletion, invalid persisted data, and reference restrictions.
- Program relationships, ordering, cascade deletion, and history preservation.
- Workout immediate set updates, cascade deletion, missing relationships, and derived volume.
- Critical close/reopen test proving the complete session, exercise, and set graph survives application-state loss.
- BodyMetric and AppSettings validation and CRUD behavior.

### Known limitations

- There is no user-facing exercise, program, or workout-management UI yet.
- Export, backup, restore, and storage-persistence requests are not implemented.
- Browser storage can still be removed by the user or operating system.
- The schema stores numeric weight values without prescribing a unit; the future settings/UI layer must interpret units consistently.

### Next version

Build the exercise library and program-planning UI on these repositories, and add validated export/recovery before workout logging becomes user-facing.

## 2026-10-01 — v0.1.0 foundation

The repository began with only a one-line README and MIT license. This release establishes the production foundation without adding workout-domain behavior.

### Implemented

- Strict React and TypeScript application built with Vite and Tailwind CSS.
- Mobile-first application shell, safe-area treatment, accessible navigation, and five product-area placeholders.
- Local-only versioned Dexie database boundary with Zod validation.
- Prompted Workbox update flow and offline application-shell caching.
- Automated component, routing, persistence, production-PWA, formatting, lint, type, and build checks.
- CI, issue forms, architectural decisions, and testing/release documentation.

### Decisions

React Hook Form and Recharts are intentionally deferred until forms and charts exist. The local SVG icon is the editable source for deterministic PNG manifest and iPhone touch icons; none require a runtime asset service.

### Next

Design safe export/recovery and the exercise/routine schema before accepting irreplaceable workout records.

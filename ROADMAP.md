# Liftwise roadmap

The roadmap is directional. Reliability, privacy, and data safety take priority over dates.

## v0.1.0 — Project foundation

- [x] Mobile-first React and TypeScript application shell
- [x] Installable/offline PWA configuration
- [x] Safe-area-aware bottom navigation and feature placeholders
- [x] Versioned IndexedDB and runtime-validation boundary
- [x] Unit, component, route, and browser smoke tests
- [x] Automated formatting, linting, type checking, tests, and builds

## v0.2.0 — Local data foundation

- [x] Validated Exercise, Program, ProgramDay, and ProgramExercise records
- [x] Reload-safe WorkoutSession, WorkoutExercise, and WorkoutSet records
- [x] BodyMetric and JSON-safe AppSettings records
- [x] Repository-owned relationships, transactions, and deletion rules
- [x] Tested v1→v2 IndexedDB migration
- [x] Derived workout volume without duplicated persisted state

## v0.3.0 — RepDB exercise catalog

- [x] Pinned and validated RepDB provider ingestion
- [x] Stable provider-neutral exercise identities and IndexedDB seeding
- [x] Accessible local search, filters, details, and custom exercises
- [x] Offline catalog metadata and controlled exercise-image caching
- [x] Provider licensing, attribution, provenance, and update documentation

## v0.4.0 — Program Builder

- [x] Program and day authoring on the stable Exercise abstraction
- [x] Add either built-in or custom exercises to plans
- [x] Accessible day/exercise reordering and deterministic prescription targets
- [x] Active-program selection, duplication, confirmed deletion, and reload recovery
- [x] Validated export and recovery foundations (delivered in v0.5.0 before live workout logging)

## v0.4.1 — Deployment reliability

- [x] Include the pinned optional RepDB media pack in Vercel deployment builds
- [x] Reject non-image media responses before caching
- [x] Keep the skip link hidden from ordinary iPhone Safari focus restoration

## v0.5.0 — Data safety, backup, and migration safety

- [x] Versioned local backup envelope and deterministic SHA-256 integrity checksum
- [x] User-data-only export without RepDB catalog or media redistribution
- [x] Validation, compatibility, migration, preview, confirmation, transactional replace, and post-import verification
- [x] Database health, storage estimate, and progressive persistence status
- [x] Deterministic released-schema migration fixtures and rollback coverage
- [x] Strongly separated user-data deletion and offline-media clearing

## v0.6.0 — Workout logging

- [x] Planned-workout prescription snapshots and program-independent history
- [x] Quick Workout without a program
- [x] Immediate IndexedDB writes after meaningful workout actions
- [x] Recovery from interruption, termination, and refresh
- [x] Timestamp-based duration and rest timers
- [x] Workout-aware PWA update deferral and backup v2 migration

## v0.7.0 — Gym-Speed Workout UX

- [x] Previous/Today workout comparison and reusable actual set values
- [x] Copy, quick adjustments, duplicate draft sets, and atomic Undo
- [x] Session-only skip/replacement and accessible ordering/collapse
- [x] Quick Workout and reload persistence regression workflow

## v0.8.0 — Progress, History, PRs and Analytics

- [x] Completed snapshot history and exercise lifetime summaries
- [x] Selectable progress charts, ranges, deterministic estimates and PRs
- [x] Weekly summaries and optional body measurements
- [x] User-owned CSV exports, v5→v6 and backup regression coverage

No machine learning or progression engine is included.

## v0.9.0 — Release-candidate hardening

- [x] Compact-width, large-text, keyboard focus and offline regression audits
- [x] Non-blocking optional Wake Lock and workout-safe update/recovery handling
- [x] Storage/quota feedback and independently clearable exercise media
- [x] Measured feature splitting and historical migration/backup regression checks
- [ ] Physical-iPhone acceptance and multiple gym-session soak tests before v1.0

## Later

- Optional device-level capabilities where they improve the offline experience
- Accessibility, performance, and internationalization refinements

Accounts, cloud sync, remote APIs, and backend infrastructure are out of scope unless a future version explicitly changes the product direction.

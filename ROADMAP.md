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
- [ ] Validated export and recovery foundations (required before live workout logging)

## v0.5.0 — Workout logging

- Resilient active-workout flow
- Immediate IndexedDB writes after important actions
- Recovery from interruption, termination, and refresh
- Rest timer designed for installed iPhone use

## v0.6.0 — History and progress

- Workout history and personal records
- Local-only progress summaries and charts
- Tested calculations separated from presentation

## Later

- Data backup, restore, and migration tooling
- Optional device-level capabilities where they improve the offline experience
- Accessibility, performance, and internationalization refinements

Accounts, cloud sync, remote APIs, and backend infrastructure are out of scope unless a future version explicitly changes the product direction.

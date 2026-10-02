# ADR-007 — Incremental Tailwind-first shared UI

Status: accepted.

## Context

Home/Plan used different surfaces and shell variants from Workout/Progress. Unlayered legacy CSS overrode utility-based controls, making isolated component migrations unreliable.

## Decision

Use semantic Tailwind aliases backed by shared CSS variables, a small set of domain-free controls and one mobile shell/navigation. Keep routing and mutations in feature controllers. Workout exercise and rest-timer views receive data/callbacks; timer calculations remain timestamp-based.

Legacy rules move beneath utilities in the base layer. Existing Home/Plan compatibility styles remain until their consumers migrate. New UI uses utilities; no new feature stylesheet or dependency is introduced. Explicit size/padding variants avoid conflicting utility overrides.

## Alternatives and trade-offs

A full rewrite would expand regression risk; per-feature primitives perpetuate drift; a third-party UI framework adds unnecessary styling/runtime baggage. Incremental migration preserves behavior but leaves some legacy layouts temporarily. Shared changes require cross-feature browser tests, including mobile typography, safe areas and offline flows. Database schemas, backups, IDs and analytics are unchanged.

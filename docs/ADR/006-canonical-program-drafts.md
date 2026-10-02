# ADR-006 — Keep builder drafts in the canonical program graph

Status: accepted for the guided Program Builder.

## Context

The previous builder persisted individual programs, days and prescriptions. Guided navigation must preserve that work while keeping incomplete new programs away from workout execution.

## Decision

Use the existing IndexedDB Program graph with an optional `draft` flag. New drafts are inactive; Review/Save atomically finalizes them and activates only when no active program exists. Existing saved-program edits retain immediate persistence. Optional goal/level, template, weekday and default-rest fields need no index changes or historical migrations.

## Alternatives and consequences

A React-only draft would lose work on reload. A second draft graph/table would duplicate identity, ordering, validation and backup logic. Neither is necessary. Canonical drafts participate in user backups and can be resumed or explicitly deleted using existing management controls. Field-level unsubmitted edits receive navigation protection; completed steps persist. History still uses session snapshots, never mutable prescriptions. Empty days can be finalized and filled later.

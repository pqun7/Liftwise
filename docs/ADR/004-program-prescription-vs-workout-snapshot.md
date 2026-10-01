# ADR-004: Program prescription versus workout-session snapshot

- Status: Accepted
- Date: 2026-10-01

## Context

A program describes current training intent and is edited over time. A completed or active workout describes what was prescribed when it began and what actually happened. Reading historical prescription details from the current ProgramExercise would silently rewrite history after a program edit.

## Decision

ProgramExercise remains the editable source of current prescription intent: stable exercise ID, order, sets, rep range, RIR range, rest duration, and notes. A future workout-start transaction will create session-owned snapshot fields for only the user-relevant prescription and minimal display fallback data. Actual sets remain separate canonical workout records.

Historical workout rendering must use the session snapshot and actual performance. Program changes or deletion may remove provenance links but must not change the historical snapshot. Full RepDB exercise records and media are not copied into workout history.

v0.4 does not add the snapshot schema because live workout execution is explicitly out of scope. The next workout release must add it through a forward Dexie migration before exposing a Start Workout action.

## Alternatives considered

- Read current ProgramExercise from history: rejected because edits rewrite the past.
- Copy the entire program and RepDB exercise record: rejected because it duplicates provider data and creates migration/license complexity.
- Make programs immutable after first use: rejected because routine maintenance is a core workflow.

## Consequences

The future workout-start operation must be transactional and slightly duplicates prescription values by design. This bounded duplication is necessary historical evidence, not derived analytics. Programs remain freely editable while history remains stable.

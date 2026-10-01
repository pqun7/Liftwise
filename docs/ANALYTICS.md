# Analytics contract — v0.8.0

All results derive from canonical completed sessions, their exercise snapshots and actual sets. Current programs/catalog descriptions never reconstruct old prescriptions. Corrections recompute statistics and PRs; no immutable award log or cached totals exist.

## Included records

Valid completed working, failure and drop sets with finite non-negative recorded load and positive integer reps contribute to working-set count, total reps and logged-load volume (`weight × reps`, kg·reps). Warmups, draft sets, active/paused/discarded sessions and invalid values do not contribute. A skipped exercise's already completed sets remain actual history. Zero-load sets count reps/sets but do not invent bodyweight load.

Best weight and best reps are independently the maximum included values. Best set means greatest single-set logged-load volume, then greater weight. Repeated instances of one exercise within a session are aggregated once. Lifetime sessions count sessions containing at least one qualifying set. Average RIR is the arithmetic mean of known finite 0–10 RIR values on included sets, not an assumed value for blanks. Empty charts show missing values as a dash, not fabricated data. Display rounding is one decimal; calculations use full precision.

## Estimated 1RM — Epley v1

`weight × (1 + reps / 30)` for 2–10 reps; a single uses actual weight. Positive load is required. Drop/warmup sets, known RIR above 3, invalid RIR and incomplete sets are excluded. Missing RIR is permitted, so estimates must remain labeled approximate. RIR is not added to reps. This is not a measured maximum or a training recommendation. Formula changes require an explicit release/documentation/test change.

The established Epley equation is discussed in [this primary research preprint](https://arxiv.org/abs/2603.17495); Liftwise uses the existing equation, not that paper's proposed replacement or fitted models. Applicability limits are Liftwise's conservative deterministic policy, not a claim of validated individual accuracy.

Most recent estimated 1RM means the latest session with an applicable estimate. Best estimated 1RM is the lifetime maximum applicable estimate.

## PR qualification

Process sessions by started-at timestamp, then stable session ID for ties. Compare each session's best result with its prior lifetime maximum for the same stable exercise ID. The first observation establishes a baseline, not an award. Equal results never produce PRs. At most one event per exercise/session/type, except reps-at-load which has one per exact numeric weight.

| Type                       | Minimum improvement | Scope                                         |
| -------------------------- | ------------------- | --------------------------------------------- |
| Weight PR                  | 0.5 kg              | maximum included load                         |
| Rep PR                     | 1 rep               | maximum reps at identical numeric load        |
| Estimated 1RM PR           | 1 kg                | applicable Epley estimate                     |
| Set Volume PR              | 1 kg·rep            | best single included set volume               |
| Exercise-session Volume PR | 1 kg·rep            | sum of included exercise sets in that session |

Thresholds are noise-control policy, not statistical confidence. Subthreshold increases still update the true prior best. A new weight establishes its own rep baseline. Set/session volume is workload, not strength or physiological stimulus; do not compare volume across different exercises or interpret it as calories. Derived event IDs are stable; recalculation never appends duplicate stored awards.

## Dates and queries

Chart/history ranges are rolling calendar months/years in UTC with end-of-month clamping, inclusive endpoints through the captured current time. Sessions belong to their start timestamp, not completion date. Weekly summary uses Monday 00:00 in the device's current local timezone through now; durations subtract persisted pauses. A timezone change can move the weekly boundary.

Overview defaults to 3M using `[status+startedAt]`; only matching completed graphs are fetched. Exercise lifetime statistics and PR baselines use the exerciseId index, related completed session IDs and that exercise's sets only—not all exercises across all years. Chart ranges filter this necessary lifetime baseline. ALL/export intentionally reads broader data. No performance cache or denormalization was introduced. Recharts is locally bundled, lazy-loaded and PWA-precached; readable chart-value/session lists are the accessible equivalent.

## Body measurements and CSV

Body weight is kg, body fat percent 0–100, circumference fields cm (>0). At least one value is required. UI dates are persisted as ISO local-noon timestamps; measurements are optional and editable/deletable.

Exports use UTF-8 BOM, CRLF, comma delimiters, quoted/escaped cells, blank nulls, ISO timestamps and deterministic ordering. Text that could start a spreadsheet formula receives an apostrophe prefix. Numeric cells remain numeric. Export contains all user records (including drafts/status flags), while analytics includes completed qualifying records only. JSON backups remain the supported restoration path.

- `workouts.csv`: id, name, status, started_at, ended_at, duration_seconds (blank if unfinished), notes.
- `sets.csv`: id, workout_id, session_exercise_id, exercise_id, exercise_name_snapshot, set_number, set_type, weight_kg, reps, rir, completed.
- `body_metrics.csv`: id, measured_at, weight_kg, body_fat_percent, waist_cm, chest_cm, arms_cm, legs_cm, notes.

Only stable exercise references and user-owned snapshot names are exported, not RepDB records or images.

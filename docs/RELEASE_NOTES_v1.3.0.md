# Liftwise 1.3.0 — Workout recovery and iPhone controls

Save & Pause commits pending set edits before pausing and leaving. Leaving through
general navigation also pauses training; returning opens the saved workout and
requires explicit Resume. Workout child routes keep training active until the user
leaves them. Failed saves retain drafts and block departure, with an explicit retry.

## Lifecycle decisions

| Situation                                              | Result                                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Save & Pause or leave training for another main screen | Commit drafts, pause both timers, retain sets.                                            |
| Background or lock for less than five minutes          | Continue the same session and wall-clock rest deadline.                                   |
| All windows absent for five minutes or more            | On return, pause at departure, exclude the absence, require Resume.                       |
| OS kills the app without a departure event             | Recover at the last presence checkpoint; show estimated duration and allow correction.    |
| Another window is still visible                        | Its separate presence lease prevents an erroneous interruption.                           |
| No recent set edits while lifting                      | Never interpret this as inactivity.                                                       |
| Pause during rest                                      | Freeze remaining rest; Resume shifts the deadline by the paused interval.                 |
| Finish or discard a paused session                     | Exclude paused time and clear rest; repeated finalization is idempotent.                  |
| Old unfinished session                                 | Continue, finish recorded sets, or discard from Home/Workout; no forced loss of progress. |
| Switch, edit, archive or delete its program            | Keep recorded session snapshots and sets; program changes affect future sessions.         |
| Concurrent edits from another window                   | Reject stale writes atomically; retain local draft and require explicit Retry.            |
| Device clock moves backwards                           | Recover conservatively with nonnegative elapsed time and mark duration estimated.         |
| App update while a workout is unfinished               | Existing update deferral remains in effect.                                               |

If another window finalizes a workout while this window has failed drafts, unsaved
values remain visible with an acknowledged departure action. They cannot overwrite
the finished record or trap navigation.

Optional session fields are validated by the shared strict schema and included in
existing backups. Old records remain readable without a database migration. IndexedDB
is the authoritative source, with one application-wide lifecycle coordinator and
transactional per-window presence. A foreground lease renews every 15 seconds; a live
lease lasts 45 seconds. No periodic heartbeat runs without an active session.
Heartbeats do not change the session's edit timestamp or
revalidate routes. Recovery happens before loaders read unfinished sessions.

## iPhone layout and performance

- Continue for a saved session and contextual Back remain pinned while scrolling.
- Primary logging/rest actions and builder Continue remain above bottom navigation.
- Visual viewport events reposition these controls when editing with the keyboard;
  pinch zoom remains available. Safe-area and measured navigation clearance remain.
- Timer ticks render only the clock components and stop while the document is hidden.
- Queued field writes superseded before execution are coalesced. Historical exercise
  lookup batches candidate exercises and related completed sessions.
- Two transparent illustration encodings shrink from 2,011,116 to 188,604 bytes
  (90.6%). Source PNGs are retained. The production precache is approximately 4.27 MiB,
  compared with approximately 6.01 MiB before compression.

## Verification and limits

On the Windows validation host, 254 unit/storage/UI tests passed, together with
TypeScript, ESLint, normalized-line-ending formatting and RepDB artifact validation.
Production WebKit and Chrome flows passed through full and focused reruns, including
offline backup/restore, calendar/DST, gym-speed editing, pinned actions and window
synchronization. The final focused Safari suite passed 14 tests and the corresponding
Chrome suite passed 10. Timer sampling observed zero database reads/writes per tick;
warm set completion measured 818 ms in WebKit and 190 ms in Chrome in those runs.
These are local preview measurements, not physical-phone benchmarks.

Regression coverage includes interruption grace, window leases, reload recovery,
elapsed/rest pause accounting, duration correction, stale edits, immutable program
snapshots, save failures and retry. Browser tests cover offline data/backup flows,
visible pinned controls, cross-window pause/resume and timer database activity.
TypeScript, ESLint, unit tests and a production build are required for this release.

Automated Mobile Safari uses Playwright WebKit with an iPhone viewport. This is not
physical-device evidence for OS termination, actual keyboard geometry, standalone
installation, Low Power Mode or VoiceOver; the manual iPhone checklist remains required.
An OS kill may lose edits that have not yet committed, and its exact interruption time
cannot be reconstructed; the estimated-duration correction addresses that uncertainty.
The initial JavaScript bundle still exceeds Vite's 500 kB advisory threshold; measured
interaction checks and reduced timer/database work are distinct from a universal
performance guarantee on all devices.

# Development log

## 2026-10-02 — Program-first workflow (unreleased)

- Goal/work: simplify Program first, then Home/Workout. Real previewable templates, weekday/name distinction, inline targets, immediate day-scoped exercise addition and cross-day move/copy.
- Decisions: existing repositories/drafts/snapshots remain authoritative; template version metadata stays in bundled definitions. Confirm replacements and validate references before atomic writes. No schema, backup, font or dependency changes.
- Safety: no new Quick Workout entry points; legacy unplanned sessions/history retained. Program edits never modify performed history. Duration estimates use documented assumptions, not invented performance.
- Tests: template catalog resolution, targets, rollback, move/copy/collision, snapshots and reopen; browser coverage updates for program-first creation and legacy-session recovery. Physical-iPhone testing pending.
- Sources/limitations: see PROGRAM_TEMPLATES.md. Templates are editable healthy-adult starting points, not endorsed or individualized routines. Stop after this overhaul.

## 2026-10-02 — Workout landing (unreleased)

- Goal/work: preparation-first Workout landing, separate from the focused logger. Added reusable photographic hero and ordered prescription preview using shared Tailwind primitives and unchanged fonts.
- Decisions: reuse Home's next-in-program rotation for undated plans; use existing local weekday values for dated plans. Unfinished sessions take priority; completed-today uses the completion timestamp. Optional workouts require explicit choice. No invented duration, calendar dates, progress or performance.
- Safety: active check and creation share one IndexedDB transaction, including competing tabs; route only after commit. Snapshots/prefill remain owned by the existing repository; prefilled sets remain incomplete. No schema, migration, backup, dependencies or logger changes.
- Tests: eight focused state/UI/rollback/concurrent-start/reopen tests; existing logger journey now checks preview, mobile widths, completed-today and same-ID Continue from landing. Existing offline and builder fixtures use explicit Start after selecting a day.
- Limitations: physical iPhone remains required. Static exercise illustrations are optional; unavailable provider references are preserved and block planned start until reviewed in Plan.
- Next: stop at the Workout landing redesign.

## 2026-10-02 — Focused active workout logger (unreleased)

- Goal: implement the supplied iPhone logger reference without redesigning other features or changing fonts.
- Work: focused header/menu, dynamic progress, exercise/history card, compact controlled set editor, current-only adjustments and timestamp rest ring with +30/Skip. Existing management remains in Overview; completed history retains snapshot rendering.
- Decisions: canonical session repositories remain authoritative. Historical prefill happens atomically during set/session creation, never during a read or resume. No schema, migration, backup, dependency or font changes. Existing completion `updatedAt`/undo timestamp is retained rather than adding a redundant field.
- Safety: inputs queue persistence operations; completion drains queued edits and rejects duplicate clicks; repository completion/rest mutation remains transactional. Timers render wall-clock timestamps without per-second writes.
- Tests: controlled draft/adjustment/copy/double-click/advance tests; historical prefill, reopen and rest-extension coverage; realistic planned logging/recovery/history browser journey. Existing recovery, snapshots, backups and analytics tests retained.
- Verification: format/lint/types/RepDB/build passed; full unit/integration run passed 122 tests across 23 files. After fixing failed-edit retry to save without completing, all 5 affected component tests passed (123 distinct tests verified overall). Full browser run: 24 passed, 3 failed harness checks, 3 intentional skips; corrected affected rerun: 8 passed, 2 intentional skips. All 27 applicable scenarios passed overall (14 WebKit, 13 Chromium), including fully offline backup/CSV/history, recovery and snapshot regressions. Logger verified at 320/375/390/393/402/430px with no horizontal overflow and computed 16px inputs. Saved Chrome/WebKit screenshots were compared with the supplied reference; the existing variable font renders lighter in Windows WebKit and was deliberately not changed.
- Cleanup: removed confirmed-unused old logger CSS only. Retained Overview controls and concurrent, unrelated Plan CSS edits. Existing bundle-size/upstream Zod annotation warnings remain. Tests use isolated browser databases, never real user data.
- Limitations: physical iPhone keyboard, installed-PWA suspension and VoiceOver acceptance remain unperformed. RepDB media remains optional; missing images never block logging.
- Next: stop at the active Workout Logger redesign.

## 2026-10-02 — Shared Tailwind UI (unreleased)

- Goal: incrementally unify Home, Plan, Workout and Progress without replacing working feature state/domain architecture.
- Work: shared Button/Card/IconButton/form controls/segmented selector/section header; one mobile shell/navigation; extracted workout exercise/timer views; semantic Tailwind aliases and base-layer legacy compatibility.
- Decisions: no new packages, schemas, backup versions, routes or parallel state. Existing fitness calculations and action handlers remain authoritative. ADR-007 records the cascade/migration boundary.
- Tests: shared-control semantic/ref/disabled/routing/timer contracts; browser-computed colors, widths, touch targets and input typography across the four features. Existing offline recovery, snapshot, backup, migration and analytics tests retained.
- Problems fixed: conflicting primitive utility defaults replaced with explicit sizes/padding; style helpers separated for Fast Refresh; native radio hit targets remain tappable in WebKit. Existing duration formatting preserved. A concurrent Google-hosted Manrope edit was preserved as a self-hosted 164,700-byte licensed asset and precached, eliminating runtime font requests.
- Final verification: format/lint/types/RepDB/build passed; 117 unit/integration tests across 21 files passed, including migration/backup fixtures. Final full browser run: 23 passed, 3 intentional skips, 2 Progress navigation-assertion failures; both passed after awaiting the selected state in targeted WebKit/Chromium reruns. All 25 applicable scenarios therefore passed (12 WebKit, 13 Chromium). Shared UI rerun: 2 passed. Computed colors, 44px navigation targets, 16px editable typography and no horizontal overflow checked at 320/375/390/393/402/430px. Local font verified in Cache Storage; production precache contains 51 entries, 3913.06 KiB.
- Limitations: physical iPhone/VoiceOver acceptance remains required; Windows WebKit renders the variable font lighter than Chromium in saved screenshots. Untouched feature layouts still use quarantined legacy rules. Existing bundle-size and upstream Zod annotation warnings remain.
- Next: stop at this UI architecture refactor.

## 2026-10-02 — Guided Program Builder (unreleased)

- Goal: implement the first three Plan reference screens plus Review, not the reference Workout Logger.
- Work: shared header/stepper, segmented goal/level controls, seven-day selector, controlled split suggestions, persistent day tabs, compact media rows, accessible reorder actions, day settings and review/finalization.
- Decisions: use canonical Program/ProgramDay/ProgramExercise records for drafts; optional metadata needs no new indexes or old-record rewrite. Dexie stays v6, backup stays v2. ADR-006 explains draft isolation from workouts.
- Baseline: clean at `3076ab6`; format/lint/types/103 tests/RepDB/build passed. Six-worker E2E: 18 passed, 3 skipped, 3 pre-existing WebKit timing failures; all three passed unchanged with two workers.
- Tests: durable draft reopen, IDs/prescriptions retained across templates, validation/removal confirmation, rollback, completed snapshot independence and backup round-trip; guided offline browser flow with responsive typography/navigation checks. Existing regression fixtures now use the real guided UI.
- Problems fixed: layout cascade, compact weekday target sizing, WebKit's stale percentage-width fieldset legend after viewport resizing, and asynchronous navigation assertions. Existing fixtures now check the builder's safe-area container and allow time for the longer guided journey. No existing user data was cleared in testing.
- Final verification: format/lint/types/RepDB/build passed; 109 unit/integration tests across 20 files passed, including migration/backup fixtures. Full E2E rerun: 22 passed, 3 intentional skips, 1 remaining WebKit layout failure; after its CSS fix, all 6 affected builder/accessibility/full-offline checks passed in WebKit and Chrome. Thus all 23 applicable browser scenarios have passed (11 WebKit, 12 Chrome). Builder widths checked at 320/375/390/393/402/430px, with 44px weekday targets and local scrolling at 320px. Pinch zoom, 16px editable typography, large text and safe-area padding remain protected. Existing initial-bundle and upstream Zod annotation warnings remain.
- Limitations: physical-iPhone keyboard/VoiceOver/installed-PWA acceptance remains unperformed; no drag dependency, recurring schedule engine or logger redesign. Empty days can be saved for later completion.
- Next: stop at this requested redesign; no Workout Logger redesign or next-release features.

## 2026-10-02 — Home experience (unreleased)

- Goal: implement the supplied premium mobile references within the existing application.
- Work: composable Home cards and local-data loader, three dynamic states, calendar selection, existing workout Start/Continue routes, real weekly comparisons, contextual library filters, Lucide navigation and 430px Home shell.
- Decisions: keep feature-based TypeScript architecture, Dexie v6 and backup v2. The current model has no date schedule, profile name, weekly goal or program duration: show next-in-program suggestions and real counts, not fabricated example figures. Today becomes a rest day after a completed workout; unfinished sessions always take priority.
- Assets: reused the three supplied original photos (220,448 bytes combined), copied to bundled source assets without altering the originals. Only these three photos join the shell precache; RepDB media remains optional and independently clearable.
- Baseline: format/lint/types, 93 tests, RepDB and build passed; E2E 18 passed, 3 skipped, 1 pre-existing Chromium computed-font timing failure. The failing scenario passed unchanged in isolation. Its assertion now polls for settled computed layout without relaxing the 16px requirement.
- Bugs fixed during development: global stylesheet order overrode desktop Home width; specific Home selectors now enforce 430px. Program rotation remains correct after intervening Quick Workouts; skipped completed records retain historical counts.
- Tests: Home derivation, empty state, local calendar boundaries, ordered prescriptions, snapshot independence, Quick Workout recovery/reopen, skipped sets, explicit start/error handling; one Chromium/WebKit journey covers all states, mobile widths, desktop centering, offline photos and library links.
- Final verification: format/lint/types/RepDB/build passed; 103 unit/integration tests across 19 files passed. E2E: 21 passed, 3 intentional project-specific skips (WebKit 10 passed, Chromium 11 passed), including offline backup/restore, recovery, snapshots and all three Home states. Home checked at 320/375/390/393/402/414/430px and centered at desktop width. Production precache: 40 entries, 3709.88 KiB, including the three Home photos.
- Regression harness fixes: scoped ambiguous navigation queries and awaited Home navigation before reload; existing assertions and offline requirements remain intact.
- Limitations: no real-iPhone test has occurred; no dated scheduling or profile settings are introduced. Existing initial-bundle size and upstream Zod annotation build warnings remain.
- Next: stop at the requested Home work; no next-version training features.

## 2026-10-02 — v1.0.0 stable personal release preparation

- Goal: verify the frozen product, not introduce features.
- Work: updated release version/notes; extended the existing offline E2E journey to delete only isolated test-context user data before restore and verify recovered history, prescription and program.
- Decisions: preserve Dexie v6, backup v2, released migrations, canonical workout persistence and RepDB integration. No architectural change or new ADR.
- Problems/bugs: no product release-blocking defect reproduced in targeted recovery, snapshot, backup and migration checks; final results are recorded in `RELEASE_NOTES_v1.0.0.md`.
- Tests: existing close/reopen two-set recovery, timestamp timers, mutable/deleted-program snapshot independence, transactional backup rollback and historical migration fixtures retained; release journey strengthened rather than duplicated.
- Final verification: format/lint/types/RepDB/build passed; 93 unit/integration tests across 18 files passed, including v1–v5 database and supported backup migrations. Browser suite: 19 passed, 3 intentional project-specific skips; WebKit 9 passed, Chromium 10 passed. PWA/offline and isolated destructive restore checks passed. See release notes for limitations.
- Limitations: physical-iPhone installation/background/keyboard/VoiceOver and five-session gym soak are unperformed. Stable sign-off remains pending under `SOAK_TESTING.md`.
- Next: stop at v1.0 preparation; do not begin v1.1.

## 2026-10-02 — v0.9.0 release-candidate hardening

- Goal: daily-use reliability under feature freeze.
- Work: optional Wake Lock with visibility/pause/exit cleanup; guarded PWA controlling reloads; visible root/recovery errors; honest storage status; quota-bounded media downloads; shared sticky workout stack; local feature splitting.
- Decisions: preserve Dexie v6, backup v2, existing canonical workout operations, provider IDs and attribution. Screen-awake is a portable optional preference, not guaranteed device behavior.
- Problems/bugs: a completed IndexedDB catalog was still re-fetching its bundled artifact after restart; reuse pinned metadata/count instead, and release rejected initialization promises for retry. Storage exceptions previously looked like denied persistence. Independent sticky controls overlapped.
- Tests: Wake Lock lifecycle/denial/pending acquisition, update safety including another tab, unknown storage status, quota handling, error boundary, offline catalog reopen/retry, compact-width/large-text layouts and offline full training/backup/CSV/chart workflow.
- Measurements/results: see `RELEASE_QA.md`. Physical iPhone and real gym soak testing have not occurred.
- Final verification: format/lint/types/RepDB/build passed; 93 unit/integration tests passed; final full browser suite passed 19 scenarios with 3 intentional project-specific skips. Initial WebKit failures were fixed in implementation and reverified, not hidden with retries or relaxed assertions.
- Performance follow-up: the first WebKit audit showed a redundant full-record catalog scan; replaced it with an existing indexed count before remeasuring. Landscape touch controls now inherit the same 16px minimum as portrait.
- Final-gate findings: WebKit reproduced a status-toast overlay covering a custom-form submit button, and the redundant catalog scan delayed two existing assertions. Fixed layout/scan behavior rather than relaxing assertions.
- GitHub verification found the Playwright cached-chunk offline-switch limitation also affects Linux. Applied the same network-abort harness to WebKit across platforms; Chromium retains native offline/reload coverage. No product runtime or offline cache behavior was weakened.
- Limitations: browser storage can be evicted; Wake Lock may be denied/revoked. Windows WebKit offline document navigation differs from iOS. Existing bundle/dependency annotation warnings remain visible.
- Next: stop at v0.9.0; v1.0 requires physical acceptance and no unresolved Critical/High defects.

## 2026-10-02 — v0.8.0 progress, history and analytics

- Goal: explain useful training history without ML, duplicated summaries or mutable-program dependencies.
- Work: completed-session history, exercise summaries, lazy-loaded Recharts metrics/ranges, reproducible PRs, weekly summary, body measurement CRUD and CSV exports.
- Decisions: pure Epley v1 calculation and explicit qualification rules (`ANALYTICS.md`); Dexie v6 adds a compound date index. Circumference fields are optional so older records/checksums need no rewrite. Backup stays v2.
- Problems/bugs: preserved older iOS compatibility by sorting copies rather than using `toSorted`; neutralized user-supplied spreadsheet formulas in CSV exports.
- Tests: formula/qualification/PR/correction/range/summary tests; targeted queries, frozen v5 upgrade, body validation/CRUD, old backup acceptance and round-trip/reopen; one offline iPhone-WebKit progress flow.
- Verification: format/lint/types/RepDB/build passed; 81 unit/integration tests passed. Final E2E with `--workers 2`: 15 passed, 3 existing intentional skips. The default six-worker run timed out in three existing WebKit flows; all passed unchanged with bounded concurrency. New controls passed mobile computed-font and 320/390px overflow checks. The existing bundle-size warning remains.
- Limitations: estimates are not measured maxima; logged-load volume is not physiological stimulus or bodyweight volume. Lifetime summaries/PR baselines read the selected exercise's history. Windows Playwright WebKit requires online reload then offline in-app navigation; Chromium covers true offline reload. Real iPhone acceptance remains manual.
- Next: stop at v0.8.0; no automatic next-release work.

## 2026-10-02 — v0.7.0 gym-speed workout UX

### Goal

Reduce deliberate interaction during iPhone set logging without introducing a second workout state model.

### Work completed

- Added Previous/Today, copy previous, last values, weight/reps adjustments, draft duplication, and short Undo.
- Added persistent skip/resume and draft-only session exercise replacement, plus completed-exercise collapse and a sticky current-exercise/rest link.
- Kept keystroke state inside each set row and serialized row writes through the existing repository.

### Important decisions

- Completion/rest and Undo use atomic Dexie transactions. Undo expires after ten seconds and refuses to overwrite a set edited after completion.
- Replacement refuses exercises with completed sets, preserving recorded exercise identity; adding another exercise remains available.
- Skip is an optional validated field, so old IndexedDB/backup records remain valid. Dexie stays v5 and backups stay v2.
- Collapse is presentation state; skip/reorder/replacement persist. Weight adjustment uses a named 2.5kg default, without storing a second source of truth.

### Problems encountered / bugs fixed

- Speed buttons preserve input focus to avoid a blur write canceling the intended tap.
- Completed history controls are read-only; input edits stay inside the row rather than rerendering the entire page per keystroke.

### Tests added

- Repository completion/Undo rollback, duplication, skip, replacement, prior/last values, reload, program independence, and backup compatibility.
- Component copy/adjust/duplicate/explicit completion coverage and one Mobile WebKit Quick Workout scenario.

### Known limitations

- Swipe completion is deferred; visible buttons provide the complete flow. Collapse state and the short Undo prompt do not survive reload, but their persisted actions do.
- Real iPhone keyboard, safe areas, and one-thumb usability still require physical-device testing. The existing chunk-size warning remains.

### Next version

Stop at v0.7.0. No progression, supersets, permanent substitutions, or cloud features are included.

## 2026-10-02 — v0.6.1 iPhone form focus auto-zoom fix

### Goal

Prevent unwanted focus auto-zoom in installed iPhone PWA forms while keeping manual pinch zoom available.

### Work completed

- Added a shared mobile typography floor for editable inputs, textareas, and selects.
- Removed page-load autofocus from ordinary Program and Day forms.

### Important decisions

- Editable mobile controls must compute to at least 16 CSS px. Labels and helper text retain their existing sizes; viewport scaling remains unrestricted.

### Problems encountered

- WebKit measured the Program Name field at 13.12px before the fix. The form inherited its label's 0.82rem font size.

### Bugs fixed

- Focus no longer triggers WebKit's small-field zoom heuristic on covered controls, and opening Program/Day forms no longer focuses an editable field.

### Tests added

- Mobile WebKit computed-style checks for Program, Day, Prescription, Exercise, Search, and Data Safety controls; viewport and representative-width checks.

### Known limitations

- WebKit emulation verifies computed styles, not the physical iPhone keyboard and focus zoom behavior. A real-device acceptance pass remains required.

### Next version

Stop at v0.6.1; no v0.7 functionality is included.

## 2026-10-02 — v0.6.0 workout session core, snapshots, and recovery

### Goal

Make a complete offline workout durable after every meaningful action and historically independent from the editable program.

### Work completed

- Added planned and quick workout start, session exercise/set editing, pause/resume, rest state, completion, discard confirmation, recovery, and recent history.
- Snapshotted the user-relevant prescription and exercise-name fallback when a planned session starts; no RepDB record is copied.
- Added immediate repository transactions for set, exercise, ordering, note, current-exercise, timer, and status changes.
- Added Dexie v5, backup format v2, and explicit v0.5 backup migration.

### Important decisions

- `ProgramExercise` remains mutable intent; `WorkoutExercise` owns the immutable historical prescription snapshot.
- `updatedAt` is the durable last-modified timestamp. Elapsed/rest values are derived from persisted timestamps, never a decrementing counter.
- Discarded sessions remain explicit historical records; an unfinished session is never silently removed.

### Problems encountered

- Export order is not an identity guarantee, so backup assertions locate workout exercises by stable exercise ID.
- Browser update activation needed a repository check before allowing a reload.

### Bugs fixed

- Program edits/deletion can no longer change or remove an existing session's prescription history.
- Refresh/reopen no longer loses completed sets or duplicates them.

### Tests added

- Snapshot immutability, quick workout, immediate writes, exercise ordering/removal, timestamp timers, crash/reopen recovery, completed-only previous performance, program deletion safety, v4→v5 migration, and workout backup round trips.

### Known limitations

- Advanced gestures, supersets, progression, substitutions, plate calculation, and analytics remain out of scope.
- Physical-iPhone lifecycle and PWA suspension testing remains required; WebKit emulation is not a physical-device test.
- The existing production chunk-size warning remains.

### Next version

Stop after v0.6.0. Any later release should build on this persistence model without weakening snapshot or recovery guarantees.

## 2026-10-01 — v0.5.0 data safety, backup, and migration safety

### Goal

Make user-owned Liftwise data recoverable, inspectable, and migration-safe before live workout history starts accumulating, without adding an account, backend, cloud service, or runtime network dependency.

### Work completed

- Added a strict version-1 backup envelope, canonical serialization, Web Crypto SHA-256 integrity checksum, and explicit version-0 migration.
- Added user-data-only export and excluded RepDB records, catalog metadata, and offline media while retaining stable provider references.
- Added a fixed parse/validate/checksum/compatibility/migrate/preview/confirm/transaction/verify restore pipeline.
- Added the iPhone-first Data Safety screen with health, last backup, storage estimates, progressive persistence request, backup, restore preview, CSV export, media management, and strongly confirmed user-data deletion.
- Added atomic replace and exact in-transaction post-import verification with rollback.
- Added immutable migration fixture definitions for released database versions 1–3. No IndexedDB schema change was needed; the latest version remains 4.

### Important decisions

- Backup format versions are separate from IndexedDB schema versions and migrate through a dedicated non-React layer.
- Version 1 is replace-only. Merge is deferred until ID, ordering, and historical conflict semantics are unambiguous and thoroughly tested.
- Missing custom references are fatal. Missing provider references are visible warnings and are preserved rather than deleting user-owned structure.
- The SHA-256 checksum detects accidental corruption but does not authenticate, sign, or encrypt the file.
- User data and downloaded RepDB media remain separate deletion and storage boundaries.

### Problems encountered

- A Mobile Safari end-to-end run could begin backup before the second prescription route had settled. The test now waits for both visible saved rows, reflecting the user-observable persistence boundary.
- The baseline formatting gate already failed on README changes made after v0.4.1; v0.5 reformatted that file without changing its intended content.
- Browser persistence APIs vary by platform, so unsupported and not-granted states are first-class results instead of errors or guarantees.

### Bugs fixed

- Prevented malformed, corrupt, duplicate, incompatible, or internally inconsistent backups from reaching destructive code.
- Prevented partial replacement by placing clear, import, and exact read-back verification in one Dexie transaction.
- Prevented user-data deletion or restore from removing the RepDB catalog or downloaded exercise images.

### Tests added

- Backup export, checksum determinism/tampering, invalid JSON/schema, future version, older migration, duplicate IDs, and missing references.
- Critical mixed custom/RepDB program round trip through clear, restore, database close/reopen, and exact equality.
- Forced mid-import failure proving the original user graph survives unchanged.
- Storage API unsupported/granted states and reusable CSV escaping.
- Mobile Safari and Chromium backup download, delete, upload, preview, confirmed restore, reload, and offline verification.

### Known limitations

- Backups are plaintext local files and are not encrypted or authenticated.
- Restore merge is not implemented; only explicit replacement is supported.
- CSV export covers custom exercises only because live workout rows do not yet exist.
- Storage persistence is browser-controlled and cannot be guaranteed on iPhone.
- Physical-iPhone file-picker, download, eviction, and offline lifecycle validation remains required; WebKit emulation is not a physical-device test.
- The existing production JavaScript chunk-size warning remains.

### Next version

Implement v0.6.0 live workout logging with immediate IndexedDB writes and an immutable session-owned prescription snapshot. Do not read historical prescriptions from mutable ProgramExercise records.

## 2026-10-01 — v0.4.1 Deployment reliability fixes

### Goal

Fix the missing offline exercise-image pack on the deployed Vercel app and prevent iPhone Safari from exposing the keyboard skip link during normal touch launches.

### Work completed

- Reproduced the deployment failure and verified a known RepDB WebP path returned 404 instead of image content.
- Added an explicit deployment build that syncs the pinned RepDB media before Vite packages the app.
- Updated Vercel and browser CI builds to use the deployment command.
- Changed the skip link to the standard visually-clipped pattern and reveal it only with `:focus-visible`.
- Rejected successful HTML fallback responses at the media cache boundary.

### Important decisions

- RepDB media remains excluded from Git so Liftwise does not become a raw dataset mirror; the already-pinned ingestion process materializes the licensed in-app assets at build time.
- Keyboard accessibility remains intact. The skip link was not removed; ordinary Safari focus and keyboard-visible focus now have separate presentation behavior.

### Problems encountered

- The progress indicator correctly counted checked requests, including failures, which made the missing deployment payload surface only after all 1,056 URLs had been attempted.

### Bugs fixed

- Clean Vercel deployments no longer omit the optional 17.46 MB RepDB media payload.
- HTML fallback documents cannot be cached as if they were exercise images.
- iPhone touch launches no longer reveal “Skip to content” above the application header.

### Tests added

- Media Cache Storage success and non-image rejection coverage.
- Browser checks for hidden/default and keyboard-visible skip-link states.
- Production-preview assertion that a known RepDB asset is served as WebP.

### Known limitations

- The currently deployed URL remains affected until commit v0.4.1 is deployed.
- A physical-iPhone launch/resume check is still required; automated Mobile Safari testing is WebKit emulation.
- The media build step requires temporary access to the pinned upstream Git commit during CI/deployment, while installed-app runtime remains fully offline.

### Next version

Continue with validated export/recovery before live workout execution; do not expand this patch into workout functionality.

## 2026-10-01 — v0.4.0 Program Builder and prescription model

### Goal

Make complete training programs maintainable offline on an iPhone-sized interface while establishing a deterministic prescription model that future workout sessions can snapshot safely.

### Work completed

- Added program list/detail/edit flows, active-program selection, deep duplication, and confirmed deletion.
- Added training-day create/edit/duplicate/delete and atomic accessible ordering.
- Reused the existing Exercise catalog and filters to assign RepDB or custom exercise IDs.
- Added deterministic sets, rep range, RIR range, rest seconds, notes, and accessible exercise ordering.
- Added schema version 4 and a forward v3→v4 migration without changing released schemas.
- Added program/history boundary documentation and ADR-004.

### Important decisions

- The active program is a single AppSettings pointer, avoiding conflicting `isActive` flags across program rows.
- ProgramExercise remains mutable intent. Future workout history must use a session-owned snapshot rather than reading the current prescription.
- Ordering changes delete/reinsert only the ordered rows inside one Dexie transaction, preventing transient compound-index collisions.
- Move Up/Move Down is the primary accessible ordering control; no gesture is required.

### Problems encountered

- Compound unique indexes make naïve pairwise swaps fail. Atomic bulk replacement preserves IDs while avoiding duplicate order values.
- The local package mirror was incomplete after pnpm requested dependency-directory reconciliation; the exact existing lockfile was restored before checks continued.
- WebKit catalog initialization is slower under parallel browser tests, so custom writes were decoupled from unnecessary catalog seeding.

### Bugs fixed

- Custom exercise creation now persists immediately without waiting for RepDB initialization.
- Program/day deletion continues clearing only optional workout provenance links and never deletes workout history.
- Day and exercise deletion compact remaining order values atomically.

### Tests added

- v3→v4 migration preserving program/day/prescription/exercise IDs and values.
- Program CRUD, active selection, deep program duplication, day duplication, ordering, and invalid reorder rejection.
- RepDB plus custom exercise assignment, prescription validation, and exact database close/reopen recovery.
- Production Mobile Safari/Chrome program creation, prescription entry, reordering, reload, and offline recovery.

### Known limitations

- No live workout, session snapshot persistence, set logger, rest timer, substitutions, supersets, progression engine, or analytics exists yet.
- Export/restore remains required before workout logging ships.
- Drag gestures are not implemented; accessible buttons provide deterministic reordering.
- Physical-iPhone installation, keyboard, storage-pressure, and offline lifecycle testing still requires a deployed HTTPS build and real device.
- The existing production JavaScript chunk warning remains; route-level splitting is a future performance task.

### Next version

Design validated export/restore and add the forward session-snapshot migration before implementing live workout execution. Do not render workout history from mutable program records.

## 2026-10-01 — v0.3.0 RepDB exercise catalog

### Goal

Add a professional, maintainable, offline RepDB exercise catalog without coupling Programs or Workouts to RepDB and without introducing a runtime service.

### Work completed

- Reviewed RepDB's README, data license, attribution instructions, canonical dataset, and free media at pinned commit `9ed9357f09c7566ea0256c57ebd6374ebb8b575e`.
- Added explicit sync/verify tooling, strict validation, import summaries, provider mapping, provenance metadata, and a committed local catalog artifact.
- Added Dexie schema v3, an idempotent seeder, safe inactive-state updates, read-only built-ins, and first-class custom exercises.
- Added the Exercise Library, six filter dimensions, local search, incremental 40-row rendering, accessible cards/details, paired and main-only media, and custom creation.
- Added a controlled offline image pack with progress, retry-friendly partial caching, failure messaging, and media-only clearing.
- Added visible Settings/README attribution and separated RepDB licensing from Liftwise's MIT source license.

### Important decisions

- Programs and workouts reference provider-neutral deterministic IDs, never raw provider objects or image paths.
- English is displayed initially; English, German, and Spanish source content remains structured for future localization.
- Catalog metadata is precached and seeded into IndexedDB; 1,056 images are opt-in Cache Storage content because forcing the full pack would add 17,460,738 bytes to every install.
- Provider records are read-only and are duplicated as custom before editing. Upstream removals become inactive records instead of broken historical references.

### Problems encountered

- The source dataset supports two valid image shapes. The adapter and UI now model either Start+Peak or Main explicitly.
- Browser-managed storage is constrained on iOS. Media failure is isolated from IndexedDB and exposes retry/clear controls.
- The Windows verification sandbox blocked the test runner from reading its dependency tree; the same command completed with approved project access.

### Bugs fixed

- Preserved v2 custom exercise IDs and program/workout references during the v3 model expansion.
- Prevented repeated initialization from creating duplicates.
- Prevented provider updates from overwriting custom records or deleting removed built-ins.
- Added reserved image dimensions and accessible fallback behavior for missing media.

### Tests added

- Raw schema, malformed record, duplicate ID, safe path, stable ID, mapping, both image shapes, muscles, equipment, difficulty, goals, search, and filters.
- First/second initialization, database restart, provider/custom coexistence, future update deactivation, stable program references, built-in read-only behavior, and duplication as custom.
- v2→v3 migration and missing-image fallback.
- Production-browser search, filter, detail, custom persistence, service worker, and offline metadata flows.

### Measured results

- Canonical JSON: 2,146,044 bytes; generated catalog: 2,450,194 bytes.
- Referenced flat media: 1,056 WebP files totaling 17,460,738 bytes; 467 exercises use paired images and 134 use a main image.
- Production output with the locally staged media pack: 1,068 files totaling 20,556,536 bytes; Workbox precache: 11 entries totaling 2,986.72 KiB, excluding optional WebP media.
- Windows x64 / Node 22.23.2 local benchmark: 601-record first initialization 176.42 ms; close/reopen read 17.34 ms; 1,000 filtered searches 88.11 ms total (0.088 ms average).
- Exercise list behavior: 40 rows rendered initially, with explicit 40-row increments.

### Known limitations

- Physical-iPhone installation, storage-pressure, and offline-media-pack testing still requires a deployed HTTPS release and real device.
- The repository intentionally does not commit the 17.5 MB media folder; deployments that want illustrations run `pnpm repdb:sync:media` first.
- UI language is English only in v0.3, despite retaining provider localizations.
- Export/restore, Program Builder, and Live Workout Logger remain out of scope.

### Next version

Build the Program Builder on the provider-neutral Exercise IDs, then add validated export/recovery before exposing live workout logging.

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

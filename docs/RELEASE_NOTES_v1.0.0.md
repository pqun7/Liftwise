# Liftwise v1.0.0 — Release preparation

Status: automated release gates passed; stable device sign-off pending. No experimental feature, redesign, database migration or backup-format change is introduced.

## Verification

- Targeted checks: 27 tests passed for workout recovery/snapshots, backup safety, historical database migrations and app shell.
- Final gate (2026-10-02): format, lint, TypeScript, RepDB verification and production build passed; 93 unit/integration tests across 18 files passed. Playwright passed 19 scenarios with 3 intentional project-specific skips (1.8 minutes, 2 workers).
- WebKit: 9 passed, 1 intentional full-media-pack skip; Chromium: 10 passed, 2 intentional mobile-only skips. Manifest/icons, service-worker readiness, cached offline routes, full media pack (Chromium), navigation, mobile typography/layout, backup and training regressions passed.
- The isolated browser journey covers offline planned/Quick Workouts, immediate set persistence, recovery, history/charts, CSV, backup, deletion of test-only user data and restore of workouts/programs/prescriptions.
- Dexie stays v6; historical v1–v5 fixtures and supported backup versions 0/1/2 remain the compatibility baseline. Restored records are validated and imported transactionally; failure must preserve existing data.

## Defect and device status

- Critical/High: none reproduced by the complete automated release gate; no release-blocking product fixes were needed. This is not a guarantee of defect-free device behavior.
- Medium: none currently reproduced; physical-device behavior is unverified, not a passed check.
- Low: existing initial-JS chunk-size and dependency annotation build warnings remain visible.
- Production measurements: initial JS 585.17 kB (179.78 kB gzip); Workbox precaches 36 entries (3461.32 KiB). No performance refactor was required for this frozen release.
- Physical iPhone: installation, keyboard/pinch zoom, background/force-close, screen lock, VoiceOver, storage eviction and five-session gym soak still required. Follow `IPHONE_TESTING.md` and `SOAK_TESTING.md`; review the issue log before stable sign-off.
- WebKit emulation is separate from physical testing. Its offline harness blocks actual network requests because Playwright's native switch blocks cached lazy-chunk loading; Chromium independently tests native offline reload. Neither proves physical Home Screen installation or iOS suspension.
- Browser storage may be evicted; optional Wake Lock/persistence can be unsupported, denied or revoked. Static images remain separately clearable.

Recommended release commit: `chore(release): prepare Liftwise v1.0.0`.
Recommended annotated tag: `v1.0.0`, after outstanding device acceptance/sign-off. No GitHub push or publication is part of this preparation.

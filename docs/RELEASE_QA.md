# v0.9.0 release-candidate verification

Environment: Windows, production Vite preview, local pnpm scripts. Physical iPhone and multi-session gym soak testing remain **pending**; see `IPHONE_TESTING.md` and `SOAK_TESTING.md`.

## Automated coverage

- Portrait widths 320/375/390/393/414/430px, 200% root text, simulated 44px top/34px bottom safe insets, landscape, keyboard outline, unrestricted viewport and editable mobile typography.
- Offline catalog/search, program/prescription creation, planned and Quick Workouts, set logging, rest state, pause/resume/recovery, completed history/charts, CSV, JSON backup preview/transactional restore.
- Chromium checks native offline launch/reload and cold feature chunks. Windows WebKit uses network-request aborts because its offline switch also blocks service-worker chunk loading; no physical iOS claim is made. Linux uses native offline mode.
- External application requests are rejected by the audit. This Windows host injects Kaspersky requests; only that specific antivirus hostname is excluded, not application dependencies.
- Wake Lock unsupported/denied/visibility/pause/exit/pending acquisition, safe update checks and another-tab controlling events, quota failures, root error recovery and catalog restart/retry.
- Historical database v1–v5 fixtures migrate to v6; supported backup v0/v1/v2 and rollback/reopen tests remain unchanged in meaning. No new DB or backup version.

## Measured performance

Baseline initial JS: 692.40 kB (gzip 209.92 kB). After feature splitting and hardening: approximately 585.12 kB (gzip 179.77 kB), about 15.5% less initial JS. Chart chunk remains 353.76 kB; it is not loaded on Home. Workbox precaches all 36 local core assets/chunks (approximately 3461.3 KiB), including metadata; 1,056 optional images remain a separate 17,460,738-byte pack.

Representative local audit runs measured first-visible UI latencies (milliseconds, navigation/start action to expected content, not interaction-to-next-paint or real iPhone benchmarks):

| Area             | Chromium | Windows WebKit |
| ---------------- | -------: | -------------: |
| Launch           |      271 |            250 |
| Exercise library |      260 |            799 |
| Program form     |      138 |            342 |
| Active workout   |      139 |           1271 |
| History/Progress |       86 |            572 |
| Chart visible    |      964 |            543 |

Results vary by machine, browser instrumentation and concurrency. No analytics caching/denormalization was added. An initial WebKit library measurement of 9834 ms exposed a redundant full-record scan; replacing it with the existing indexed count produced the 799 ms measurement above. These are successive local audit runs, not controlled physical-device benchmarks.

Browser-estimated storage after catalog, two workouts, a program and restored backup, excluding optional images: Chromium 6,770,631 bytes; WebKit 6,648,975 bytes. Estimates are approximate and browser-specific, not promises of iOS capacity/persistence.

## Final gate

- Format, ESLint, TypeScript, RepDB artifact verification and production build: passed.
- Vitest: 93/93 tests, 18 files passed, including historical migrations and backup/rollback/reopen tests. A missing timestamp in a new mock was corrected without weakening validation.
- Playwright (`--workers=2`): 19 passed, 3 intentional project-specific skips, 0 failed (final full run, 1.7 minutes). Mobile Safari: 10 passed/1 skip; Desktop Chrome: 9 passed/2 skips. Full optional media download passed in Chromium.
- First full-gate browser run exposed three WebKit failures (catalog scan delay and status-overlay interception). Corrected implementation, passed targeted reruns, then passed the full final browser suite unchanged in assertions.
- PWA/offline: manifest/installability configuration, native Chromium offline document reload, cached feature screens/catalog/charts and network-blocked Windows WebKit core workflows passed. Physical installability remains manual.

The local pnpm runtime required `--config.verify-deps-before-run=false` to use already-installed dependencies after the package version changed; no dependency/lockfile changes were made. Affected checks were rerun after fixes.

## Remaining acceptance and issues

- Physical acceptance, VoiceOver, real keyboard/zoom, Low Power Mode, storage eviction and five-session soak: pending, not passes.
- No reproduced Medium defect remains in the automated flows. Physical acceptance/performance remains unverified.
- Low: initial chunk still exceeds Vite's 500 kB advisory; existing third-party Zod annotation warnings remain. Neither is suppressed.
- No known reproduced Critical/High defect remains in the exercised flows; this does not establish physical acceptance or authorize v1.0.

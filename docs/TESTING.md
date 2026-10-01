# Testing strategy

## Quality gate

Every change should pass:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

GitHub Actions runs these checks on pull requests and pushes to `main`. Browser failures upload a Playwright report.

## Test layers

### Unit and storage tests

Vitest runs TypeScript tests in JSDOM. `fake-indexeddb` provides the IndexedDB APIs required by Dexie. Tests use unique database names and close/delete them after each case. The storage suite covers validated CRUD, relationship enforcement, deletion rules, real v1→v2, v2→v3, and v3→v4 upgrades, closing/reopening workout and program graphs, provider initialization/restart/update behavior, stable IDs, and custom/provider coexistence.

RepDB unit tests cover schema failures, duplicate IDs, safe image paths, mapping, both image shapes, muscle/equipment/difficulty/goal mapping, search, and filters. `pnpm repdb:verify` validates the generated 601-record artifact independently of UI tests.

Media-cache tests verify successful Cache Storage writes and reject HTML fallback documents even if a host responds successfully. Deployment builds use `pnpm build:deployment` to materialize the pinned media pack before browser verification.

### Component and route tests

React Testing Library tests the interface through accessible roles and names. Prefer user events and visible outcomes over component internals. Routes use an in-memory router in tests.

### End-to-end tests

Playwright starts the built production preview and runs iPhone Safari and desktop Chromium profiles. The suite checks navigation, manifest/service-worker behavior, hidden and keyboard-visible skip-link states, a real WebP response, the complete 1,056-image download, exercise catalog flows, and a complete create-program → add-day → add RepDB/custom prescriptions → reorder → reload → offline recovery flow.

Install browsers once with:

```sh
pnpm exec playwright install chromium webkit
```

Emulation does not replace a physical iPhone. Follow `docs/IPHONE_TESTING.md` before a release.

## Future release requirements

Workout features require tests for immediate writes, interruption recovery, duplicate-action safety, schema migration, validation failure, timer lifecycle, and calculations. A failed data-safety test blocks release.

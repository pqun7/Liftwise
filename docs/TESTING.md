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

Vitest runs TypeScript tests in JSDOM. `fake-indexeddb` provides the IndexedDB APIs required by Dexie. Tests use unique database names and close/delete them after each case. The storage suite covers validated CRUD, relationship enforcement, deletion rules, a real v1→v2 upgrade, and closing/reopening a complete workout graph. Add direct upgrade tests before incrementing a database version.

### Component and route tests

React Testing Library tests the interface through accessible roles and names. Prefer user events and visible outcomes over component internals. Routes use an in-memory router in tests.

### End-to-end tests

Playwright starts the built production preview and runs iPhone Safari and desktop Chromium profiles. The smoke suite checks route navigation, generated manifest availability, and service-worker registration.

Install browsers once with:

```sh
pnpm exec playwright install chromium webkit
```

Emulation does not replace a physical iPhone. Follow `docs/IPHONE_TESTING.md` before a release.

## Future release requirements

Workout features require tests for immediate writes, interruption recovery, duplicate-action safety, schema migration, validation failure, timer lifecycle, and calculations. A failed data-safety test blocks release.

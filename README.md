# Liftwise

Liftwise is a local-first, offline-first, iPhone-first gym manager and workout logger. It is being built as a maintainable product, not a demo.

Version **0.4.1** keeps the offline Program Builder from v0.4.0 and fixes deployment of the optional RepDB image pack plus an iPhone Safari skip-link focus artifact. It intentionally does not add live workout execution.

## Product principles

- Mobile-first and especially comfortable as an installed iPhone PWA.
- Fully usable without a connection after initial installation.
- No account, backend, cloud service, tracking, remote API, or runtime CDN.
- IndexedDB is the source of truth for important user data.
- Immediate, validated, recoverable persistence for future workout actions.
- Clear boundaries between interface, domain logic, and persistence.

## Technology

React, TypeScript, Vite, Tailwind CSS, React Router, Dexie, Zod, React Hook Form, vite-plugin-pwa/Workbox, Vitest, React Testing Library, Playwright, ESLint, and Prettier. Recharts remains deferred until charts exist.

## Getting started

Requirements: Node.js 22 or newer and pnpm 10.

```sh
pnpm install
pnpm repdb:sync:media
pnpm dev
```

Open the local URL printed by Vite. Service workers are disabled in development; use the production preview to test installation and offline behavior:

```sh
pnpm build
pnpm preview
```

Deployment builds that must include the optional RepDB image pack use `pnpm build:deployment`. The Vercel configuration runs this command automatically so all 1,056 pinned image assets are copied into the generated app without committing the raw media folder.

## Quality commands

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:deployment
pnpm test:e2e
```

`pnpm check` runs all non-browser quality checks. Browser tests require Playwright browsers (`pnpm exec playwright install chromium webkit`).

RepDB updates are explicit and pinned. `pnpm repdb:verify` checks the committed catalog. `pnpm repdb:sync` rebuilds catalog metadata from the pinned upstream commit, while `pnpm repdb:sync:media` also stages licensed free-tier images locally for builds. See [RepDB integration](docs/REPDB_INTEGRATION.md).

## Project layout

```text
src/
  app/          routing, navigation, and application shell
  components/   reusable presentation components
  data/         external provider adapters and catalog initialization
  domain/       entities, validation, and derived calculations
  features/     product-area modules, including exercises and program planning
  lib/storage/  IndexedDB database, migrations, and repositories
  styles/       global mobile-first styles
tests/          unit and component tests
scripts/repdb/  pinned validation, transformation, and synchronization tools
e2e/            production-preview browser tests
docs/           architecture, decisions, testing, and release notes
```

See [Database](docs/DATABASE.md), [Architecture](docs/ARCHITECTURE.md), [RepDB integration](docs/REPDB_INTEGRATION.md), [third-party data](docs/THIRD_PARTY_DATA.md), [Testing](docs/TESTING.md), [iPhone testing](docs/IPHONE_TESTING.md), and the [Roadmap](ROADMAP.md).

## Data and privacy

Liftwise sends no user data anywhere. Important records use IndexedDB rather than `localStorage`, with UUIDs, schema migrations, runtime validation, ISO timestamps, and transactional writes. Workout sets are written by repository operations immediately rather than accumulated in React state. Clearing site data or deleting the app still removes local data; export and recovery controls are required before the workout UI ships.

## License

Liftwise source code is licensed under [MIT](LICENSE). RepDB exercise data and artwork are third-party materials governed by RepDB's separate data license; the Liftwise MIT license does **not** cover them.

[Exercise data by RepDB (repdb.co)](https://repdb.co)

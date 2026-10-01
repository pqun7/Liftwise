# Liftwise

Liftwise is a local-first, offline-first, iPhone-first gym manager and workout logger. It is being built as a maintainable product, not a demo.

Version **0.2.0** adds the durable local data foundation: validated domain entities, explicit relationships, repository-owned writes, schema migrations, and reload-safe workout persistence. It intentionally does not add the full workout UI.

## Product principles

- Mobile-first and especially comfortable as an installed iPhone PWA.
- Fully usable without a connection after initial installation.
- No account, backend, cloud service, tracking, remote API, or runtime CDN.
- IndexedDB is the source of truth for important user data.
- Immediate, validated, recoverable persistence for future workout actions.
- Clear boundaries between interface, domain logic, and persistence.

## Technology

React, TypeScript, Vite, Tailwind CSS, React Router, Dexie, Zod, vite-plugin-pwa/Workbox, Vitest, React Testing Library, Playwright, ESLint, and Prettier.

React Hook Form and Recharts will be added when forms and charts exist; v0.2.0 avoids unused dependencies and premature abstractions.

## Getting started

Requirements: Node.js 22 or newer and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Service workers are disabled in development; use the production preview to test installation and offline behavior:

```sh
pnpm build
pnpm preview
```

## Quality commands

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm check` runs all non-browser quality checks. Browser tests require Playwright browsers (`pnpm exec playwright install chromium webkit`).

## Project layout

```text
src/
  app/          routing, navigation, and application shell
  components/   reusable presentation components
  domain/       entities, validation, and derived calculations
  features/     product-area modules
  lib/storage/  IndexedDB database, migrations, and repositories
  styles/       global mobile-first styles
tests/          unit and component tests
e2e/            production-preview browser tests
docs/           architecture, decisions, testing, and release notes
```

See [Database](docs/DATABASE.md), [Architecture](docs/ARCHITECTURE.md), [Testing](docs/TESTING.md), [iPhone testing](docs/IPHONE_TESTING.md), and the [Roadmap](ROADMAP.md).

## Data and privacy

Liftwise sends no user data anywhere. Important records use IndexedDB rather than `localStorage`, with UUIDs, schema migrations, runtime validation, ISO timestamps, and transactional writes. Workout sets are written by repository operations immediately rather than accumulated in React state. Clearing site data or deleting the app still removes local data; export and recovery controls are required before the workout UI ships.

## License

[MIT](LICENSE)

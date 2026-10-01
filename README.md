# Liftwise

> **Private. Offline-first. Built for iPhone.**

Liftwise is a personal gym manager and workout-planning Progressive Web App designed specifically for **iPhone**. It is built to feel like an installed mobile app while keeping your fitness data **on your own device**.

The project is intentionally local-first: there is no Liftwise account, no backend database, no cloud sync, no analytics, no tracking, and no runtime API required for normal use.

**Current release: v0.4.1**

> [!IMPORTANT]
> Liftwise is currently an **iPhone-first personal application**. Android, iPad, and desktop browsers may work during development or testing, but they are not the primary supported experience.

---

## Contents

- [Why Liftwise](#why-liftwise)
- [Available today](#available-today)
- [Install on iPhone](#install-liftwise-on-iphone)
- [How to use Liftwise](#how-to-use-liftwise)
- [Privacy and personal data](#privacy-and-personal-data)
- [Offline behavior](#offline-behavior)
- [Data safety and backups](#data-safety-and-backups)
- [Product status](#product-status)
- [Technology](#technology)
- [Architecture](#architecture)
- [Development](#development)
- [Testing and quality](#testing-and-quality)
- [Project structure](#project-structure)
- [Engineering rules](#engineering-rules)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [License and third-party data](#license-and-third-party-data)

---

## Why Liftwise

Liftwise is being built as a real, maintainable personal training application rather than a demo.

Its core principles are:

- **iPhone-first UX** — portrait-first, safe-area-aware, one-handed, Home Screen app experience.
- **Private by default** — personal training data stays in browser storage on the user's iPhone.
- **Offline-first** — implemented features remain usable without depending on a live backend.
- **No account required** — no registration or login.
- **No cloud dependency** — no remote database, analytics service, CDN, or third-party runtime API is required for normal use.
- **Reliable persistence** — important records use IndexedDB instead of temporary component state.
- **Data safety before feature count** — export/recovery foundations are required before irreplaceable workout history ships.
- **Maintainable architecture** — UI, domain logic, external exercise data, and persistence have clear boundaries.

---

## Available today

### Exercise Library

Liftwise includes a locally available exercise catalog based on a pinned RepDB dataset.

Current capabilities include:

- browse and search exercises;
- filter by supported properties such as body part and equipment;
- open exercise details and instructions;
- view available start/peak artwork;
- create personal custom exercises;
- keep catalog metadata available offline;
- optionally cache supported exercise media for offline use.

### Program Builder

Programs are stored locally on the device.

You can:

- create multiple programs;
- choose an active program;
- create workout days;
- add built-in or custom exercises;
- set target sets;
- set rep ranges;
- set RIR targets;
- set rest time;
- add notes;
- reorder days and exercises;
- duplicate programs and days;
- edit prescriptions;
- delete items with confirmation;
- close and reopen Liftwise without losing the saved program.

### Installed iPhone PWA

Liftwise is configured with:

- standalone display mode;
- portrait-first orientation;
- iPhone safe-area support;
- Home Screen icons;
- an offline application shell;
- Workbox service-worker caching;
- user-controlled update prompts;
- no forced reload when a new version becomes available.

### Not available yet

The following are **not complete in v0.4.1**:

- live workout execution;
- set logging;
- rest timer;
- workout history;
- personal records;
- progress charts;
- validated data export;
- backup and restore;
- user accounts;
- cloud sync.

See [ROADMAP.md](ROADMAP.md) for the current development sequence.

---

## Install Liftwise on iPhone

Liftwise is intended to be opened from the **iPhone Home Screen**, not used primarily as a normal browser tab.

### 1. Open Liftwise in Safari

Open the deployed HTTPS version of Liftwise in **Safari on iPhone**.

> [!NOTE]
> Safari is the supported installation path for the iPhone PWA experience.

### 2. Add it to the Home Screen

In Safari:

1. tap **Share**;
2. choose **Add to Home Screen**;
3. confirm the name is **Liftwise**;
4. tap **Add**.

The Liftwise icon will appear on the Home Screen.

### 3. Launch it like an app

Open Liftwise from its Home Screen icon.

It will launch in a standalone app-style window without the normal Safari browser interface.

### 4. Complete the first load while online

The initial load should be completed with an internet connection so the application shell and required local assets can be prepared.

After the required resources are cached, supported features are designed to continue working offline.

---

## How to use Liftwise

A normal personal workflow is:

### Step 1 — Find exercises

Open the **Exercise Library** and search or filter the catalog.

If an exercise is not included, create a custom exercise for your own library.

### Step 2 — Create a program

Open **Plan** and create a structure such as:

- Push / Pull / Legs;
- Upper / Lower;
- Full Body;
- any custom split.

Add the workout days you want to follow.

### Step 3 — Build each day

Choose exercises from the built-in catalog or your custom exercises.

For each exercise, define:

- sets;
- rep range;
- RIR;
- rest time;
- notes.

### Step 4 — Organize the plan

Reorder days and exercises until the program matches your preferred training sequence.

The program is persisted locally and should remain available after closing and reopening the app.

### Step 5 — Use supported features offline

Once Liftwise and the required assets are available locally, reopen the installed app without a network connection and continue using the features already implemented.

### Step 6 — Update when prompted

Liftwise uses a prompt-based update flow so a future active workout is not interrupted by an automatic reload.

---

## Privacy and personal data

### Your data stays on your device

Liftwise is designed so personal application data remains inside the browser storage associated with Liftwise on the iPhone.

| Item | Current behavior |
| --- | --- |
| Liftwise account | Not required |
| Backend database | None |
| Cloud sync | None |
| Analytics / tracking | None |
| Runtime exercise API | None |
| Personal workout-data upload | None |
| Main structured storage | IndexedDB |
| Exercise media | Versioned Cache Storage |
| Critical data in `localStorage` | Not currently used |

Liftwise does **not** send your programs, custom exercises, workout records, body metrics, or application settings to a Liftwise server because the current architecture has no Liftwise backend.

### What “private” means

Private does not mean browser storage can never be deleted.

It means Liftwise is deliberately designed without a remote account or server receiving your personal fitness data during normal use.

Anyone who can unlock and use the iPhone may still be able to open the installed app. Device-level protection remains the user's responsibility.

Recommended iPhone protections include:

- a strong passcode;
- Face ID where appropriate;
- current iOS security updates.

---

## Offline behavior

Liftwise follows a local-first/offline-first model.

### Structured data

IndexedDB, accessed through Dexie, is the durable source of truth for important records.

The schema covers areas such as:

- exercises;
- custom exercises;
- programs;
- program days;
- exercise prescriptions;
- application settings;
- workout/history entities prepared for later features.

### Exercise media

Exercise illustrations use versioned browser **Cache Storage** rather than the structured IndexedDB database.

This separation is intentional: clearing an exercise-image cache should not delete program records.

### No runtime provider dependency

Normal use is designed without runtime dependencies on:

- RepDB;
- GitHub;
- remote fonts;
- analytics providers;
- third-party application APIs.

RepDB data is validated and transformed through the controlled project data pipeline rather than being used as a personal runtime service.

---

## Data safety and backups

> [!WARNING]
> **Backup and restore are not yet implemented in v0.4.1.**

Current user data is local to the iPhone/browser storage for the Liftwise deployment.

That data can be lost if the relevant site/app storage is removed, for example by:

- clearing Liftwise website data in Safari settings;
- erasing/resetting the device;
- removing browser-managed storage;
- switching to another deployment origin;
- an unexpected browser-storage loss scenario.

Because there is currently no Liftwise account or cloud copy, deleted local data cannot be automatically restored from a server.

For this reason, the roadmap requires **validated export and recovery foundations before live workout logging ships**.

Until backup/restore is released, do not use the current development version as the only permanent copy of irreplaceable fitness history.

---

## Product status

| Area | v0.4.1 |
| --- | --- |
| iPhone-oriented PWA shell | Available |
| Offline application shell | Available |
| IndexedDB persistence | Available |
| Exercise Library | Available |
| Custom exercises | Available |
| Program Builder | Available |
| Offline exercise metadata | Available |
| Optional offline exercise media | Available |
| Live Workout Logger | Planned for v0.5 |
| Workout history | Planned |
| Progress / personal records | Planned |
| Backup / restore | Planned |
| Accounts / cloud sync | Out of current scope |

Reliability, privacy, and data safety take priority over adding features quickly.

---

## Technology

| Area | Technology |
| --- | --- |
| UI | React 19 |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Local database | IndexedDB + Dexie |
| Validation | Zod |
| Forms | React Hook Form |
| PWA / offline | vite-plugin-pwa + Workbox |
| Unit/component tests | Vitest + React Testing Library |
| Browser tests | Playwright |
| Linting | ESLint |
| Formatting | Prettier |
| Package manager | pnpm |

Recharts remains deferred until charting features actually exist.

---

## Architecture

```text
Feature UI
    ↓
Feature service
    ↓
Provider-neutral domain
    ↓
Repositories
    ↓
IndexedDB
```

External exercise-provider data stays behind a provider adapter:

```text
Build-time provider adapter ──→ local catalog artifact
                                  ↓
UI ──→ feature logic ──→ domain ──→ repositories ──→ IndexedDB
```

Important boundaries:

- React components should not directly own critical persistence.
- Storage/domain code must not depend on React.
- Provider-specific schemas must not leak into historical workout records.
- Important records use stable identifiers.
- Storage boundaries validate inputs and persisted reads.
- IndexedDB changes use explicit schema versions and tested migrations.
- Multi-record consistency belongs inside repository transactions.
- Derived values should be calculated instead of stored redundantly.
- Future workout actions should persist immediately rather than waiting in volatile UI state.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Development

### Requirements

- Node.js **22+**
- pnpm **10**

The repository currently pins `pnpm@10.15.1`.

### Install

```sh
pnpm install
```

### Prepare optional RepDB media

```sh
pnpm repdb:sync:media
```

### Start development

```sh
pnpm dev
```

Open the URL printed by Vite.

> [!NOTE]
> Service workers are disabled in development mode. Do not use `pnpm dev` alone to validate PWA installation or offline behavior.

### Test a production build

```sh
pnpm build
pnpm preview
```

For a deployment build that must include the optional RepDB media pack:

```sh
pnpm build:deployment
```

The Vercel configuration uses the deployment build so the pinned RepDB image pack can be included without committing the raw media directory.

---

## Testing and quality

Run the standard non-browser quality pipeline:

```sh
pnpm check
```

It currently runs formatting validation, linting, TypeScript checking, unit/component tests, and a production build.

Individual commands:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:deployment
pnpm test:e2e
```

Install Playwright browsers when needed:

```sh
pnpm exec playwright install chromium webkit
```

### RepDB checks

Verify the committed catalog:

```sh
pnpm repdb:verify
```

Rebuild catalog metadata:

```sh
pnpm repdb:sync
```

Rebuild metadata and stage licensed free-tier media:

```sh
pnpm repdb:sync:media
```

See [docs/REPDB_INTEGRATION.md](docs/REPDB_INTEGRATION.md).

### Physical iPhone testing

WebKit emulation is useful, but it does not replace real-device testing.

The manual iPhone plan covers:

- Home Screen installation;
- notch/Dynamic Island safe areas;
- Home Indicator spacing;
- larger text;
- VoiceOver;
- reduced motion;
- offline launch;
- app lifecycle/resume;
- Program Builder persistence;
- exercise media;
- update prompts.

See [docs/IPHONE_TESTING.md](docs/IPHONE_TESTING.md).

---

## Project structure

```text
src/
├── app/          routing, navigation, PWA-facing shell
├── components/   reusable presentation components
├── data/         provider adapters and catalog initialization
├── domain/       entities, validation, calculations
├── features/     product-area modules
├── lib/storage/  IndexedDB, migrations, repositories
└── styles/       global mobile-first styles

tests/            unit and component tests
e2e/              production-preview browser tests
scripts/repdb/    RepDB validation/synchronization
docs/             architecture, testing, data, release docs
```

---

## Engineering rules

Changes should preserve Liftwise's core guarantees.

### Privacy first

Do not add tracking, analytics, remote accounts, or background user-data upload without an explicit product decision and matching documentation.

### Persist important actions

Critical user actions should cross a persistence boundary as early as practical.

Future workout sets should not live only in React state until the end of a session.

### Protect migrations

Database changes should include:

- a new explicit schema version;
- migration logic where required;
- stable ID preservation;
- validation of migrated data;
- tests covering upgrades from existing versions.

### Keep providers isolated

RepDB is a data provider, not Liftwise's internal domain model.

Provider-specific fields should remain inside the provider integration boundary.

### Preserve accessibility

New UI should maintain:

- semantic structure;
- readable labels;
- visible focus behavior;
- reduced-motion compatibility;
- sufficient contrast;
- comfortable touch targets;
- safe-area-aware layout;
- support for larger iPhone text sizes.

### Preserve safe PWA updates

Do not silently force a reload when a new build becomes available.

The prompt-based update model is intentional.

### Before submitting changes

```sh
pnpm check
pnpm test:e2e
```

For installation, offline, lifecycle, safe-area, or persistence changes, also run the relevant physical-iPhone checks.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [RepDB integration](docs/REPDB_INTEGRATION.md)
- [Third-party data](docs/THIRD_PARTY_DATA.md)
- [Testing](docs/TESTING.md)
- [iPhone testing](docs/IPHONE_TESTING.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)

Implementation details that are too deep for the README belong in these focused documents.

---

## Roadmap

### v0.5.0 — Workout logging

- resilient active-workout flow;
- immediate IndexedDB writes;
- recovery after interruption/refresh;
- rest timer designed for installed iPhone use.

### v0.6.0 — History and progress

- workout history;
- personal records;
- local-only progress summaries;
- tested chart calculations.

### Later

- data export;
- backup and restore;
- migration tooling;
- carefully selected device-level features;
- accessibility/performance refinements;
- internationalization improvements.

Accounts, backend infrastructure, cloud sync, and remote APIs remain outside the current product direction unless a future release explicitly changes that decision.

See [ROADMAP.md](ROADMAP.md).

---

## License and third-party data

Liftwise source code is licensed under the [MIT License](LICENSE).

RepDB exercise data and artwork are third-party materials and are **not** covered by the Liftwise MIT license.

See:

- [RepDB integration](docs/REPDB_INTEGRATION.md)
- [Third-party data](docs/THIRD_PARTY_DATA.md)
- [Exercise data by RepDB](https://repdb.co)

---

<p align="center">
  <strong>Liftwise</strong><br>
  Private workout planning. Local data. Built for iPhone.
</p>

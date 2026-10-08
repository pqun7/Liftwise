# Liftwise

> **Private. Offline-first. Built for iPhone.**

Liftwise is a personal gym manager and workout-planning app designed primarily for **iPhone**.

It helps you organize exercises and training programs while keeping your personal fitness data **on your own device**.

- No account required
- No cloud sync
- No analytics or tracking
- Works offline after the required files are loaded
- Installable on the iPhone Home Screen

> **Version:** v1.2.1 — Unified streak tracking, shared header and iPhone layout polish. Physical-iPhone acceptance and gym-soak testing remain unverified.

See [v1.2.1 release notes](docs/RELEASE_NOTES_v1.2.1.md) for verification scope and device limitations.

---

## What you can do

### Home

- See a suggested day from your active program, continue an unfinished workout, or browse from the rest-day view.
- Select dates to inspect this week's real completed sessions; view weekly progress, recent workouts and your programs.
- Use the compact, photo-backed mobile layout offline. More in the bottom navigation opens Settings.

Scheduled programs follow their assigned weekdays. Programs without weekdays retain next-in-program rotation. Completed sessions keep their assigned calendar date, including workouts that cross midnight.

### Exercise Library

- Browse and search exercises
- Filter exercises by body part and equipment
- View exercise instructions and available illustrations
- Create your own custom exercises
- Use supported exercise data offline

### Program Builder

- Follow Basic Info → Training Days → Exercises → Review/Save.
- Choose goal, level, intended weekdays and a split template; manual selections and existing prescriptions are preserved.
- Resume locally saved drafts from Plan. Drafts cannot be activated or started as workouts until saved.
- Create multiple workout programs
- Choose an active program
- Add and organize workout days
- Add built-in or custom exercises
- Set:
  - target sets
  - rep ranges
  - RIR
  - rest time
  - notes
- Reorder exercises and workout days
- Duplicate programs and days
- Edit or delete saved items

Your programs are saved locally on your device. Each completed builder step persists promptly; field edits show a warning before being abandoned. Empty days may be saved and filled later. Default day rest is used for new prescriptions, not retroactively applied to existing ones.

### Data Safety

- Create a portable, versioned backup of user-owned data
- Validate a backup and review its contents before replacing current data
- Detect accidental backup corruption with a SHA-256 checksum
- Export custom exercises as CSV
- Inspect database health and available browser storage information
- Delete user data separately from downloaded exercise images

---

## Install Liftwise on iPhone

Liftwise is designed to be installed from **Safari** and opened from your iPhone Home Screen like a normal app.

### 1. Open Liftwise in Safari

Open the deployed **HTTPS** version of Liftwise using **Safari on your iPhone**.

**Liftwise:**
https://liftwise-psi.vercel.app/

> Safari is the recommended installation method for the iPhone PWA version.

### 2. Add Liftwise to the Home Screen

In Safari:

1. Tap the **Share** button.
2. Scroll down and tap **Add to Home Screen**.
3. Make sure the name is **Liftwise**.
4. Tap **Add**.

The Liftwise icon will now appear on your Home Screen.

### 3. Open the installed app

Tap the **Liftwise** icon from your Home Screen.

It will open in its own app-style window instead of a normal Safari tab.

### 4. Complete the first launch while online

Keep your iPhone connected to the internet during the first launch so Liftwise can prepare the files required for offline use.

After that, supported features can continue working without an internet connection.

---

## How to use Liftwise

A simple workflow:

1. Open **Exercise Library** and find the exercises you want.
2. Create custom exercises if something is missing.
3. Open **Plan** and create a training program.
4. Add your workout days.
5. Add exercises to each day.
6. Set your sets, reps, RIR, rest time, and notes.
7. Reorder everything to match your preferred routine.

Your saved program remains stored locally when you close and reopen the app.

---

## Privacy

Liftwise is designed to keep your personal fitness data on your device.

Currently, Liftwise has:

| Feature                      | Current behavior      |
| ---------------------------- | --------------------- |
| Account                      | Not required          |
| Backend database             | None                  |
| Cloud sync                   | None                  |
| Analytics / tracking         | None                  |
| Personal workout-data upload | None                  |
| Main local storage           | IndexedDB             |
| Exercise media               | Browser Cache Storage |

Liftwise does not currently send your programs, custom exercises, workout records, body metrics, or app settings to a Liftwise server.

### Important

Anyone who can unlock your iPhone may be able to open Liftwise.

For better device security, use:

- a strong iPhone passcode;
- Face ID when available;
- current iOS security updates.

---

## Data safety

> [!WARNING]
> Browser storage is device-managed. Even when persistence is granted, iOS does not guarantee permanent storage. Keep backup files somewhere outside Liftwise/Safari data.

Open **Settings → Data Safety → Create Backup** to download `liftwise-backup-YYYY-MM-DD.json`. The file contains user-created exercises, programs, portable settings, body metrics, and any existing workout records. It does not copy the RepDB catalog or exercise images.

Restore validates the file, checksum, compatibility, IDs, ordering, and relationships before showing a preview. Existing user data changes only after explicit confirmation, inside one transaction; a failed import rolls back.

The checksum detects accidental corruption. It is not encryption, authentication, or a digital signature. Anyone who can read the file can read its contents, so store it securely.

You can still lose local data if you:

- clear Liftwise/Safari website data;
- reset or erase the iPhone;
- remove browser-managed storage;
- switch to a different Liftwise deployment address;
- experience unexpected browser-storage loss.

There is no account or automatic cloud backup. Recovery requires a backup file you created and kept.

---

## Offline use

Liftwise follows a **local-first / offline-first** design.

Important user data is stored in **IndexedDB**, while exercise images use browser **Cache Storage**.

After the required app files are cached, supported features are designed to work without depending on:

- RepDB
- GitHub
- remote fonts
- analytics services
- third-party runtime APIs

---

## Current status

| Feature                         | Status                |
| ------------------------------- | --------------------- |
| iPhone Home Screen app          | ✅ Available          |
| Offline app shell               | ✅ Available          |
| Exercise Library                | ✅ Available          |
| Custom exercises                | ✅ Available          |
| Program Builder                 | ✅ Available          |
| Local data persistence          | ✅ Available          |
| Offline exercise metadata       | ✅ Available          |
| Optional offline exercise media | ✅ Available          |
| Data backup / validated restore | ✅ Available          |
| Storage health and estimates    | ✅ Available          |
| Custom exercise CSV export      | ✅ Available          |
| Live Workout Logger             | ✅ Available          |
| Set logging                     | ✅ Available          |
| Workout history                 | ✅ Available          |
| Personal records                | ✅ Available          |
| Progress charts                 | ✅ Available          |
| Accounts / cloud sync           | Not currently planned |

See [`ROADMAP.md`](ROADMAP.md) for the development roadmap.

---

## For developers

### Requirements

- Node.js **22+**
- pnpm **10**

The project currently pins `pnpm@10.15.1`.

### Install dependencies

```bash
pnpm install
```

### Start development

```bash
pnpm dev
```

Open the local URL shown by Vite.

> Service workers are disabled in development mode. Use a production build when testing installation or offline behavior.

### Test a production build

```bash
pnpm build
pnpm preview
```

### Build with optional RepDB media

```bash
pnpm build:deployment
```

### Run project checks

```bash
pnpm check
```

### End-to-end tests

```bash
pnpm test:e2e
```

---

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- IndexedDB + Dexie
- Zod
- React Hook Form
- vite-plugin-pwa + Workbox
- Vitest
- React Testing Library
- Playwright
- ESLint
- Prettier
- pnpm

---

## Documentation

More technical information is available in:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DATABASE.md`](docs/DATABASE.md)
- [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md)
- [`docs/REPDB_INTEGRATION.md`](docs/REPDB_INTEGRATION.md)
- [`docs/THIRD_PARTY_DATA.md`](docs/THIRD_PARTY_DATA.md)
- [`docs/TESTING.md`](docs/TESTING.md)
- [`docs/IPHONE_TESTING.md`](docs/IPHONE_TESTING.md)
- [`ROADMAP.md`](ROADMAP.md)
- [`CHANGELOG.md`](CHANGELOG.md)

---

## License

Liftwise source code is licensed under the [`MIT License`](LICENSE).

RepDB exercise data and artwork are third-party materials and are **not** covered by the Liftwise MIT license.

See:

- [`docs/REPDB_INTEGRATION.md`](docs/REPDB_INTEGRATION.md)
- [`docs/THIRD_PARTY_DATA.md`](docs/THIRD_PARTY_DATA.md)
- [RepDB](https://repdb.co)

---

<p align="center">
  <strong>Liftwise</strong><br>
  Private workout planning. Local data. Built for iPhone.
</p>

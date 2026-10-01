# RepDB integration

## Source and provenance

- Provider: RepDB
- Repository: `https://github.com/RepDB/exercise-dataset`
- Canonical source: `exercises.json`
- Pinned commit: `9ed9357f09c7566ea0256c57ebd6374ebb8b575e`
- Commit date: 2026-09-16
- Upstream schema: 3
- Imported exercises: 601

No runtime request is made to GitHub, RepDB, or exercise-dataset.com. Updates are deliberate source changes, never silent application-startup refreshes.

## Architecture

```text
Pinned RepDB checkout → validation → adapter → local catalog artifact
                                                ↓
Exercise UI ← feature service ← repository ← IndexedDB schema v3
                                                ↓
                         optional images → Cache Storage
```

Raw fields never cross the provider boundary. The adapter maps localized text (English, German, Spanish), classifications, muscles, goals, MET, booleans, and either `start + peak` or `main` images into Liftwise's Exercise model. v0.3 displays English; preserved localizations avoid blocking later UI localization.

Identity is `repdb:<raw-id>`. Image paths are media references only and never identity. Custom exercises use UUIDs and `sourceProvider: "custom"`.

## Validation and import behavior

The source validator checks the top-level object, reported count, schema version, record IDs/names, unique IDs, muscle-array shapes, image shape, and safe relative WebP paths. A fatal top-level error stops the import. Invalid records are reported as errors and skipped; optional-field omissions may produce warnings. The sync report separates imported, skipped, warnings, and errors.

Initialization runs in one Dexie transaction. Repeating the same commit/count is a no-op. Updates preserve `createdAt`, upsert stable IDs, leave custom exercises untouched, and mark removed built-ins inactive. Built-ins are read-only; “Duplicate as custom” creates an editable record.

## Developer update workflow

1. Review upstream `README.md`, `LICENSE-DATA.md`, and `ATTRIBUTION.md`.
2. Intentionally update the commit and commit date in `src/data/providers/repdb/config.ts` and the matching cache name in `vite.config.ts`.
3. Run `pnpm repdb:sync:media`. The script clones/fetches the pinned commit, verifies `HEAD`, validates, transforms, measures, and copies only referenced free flat images.
4. Run `pnpm repdb:verify`, inspect the generated diff and import summary, then run the full quality gate.
5. Update this document, `docs/THIRD_PARTY_DATA.md`, and release notes with the reviewed source and measurements.

`pnpm repdb:sync` omits media. `public/repdb-media/` and the upstream work checkout are ignored so the source repository is not a raw media mirror. `pnpm build:deployment` performs the pinned media sync before the production build. Vercel and browser CI use that command so a clean checkout cannot silently publish catalog image URLs without their corresponding files.

## Offline and storage strategy

The 2,450,194-byte transformed catalog is precached with the app shell and then seeded into IndexedDB. The 1,056 referenced flat WebP files total 17,460,738 bytes. They are not blindly precached. Settings → Offline Data lets a user download them into versioned Cache Storage with progress, partial-failure reporting, retry, and isolated clearing. Metadata and user data remain intact if image caching fails.

Image requests are Cache First. Cards reserve image aspect ratio and use an accessible placeholder if a file is absent. Start/Peak uses a simple two-state control; single-image records use Main.

## Search and rendering

Search text is normalized once at import/custom-write time. The in-memory filter handles the current catalog without a heavyweight search library. It is partial and case-insensitive across English name and useful facets. The library initially renders 40 rows and adds further batches on request.

Measured performance is recorded in the v0.3 development log. Re-run `pnpm repdb:benchmark` on the current machine rather than copying numbers to a different environment.

## Troubleshooting

- Commit mismatch: update the pin intentionally or repair the checkout; do not import moving `main`.
- Validation errors: inspect the record paths in the summary. Do not weaken required identity/name/image safeguards merely to complete an import.
- Missing images: run the media sync and verify that referenced paths exist under `public/repdb-media/flat`.
- Deployed image requests returning HTML or 404: verify the host used `pnpm build:deployment`, then confirm a known `/repdb-media/flat/*.webp` URL responds with an image content type.
- Storage failure: retry the media pack or clear only offline exercise images. Do not clear IndexedDB.
- Existing missing provider record: it remains inactive so plans and workout history can still resolve its stable ID.

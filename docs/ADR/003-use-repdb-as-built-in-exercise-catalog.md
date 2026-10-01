# ADR-003: Use RepDB as Liftwise's built-in exercise catalog

- Status: Accepted
- Date: 2026-10-01

## Context

Liftwise needs a useful offline catalog without coupling programs and workouts to a vendor schema or runtime service. Building and maintaining hundreds of reviewed exercise descriptions and illustrations internally is outside v0.3's scope.

## Decision

Use the RepDB free exercise dataset as the built-in provider through a pinned, build-time adapter. Liftwise stores provider-neutral exercises in IndexedDB using deterministic IDs (`repdb:<RepDB ID>`). The raw schema remains isolated in `src/data/providers/repdb`. Catalog metadata records provenance. Provider records are read-only and may be duplicated as custom records.

Metadata ships locally. Media uses an optional versioned Cache Storage pack rather than expanding the mandatory PWA precache. Upstream removals mark records inactive instead of deleting stable historical references. Updates require an intentional commit-pin change and reviewed generated diff.

## Why RepDB

RepDB supplies structured classifications, multilingual text, and consistent free-tier WebP illustrations under terms permitting personal and commercial in-app use with visible attribution. Its two supported media shapes map cleanly to a mobile detail experience.

## Alternatives considered

- Hand-authoring a catalog: highest control, but too slow and costly to reach useful coverage.
- A live provider API: conflicts with normal offline use, privacy expectations, and deterministic builds.
- Importing raw JSON directly in React: would couple product code to provider schema and weaken validation/migrations.
- `localStorage`: unsuitable for structured, versioned records and transactional relationships.
- Precaching all media: simple but forces every installation to store about 17.5 MB before the user asks for it.

## License implications

Visible RepDB attribution is mandatory. RepDB data/artwork remain under their own license and outside Liftwise's MIT source license. Liftwise will not expose a dataset API, sell/repackage raw data, use premium samples, or use artwork for generative-AI derivation.

## Consequences and trade-offs

The adapter and update tooling add maintenance work, and offline images require a user action. In exchange, runtime behavior is independent of provider availability, IDs remain safe across upgrades, custom records stay first-class, image storage failures cannot corrupt user data, and a future provider can be added without rewriting programs or workouts.

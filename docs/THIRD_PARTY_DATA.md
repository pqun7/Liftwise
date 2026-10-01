# Third-party data

## RepDB free exercise dataset

Liftwise uses the [RepDB exercise dataset](https://github.com/RepDB/exercise-dataset) as its built-in exercise provider. The source snapshot reviewed for v0.3.0 is commit `9ed9357f09c7566ea0256c57ebd6374ebb8b575e`, committed 2026-09-16. The reviewed upstream files were `README.md`, `LICENSE-DATA.md`, `ATTRIBUTION.md`, and canonical `exercises.json`; schema version 3 reports 601 exercises.

The data and artwork are licensed separately under RepDB's [`LICENSE-DATA.md`](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md). Required attribution appears in Liftwise Settings → About / Credits and in the README as “Exercise data by RepDB (repdb.co)”.

Relevant restrictions include:

- Liftwise must not become a dataset redistribution repository or expose a dataset API.
- The raw dataset must not be repackaged or sold.
- RepDB images must not be used for generative-AI training, conditioning, image-to-image generation, style transfer, fine-tuning, or similar derivation.
- `premium-samples/` is excluded from production ingestion.
- Attribution must remain visible.

Liftwise's MIT source-code license does not cover RepDB data or artwork. The committed transformed artifact exists only as in-app catalog content; raw upstream files and free media are obtained through the pinned developer sync workflow and are not presented as a standalone dataset product.

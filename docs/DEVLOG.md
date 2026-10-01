# Development log

## 2026-10-01 — v0.1.0 foundation

The repository began with only a one-line README and MIT license. This release establishes the production foundation without adding workout-domain behavior.

### Implemented

- Strict React and TypeScript application built with Vite and Tailwind CSS.
- Mobile-first application shell, safe-area treatment, accessible navigation, and five product-area placeholders.
- Local-only versioned Dexie database boundary with Zod validation.
- Prompted Workbox update flow and offline application-shell caching.
- Automated component, routing, persistence, production-PWA, formatting, lint, type, and build checks.
- CI, issue forms, architectural decisions, and testing/release documentation.

### Decisions

React Hook Form and Recharts are intentionally deferred until forms and charts exist. The local SVG icon is the editable source for deterministic PNG manifest and iPhone touch icons; none require a runtime asset service.

### Next

Design safe export/recovery and the exercise/routine schema before accepting irreplaceable workout records.

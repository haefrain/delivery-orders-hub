# ADR 0001 — Monorepo with pnpm workspaces

**Status:** accepted

**Context.** The hub is three deliverables (API/worker, dashboard, shared domain contracts) that must never drift apart: the dashboard renders actions straight from the same transition table the API enforces.

**Decision.** One repository, pnpm workspaces (`apps/*`, `packages/*`). `packages/shared` exposes its TypeScript source as types (`"types": "./src/index.ts"`), so typechecking never depends on build order; runtime consumers use the compiled `dist`.

**Consequences.** One PR can change a contract and both consumers atomically. Jest and Vite map the package to its source, so tests run with zero pre-build steps.

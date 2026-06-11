# ADR 0006 — GitHub Actions service containers over Testcontainers

**Status:** accepted

**Context.** Integration tests need real Postgres and Redis. Testcontainers manages containers from test code; GitHub Actions can also provision them declaratively as job services.

**Decision.** Service containers in CI (declared in `ci.yml`), `docker compose up -d postgres redis` locally. Tests connect through `DATABASE_URL`/`REDIS_URL` and stay free of container-management code.

**Alternatives considered.** Testcontainers gives per-suite isolation and identical behavior everywhere, at the cost of slower suite startup and a Docker-API dependency inside Jest. For a single-database project the simpler option wins.

**Consequences.** Integration jobs start fast (services boot in parallel with checkout). Flakiness is controlled by test discipline instead: direct processor invocation, `waitUntilFinished` instead of sleeps, `TRUNCATE` per test, `--runInBand`.

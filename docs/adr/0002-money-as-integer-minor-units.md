# ADR 0002 — Money as integer minor units (cents)

**Status:** accepted

**Context.** Each platform reports money differently: Rappi sends whole COP pesos, Uber Eats sends cents, DiDi sends cents inside an embedded JSON string. Floats and `Decimal` columns both cause trouble: floats lose precision, Prisma's `Decimal` serializes awkwardly across the wire.

**Decision.** The canonical model and the database store `totalCents`/`unitPriceCents` as plain integers plus an ISO 4217 `currency` code. Adapters own the conversion at the boundary (e.g. Rappi pesos × 100).

**Consequences.** Arithmetic is exact, sums are verifiable (the contract test asserts `totalCents === Σ items`), and the wire format is trivially JSON-safe. Formatting is a presentation concern (`Intl.NumberFormat` in the dashboard).

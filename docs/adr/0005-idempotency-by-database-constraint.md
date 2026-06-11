# ADR 0005 — Idempotency enforced by database constraints

**Status:** accepted

**Context.** Delivery platforms retry webhooks aggressively, and the same business order can arrive through two distinct events. Read-then-write duplicate checks have a race window under concurrent workers.

**Decision.** Two unique constraints, two levels of protection:

1. **Delivery level** — `WebhookDelivery(provider, externalEventId)` where `externalEventId = sha256(rawBody)`: a platform retrying the exact same bytes hits `P2002` and is acked with the original delivery id, enqueueing nothing.
2. **Business level** — `Order(provider, externalId)`: the same order arriving via a different event hits `P2002` in the worker, which acks the delivery instead of failing it.

**Consequences.** Correctness does not depend on application-level locking and holds across any number of workers. `P2002` handling is explicit, tested code, not an accident.

# ADR 0004 — Hand-rolled dead-letter queue on BullMQ

**Status:** accepted

**Context.** Unlike SQS or RabbitMQ, BullMQ has no native DLQ. Failed jobs linger in the `failed` state with no operational story: no visibility endpoint, no requeue flow.

**Decision.** A worker-less parking queue (`ingest-dlq`). The worker's `failed` listener moves a job there when retries are exhausted **or** the error is an `UnrecoverableError` (malformed payloads fail fast — retrying a deterministic failure is waste). `GET /dlq` lists parked letters; `POST /dlq/:id/retry` resets the delivery and requeues processing.

**Consequences.** Permanent failures are observable and recoverable in one call. The retry endpoint relies on processing idempotency (ADR 0005), so requeuing twice is harmless.

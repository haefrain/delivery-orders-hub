# ADR 0003 — Redis pub/sub bridge between worker and websocket gateway

**Status:** accepted

**Context.** Orders are persisted by the worker process, but websockets live in the API process. The worker cannot emit through a Socket.IO server it doesn't own.

**Decision.** A `domain-events` Redis channel. The worker (and the API itself, for operator transitions) publishes through the `DomainEventPublisher` port; the gateway subscribes and relays to connected dashboards. Events are published **after** the database commit.

**Alternatives considered.** `@socket.io/redis-adapter` solves a different problem (multiple socket servers sharing rooms). Here only one process owns sockets, so a plain channel is simpler and the moving parts stay visible.

**Consequences.** Workers can scale horizontally without touching realtime code. The dashboard never sees uncommitted state.

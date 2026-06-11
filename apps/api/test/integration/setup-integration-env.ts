// Local default matches docker-compose.yml; CI provides its own DATABASE_URL
// pointing at the postgres service container.
process.env.DATABASE_URL ??= 'postgresql://hub:hub@localhost:5433/delivery_hub';
process.env.REDIS_URL ??= 'redis://localhost:6379';

// Required by env validation when booting the full AppModule; integration
// suites override the queue providers so no real Redis is touched.
process.env.RAPPI_WEBHOOK_SECRET ??= 'integration-rappi-secret';
process.env.UBEREATS_WEBHOOK_SECRET ??= 'integration-ubereats-secret';
process.env.DIDI_WEBHOOK_SECRET ??= 'integration-didi-secret';

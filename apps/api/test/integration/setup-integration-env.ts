// Local default matches docker-compose.yml; CI provides its own DATABASE_URL
// pointing at the postgres service container.
process.env.DATABASE_URL ??= 'postgresql://hub:hub@localhost:5433/delivery_hub';
process.env.REDIS_URL ??= 'redis://localhost:6379';

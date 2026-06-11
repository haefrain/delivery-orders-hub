/**
 * Deterministic environment for HTTP-layer tests. Lives in its own module
 * with zero app imports so the jest setup file can apply it before
 * AppModule (and @nestjs/config) is ever loaded.
 */
export const TEST_ENV = {
  DATABASE_URL: 'postgresql://test:test@localhost:5499/unused',
  REDIS_URL: 'redis://localhost:6399',
  RAPPI_WEBHOOK_SECRET: 'rappi-test-secret',
  UBEREATS_WEBHOOK_SECRET: 'ubereats-test-secret',
  DIDI_WEBHOOK_SECRET: 'didi-test-secret',
};

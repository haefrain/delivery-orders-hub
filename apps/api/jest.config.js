/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-test-env.ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  // Integration tests (real Postgres/Redis) run via jest.integration.config.js
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/integration/'],
  moduleNameMapper: {
    // Map the workspace package to its TS source so tests never depend on a built dist
    '^@delivery-hub/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};

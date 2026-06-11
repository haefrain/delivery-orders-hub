/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/integration/setup-integration-env.ts'],
  roots: ['<rootDir>/test/integration'],
  testRegex: '.*\\.int-spec\\.ts$',
  moduleNameMapper: {
    '^@delivery-hub/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};

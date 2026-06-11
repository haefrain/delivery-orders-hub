import { TEST_ENV } from './test-env';

// jest setupFiles run before any test module is imported: @nestjs/config
// snapshots process.env when AppModule is loaded, so the variables must
// exist before that import happens — not merely before the app compiles.
Object.assign(process.env, TEST_ENV);

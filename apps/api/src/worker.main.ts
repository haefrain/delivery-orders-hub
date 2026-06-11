import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

/**
 * Second entrypoint of the same package: one code unit, two deployment units.
 * docker-compose runs this image twice — `main.js` (HTTP) and this consumer.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  // BullMQ workers keep the event loop alive; nothing to listen on here.
}

void bootstrap();

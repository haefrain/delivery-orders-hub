import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.validation';
import { DlqModule } from './dlq/dlq.module';
import { HealthController } from './health/health.controller';
import { QueueModule } from './queue/queue.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Tests configure the environment through the process, never .env files
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    QueueModule,
    WebhooksModule,
    DlqModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

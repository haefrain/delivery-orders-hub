import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../queue/queue.constants';
import { EventBridgeModule } from '../realtime/event-bridge.module';
import { IngestProcessor } from './ingest.processor';

/**
 * Consumer-only module: imported by WorkerModule, never by AppModule.
 * Keeping producer (IngestionModule) and consumer apart means the API
 * process accepts webhooks but never competes for jobs. The queue must be
 * registered here too — @nestjs/bullmq only spawns a Worker for @Processor
 * classes whose queue is registered in the same module.
 */
@Module({
  imports: [
    PrismaModule,
    ProvidersModule,
    EventBridgeModule,
    BullModule.registerQueue({ name: INGEST_QUEUE }, { name: INGEST_DLQ_QUEUE }),
  ],
  providers: [IngestProcessor],
})
export class ProcessingModule {}

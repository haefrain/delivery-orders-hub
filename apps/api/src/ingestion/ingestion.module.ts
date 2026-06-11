import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { INGEST_JOB_OPTIONS, INGEST_QUEUE } from '../queue/queue.constants';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: INGEST_QUEUE,
      defaultJobOptions: INGEST_JOB_OPTIONS,
    }),
  ],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}

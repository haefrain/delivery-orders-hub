import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../queue/queue.constants';
import { DlqController } from './dlq.controller';
import { DlqService } from './dlq.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: INGEST_QUEUE }, { name: INGEST_DLQ_QUEUE }),
  ],
  controllers: [DlqController],
  providers: [DlqService],
})
export class DlqModule {}

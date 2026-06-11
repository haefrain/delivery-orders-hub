import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';

import { DlqJobData } from '../ingestion/ingest.processor';
import { PrismaService } from '../prisma/prisma.service';
import { INGEST_DLQ_QUEUE, INGEST_JOB, INGEST_QUEUE } from '../queue/queue.constants';

export interface DeadLetterView {
  id: string;
  deliveryId: string;
  error: string;
  queuedAt: string;
}

@Injectable()
export class DlqService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
    @InjectQueue(INGEST_DLQ_QUEUE) private readonly dlqQueue: Queue,
  ) {}

  /** The DLQ has no worker, so every parked job sits in the waiting state. */
  async list(): Promise<{ count: number; jobs: DeadLetterView[] }> {
    const jobs = await this.dlqQueue.getJobs(['waiting', 'delayed', 'paused']);
    const views = jobs.map((job) => {
      const data = job.data as DlqJobData;
      return {
        id: String(job.id),
        deliveryId: data.deliveryId,
        error: data.error,
        queuedAt: new Date(job.timestamp).toISOString(),
      };
    });
    return { count: views.length, jobs: views };
  }

  async retry(jobId: string): Promise<{ requeued: boolean; deliveryId: string }> {
    const job = await this.dlqQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`No dead letter with id ${jobId}`);
    }

    const { deliveryId } = job.data as DlqJobData;

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'RECEIVED', error: null },
    });
    // Fresh auto-generated job id: the original (jobId = deliveryId) may
    // still exist as a failed job, and processing is idempotent anyway.
    await this.ingestQueue.add(INGEST_JOB, { deliveryId });
    await job.remove();

    return { requeued: true, deliveryId };
  }
}

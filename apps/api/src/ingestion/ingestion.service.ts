import { createHash } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Provider } from '@delivery-hub/shared';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { INGEST_JOB, INGEST_QUEUE } from '../queue/queue.constants';

@Injectable()
export class IngestionService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
  ) {}

  /**
   * Ingress is intentionally dumb: persist exactly what arrived, enqueue, ack.
   * All interpretation (parsing, normalization) happens in the worker so a
   * provider outage spike never blocks the webhook endpoint.
   */
  async receive(
    provider: Provider,
    payload: unknown,
    rawBody: Buffer,
  ): Promise<{ deliveryId: string }> {
    // Delivery-level idempotency anchor: a provider retrying the exact same
    // event sends the exact same bytes. Business-level dedup (provider +
    // order id) lives in the Order unique constraint.
    const externalEventId = createHash('sha256').update(rawBody).digest('hex');

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        provider,
        externalEventId,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    await this.ingestQueue.add(INGEST_JOB, { deliveryId: delivery.id }, { jobId: delivery.id });

    return { deliveryId: delivery.id };
  }
}

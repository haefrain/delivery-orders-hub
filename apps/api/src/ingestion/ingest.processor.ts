import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { OrderStatus } from '@delivery-hub/shared';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from '../providers/adapter.registry';
import { INGEST_QUEUE } from '../queue/queue.constants';

export interface IngestJobData {
  deliveryId: string;
}

/**
 * Consumer side of the pipeline: raw delivery -> adapter -> canonical order.
 * Runs in its own process (worker.main.ts); the API never blocks on this.
 */
@Processor(INGEST_QUEUE)
export class IngestProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: AdapterRegistry,
  ) {
    super();
  }

  async process(job: Job<IngestJobData>): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: job.data.deliveryId },
    });

    if (delivery.status === 'PROCESSED') {
      this.logger.warn(`Delivery ${delivery.id} already processed; skipping redelivery`);
      return;
    }

    const adapter = this.adapters.get(delivery.provider);
    const canonical = adapter.toCanonicalOrder(delivery.payload);

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          provider: canonical.provider,
          externalId: canonical.externalId,
          status: OrderStatus.RECEIVED,
          customerName: canonical.customerName,
          items: canonical.items as unknown as Prisma.InputJsonValue,
          totalCents: canonical.totalCents,
          currency: canonical.currency,
          placedAt: new Date(canonical.placedAt),
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.RECEIVED,
          actor: 'webhook',
        },
      });

      await tx.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
    });

    this.logger.log(
      `Processed ${canonical.provider} order ${canonical.externalId} (delivery ${delivery.id})`,
    );
  }
}

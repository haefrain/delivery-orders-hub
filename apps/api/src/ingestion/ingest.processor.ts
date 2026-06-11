import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { OrderStatus, WS_EVENTS } from '@delivery-hub/shared';
import { Prisma } from '@prisma/client';
import { Job, Queue, UnrecoverableError } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from '../providers/adapter.registry';
import { InvalidProviderPayloadError } from '../providers/provider-adapter.interface';
import { DLQ_JOB, INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../queue/queue.constants';
import { DomainEventPublisher } from '../realtime/domain-event-publisher';
import { toWireOrder } from '../realtime/wire-order';

export interface IngestJobData {
  deliveryId: string;
}

export interface DlqJobData {
  deliveryId: string;
  error: string;
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
    private readonly events: DomainEventPublisher,
    @InjectQueue(INGEST_DLQ_QUEUE) private readonly dlqQueue: Queue,
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

    try {
      const canonical = adapter.toCanonicalOrder(delivery.payload);

      const created = await this.prisma.$transaction(async (tx) => {
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

        return order;
      });

      // Published after the commit: dashboards must never see uncommitted state
      await this.events.publish(WS_EVENTS.ORDER_CREATED, { order: toWireOrder(created) });

      this.logger.log(
        `Processed ${canonical.provider} order ${canonical.externalId} (delivery ${delivery.id})`,
      );
    } catch (error) {
      // Malformed payloads are deterministic failures: retrying cannot fix
      // them, so skip the backoff ladder and fail straight to the DLQ.
      if (error instanceof InvalidProviderPayloadError) {
        throw new UnrecoverableError(error.message);
      }

      // P2002 on (provider, externalId): same business order arrived via a
      // distinct event. Ack the delivery instead of failing it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(
          `Duplicate order from delivery ${delivery.id} (${delivery.provider}); acking`,
        );
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
        return;
      }

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<IngestJobData> | undefined, error: Error): Promise<void> {
    if (!job) {
      return;
    }

    const exhausted =
      error instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1);

    if (!exhausted) {
      await this.prisma.webhookDelivery.update({
        where: { id: job.data.deliveryId },
        data: { status: 'FAILED', error: error.message },
      });
      return;
    }

    await this.dlqQueue.add(
      DLQ_JOB,
      { deliveryId: job.data.deliveryId, error: error.message } satisfies DlqJobData,
      { jobId: job.id },
    );
    await this.prisma.webhookDelivery.update({
      where: { id: job.data.deliveryId },
      data: { status: 'DEAD', error: error.message },
    });
    this.logger.error(`Delivery ${job.data.deliveryId} exhausted retries -> DLQ: ${error.message}`);
  }
}

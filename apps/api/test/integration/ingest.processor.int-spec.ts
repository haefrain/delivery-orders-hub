import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { OrderStatus, Provider } from '@delivery-hub/shared';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

import { IngestJobData, IngestProcessor } from '../../src/ingestion/ingest.processor';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProvidersModule } from '../../src/providers/providers.module';
import { INGEST_DLQ_QUEUE } from '../../src/queue/queue.constants';
import didiFixture from '../fixtures/didi-order-created.json';
import rappiFixture from '../fixtures/rappi-order-created.json';

describe('IngestProcessor (integration, real Postgres)', () => {
  let processor: IngestProcessor;
  let prisma: PrismaService;

  beforeAll(async () => {
    // The processor is exercised by direct invocation — no Redis, no queue:
    // BullMQ delivery mechanics are not what these tests verify.
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, ProvidersModule],
      providers: [
        IngestProcessor,
        { provide: getQueueToken(INGEST_DLQ_QUEUE), useValue: { add: jest.fn() } },
      ],
    }).compile();

    processor = moduleRef.get(IngestProcessor);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Order", "OrderEvent", "WebhookDelivery" CASCADE');
  });

  const jobFor = (deliveryId: string): Job<IngestJobData> =>
    ({ data: { deliveryId } }) as Job<IngestJobData>;

  it('processes a Rappi delivery: canonical order, audit event, delivery marked', async () => {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        provider: Provider.RAPPI,
        externalEventId: 'evt-rappi-1',
        payload: rappiFixture as unknown as Prisma.InputJsonValue,
      },
    });

    await processor.process(jobFor(delivery.id));

    const order = await prisma.order.findUniqueOrThrow({
      where: {
        provider_externalId: { provider: Provider.RAPPI, externalId: 'RAP-848271' },
      },
      include: { events: true },
    });

    expect(order.status).toBe(OrderStatus.RECEIVED);
    expect(order.customerName).toBe('Laura Gómez');
    expect(order.totalCents).toBe(5_680_000);
    expect(order.currency).toBe('COP');
    expect(order.events).toHaveLength(1);
    expect(order.events[0]).toMatchObject({
      fromStatus: null,
      toStatus: OrderStatus.RECEIVED,
      actor: 'webhook',
    });

    const processed = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: delivery.id },
    });
    expect(processed.status).toBe('PROCESSED');
    expect(processed.processedAt).not.toBeNull();
  });

  it('normalizes the DiDi embedded-JSON dialect through its adapter', async () => {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        provider: Provider.DIDI,
        externalEventId: 'evt-didi-1',
        payload: didiFixture as unknown as Prisma.InputJsonValue,
      },
    });

    await processor.process(jobFor(delivery.id));

    const order = await prisma.order.findUniqueOrThrow({
      where: {
        provider_externalId: { provider: Provider.DIDI, externalId: 'DD-20260610-5521' },
      },
    });
    expect(order.totalCents).toBe(4_350_000);
    expect(order.customerName).toBe('Ana Ruiz');
  });

  it('is a no-op when the delivery was already processed (queue redelivery)', async () => {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        provider: Provider.RAPPI,
        externalEventId: 'evt-rappi-2',
        payload: rappiFixture as unknown as Prisma.InputJsonValue,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    await processor.process(jobFor(delivery.id));

    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderEvent.count()).toBe(0);
  });
});

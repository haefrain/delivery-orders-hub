import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { Provider } from '@delivery-hub/shared';
import { Prisma } from '@prisma/client';
import { Job, UnrecoverableError } from 'bullmq';

import { IngestJobData, IngestProcessor } from '../../src/ingestion/ingest.processor';
import { IngestionService } from '../../src/ingestion/ingestion.service';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProvidersModule } from '../../src/providers/providers.module';
import { INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../../src/queue/queue.constants';
import { DomainEventPublisher } from '../../src/realtime/domain-event-publisher';
import rappiFixture from '../fixtures/rappi-order-created.json';

describe('Idempotency and DLQ (integration, real Postgres)', () => {
  let service: IngestionService;
  let processor: IngestProcessor;
  let prisma: PrismaService;
  const ingestQueueMock = { add: jest.fn(async () => ({})) };
  const dlqQueueMock = { add: jest.fn(async () => ({})) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, ProvidersModule],
      providers: [
        IngestionService,
        IngestProcessor,
        { provide: getQueueToken(INGEST_QUEUE), useValue: ingestQueueMock },
        { provide: getQueueToken(INGEST_DLQ_QUEUE), useValue: dlqQueueMock },
        { provide: DomainEventPublisher, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(IngestionService);
    processor = moduleRef.get(IngestProcessor);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Order", "OrderEvent", "WebhookDelivery" CASCADE');
    ingestQueueMock.add.mockClear();
    dlqQueueMock.add.mockClear();
  });

  const jobFor = (deliveryId: string): Job<IngestJobData> =>
    ({ data: { deliveryId } }) as Job<IngestJobData>;

  describe('delivery-level idempotency (provider retries the same event)', () => {
    it('stores one delivery, queues one job, returns the same deliveryId', async () => {
      const rawBody = Buffer.from(JSON.stringify(rappiFixture));

      const first = await service.receive(Provider.RAPPI, rappiFixture, rawBody);
      const second = await service.receive(Provider.RAPPI, rappiFixture, rawBody);

      expect(second.deliveryId).toBe(first.deliveryId);
      expect(await prisma.webhookDelivery.count()).toBe(1);
      expect(ingestQueueMock.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('business-level idempotency (same order via two distinct events)', () => {
    it('creates a single Order and acks both deliveries', async () => {
      const payload = rappiFixture as unknown as Prisma.InputJsonValue;
      const first = await prisma.webhookDelivery.create({
        data: { provider: Provider.RAPPI, externalEventId: 'evt-a', payload },
      });
      const second = await prisma.webhookDelivery.create({
        data: { provider: Provider.RAPPI, externalEventId: 'evt-b', payload },
      });

      await processor.process(jobFor(first.id));
      await processor.process(jobFor(second.id));

      expect(await prisma.order.count()).toBe(1);

      const deliveries = await prisma.webhookDelivery.findMany();
      expect(deliveries.map((delivery) => delivery.status)).toEqual(['PROCESSED', 'PROCESSED']);
    });
  });

  describe('dead-letter queue', () => {
    it('rejects malformed payloads with UnrecoverableError (no pointless retries)', async () => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          provider: Provider.RAPPI,
          externalEventId: 'evt-corrupt',
          payload: { totally: 'wrong shape' },
        },
      });

      await expect(processor.process(jobFor(delivery.id))).rejects.toThrow(UnrecoverableError);
    });

    it('moves an exhausted job to the DLQ and marks the delivery DEAD', async () => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          provider: Provider.RAPPI,
          externalEventId: 'evt-dead',
          payload: { totally: 'wrong shape' },
        },
      });

      const failedJob = {
        id: delivery.id,
        data: { deliveryId: delivery.id },
        attemptsMade: 5,
        opts: { attempts: 5 },
      } as Job<IngestJobData>;

      await processor.onFailed(failedJob, new Error('Invalid RAPPI payload: bad shape'));

      expect(dlqQueueMock.add).toHaveBeenCalledTimes(1);
      const [, dlqData] = dlqQueueMock.add.mock.calls[0] as unknown[];
      expect(dlqData).toMatchObject({
        deliveryId: delivery.id,
        error: 'Invalid RAPPI payload: bad shape',
      });

      const updated = await prisma.webhookDelivery.findUniqueOrThrow({
        where: { id: delivery.id },
      });
      expect(updated.status).toBe('DEAD');
      expect(updated.error).toBe('Invalid RAPPI payload: bad shape');
    });

    it('marks the delivery FAILED (not DEAD) while retries remain', async () => {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          provider: Provider.RAPPI,
          externalEventId: 'evt-retrying',
          payload: { totally: 'wrong shape' },
        },
      });

      const failingJob = {
        id: delivery.id,
        data: { deliveryId: delivery.id },
        attemptsMade: 2,
        opts: { attempts: 5 },
      } as Job<IngestJobData>;

      await processor.onFailed(failingJob, new Error('transient db hiccup'));

      expect(dlqQueueMock.add).not.toHaveBeenCalled();
      const updated = await prisma.webhookDelivery.findUniqueOrThrow({
        where: { id: delivery.id },
      });
      expect(updated.status).toBe('FAILED');
      expect(updated.error).toBe('transient db hiccup');
    });
  });
});

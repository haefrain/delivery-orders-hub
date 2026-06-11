import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Provider } from '@delivery-hub/shared';
import { Queue, QueueEvents } from 'bullmq';
import request from 'supertest';

import { ProcessingModule } from '../../src/ingestion/processing.module';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { buildWebhookPayload } from '../../src/simulator/payload-factories';
import { signWebhook } from '../../src/simulator/sign';
import { INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../../src/queue/queue.constants';

const redisConnection = () => {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return { host: url.hostname, port: Number(url.port || 6379) };
};

describe('Full flow (integration: real HTTP, real queue, real worker, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ingestQueue: Queue;
  let dlqQueue: Queue;
  let queueEvents: QueueEvents;

  beforeAll(async () => {
    // AppModule (HTTP producer) + ProcessingModule (BullMQ consumer) in one
    // process: the only difference from production is process placement.
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ProcessingModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();

    prisma = moduleRef.get(PrismaService);
    ingestQueue = moduleRef.get(getQueueToken(INGEST_QUEUE));
    dlqQueue = moduleRef.get(getQueueToken(INGEST_DLQ_QUEUE));

    queueEvents = new QueueEvents(INGEST_QUEUE, { connection: redisConnection() });
    await queueEvents.waitUntilReady();
  });

  afterAll(async () => {
    await queueEvents.close();
    await ingestQueue.obliterate({ force: true });
    await dlqQueue.obliterate({ force: true });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Order", "OrderEvent", "WebhookDelivery" CASCADE');
  });

  it('signed simulator webhook -> queue -> worker -> canonical order in Postgres', async () => {
    const body = JSON.stringify(buildWebhookPayload(Provider.RAPPI));
    const headers = signWebhook(
      Provider.RAPPI,
      body,
      process.env.RAPPI_WEBHOOK_SECRET ?? 'integration-rappi-secret',
    );

    const response = await request(app.getHttpServer())
      .post('/webhooks/rappi')
      .set('content-type', 'application/json')
      .set(headers)
      .send(body)
      .expect(202);

    const { deliveryId } = response.body as { deliveryId: string };
    const job = await ingestQueue.getJob(deliveryId);
    expect(job).toBeDefined();

    // Deterministic wait: no sleeps, no polling
    await job!.waitUntilFinished(queueEvents);

    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(1);
    expect(orders[0].provider).toBe(Provider.RAPPI);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
    });
    expect(delivery.status).toBe('PROCESSED');
  });

  it('signed-but-corrupt webhook fails fast into the DLQ', async () => {
    const body = JSON.stringify({ event: 'order.created', order: { id: 42 } });
    const headers = signWebhook(
      Provider.RAPPI,
      body,
      process.env.RAPPI_WEBHOOK_SECRET ?? 'integration-rappi-secret',
    );

    const response = await request(app.getHttpServer())
      .post('/webhooks/rappi')
      .set('content-type', 'application/json')
      .set(headers)
      .send(body)
      .expect(202);

    const { deliveryId } = response.body as { deliveryId: string };
    const job = await ingestQueue.getJob(deliveryId);

    await expect(job!.waitUntilFinished(queueEvents)).rejects.toThrow(/Invalid RAPPI payload/);

    // The failed event handler is async relative to the job rejection; the
    // DLQ entry is what we ultimately care about, so wait for it briefly.
    let dlqJobs = await dlqQueue.getJobs(['waiting']);
    for (let attempt = 0; attempt < 20 && dlqJobs.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      dlqJobs = await dlqQueue.getJobs(['waiting']);
    }

    expect(dlqJobs).toHaveLength(1);
    expect(dlqJobs[0].data.deliveryId).toBe(deliveryId);

    const delivery = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
    });
    expect(delivery.status).toBe('DEAD');
  });
});

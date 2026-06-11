import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, Provider } from '@delivery-hub/shared';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../../src/queue/queue.constants';

describe('Orders API (integration: real HTTP pipeline, real Postgres)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getQueueToken(INGEST_QUEUE))
      .useValue({ add: jest.fn() })
      .overrideProvider(getQueueToken(INGEST_DLQ_QUEUE))
      .useValue({ add: jest.fn(), getJobs: jest.fn(async () => []), getJob: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Order", "OrderEvent", "WebhookDelivery" CASCADE');
  });

  const seedOrder = (overrides: Partial<{ status: OrderStatus; externalId: string }> = {}) =>
    prisma.order.create({
      data: {
        provider: Provider.RAPPI,
        externalId: overrides.externalId ?? 'RAP-1',
        status: overrides.status ?? OrderStatus.RECEIVED,
        customerName: 'Laura Gómez',
        items: [{ name: 'Hamburguesa doble', quantity: 2, unitPriceCents: 1_890_000 }],
        totalCents: 3_780_000,
        currency: 'COP',
        placedAt: new Date('2026-06-10T23:22:43.000Z'),
      },
    });

  describe('GET /orders', () => {
    it('lists orders, optionally filtered by status', async () => {
      await seedOrder({ externalId: 'RAP-1', status: OrderStatus.RECEIVED });
      await seedOrder({ externalId: 'RAP-2', status: OrderStatus.DELIVERED });

      const all = await request(app.getHttpServer()).get('/orders').expect(200);
      expect(all.body).toHaveLength(2);

      const delivered = await request(app.getHttpServer())
        .get('/orders?status=DELIVERED')
        .expect(200);
      expect(delivered.body).toHaveLength(1);
      expect(delivered.body[0]).toMatchObject({
        externalId: 'RAP-2',
        status: OrderStatus.DELIVERED,
        provider: Provider.RAPPI,
        totalCents: 3_780_000,
      });
    });

    it('rejects an unknown status filter with 400', async () => {
      await request(app.getHttpServer()).get('/orders?status=NOT_A_STATUS').expect(400);
    });
  });

  describe('PATCH /orders/:id/transition', () => {
    it('applies a legal transition and records the audit event', async () => {
      const order = await seedOrder();

      const response = await request(app.getHttpServer())
        .patch(`/orders/${order.id}/transition`)
        .send({ to: OrderStatus.ACCEPTED })
        .expect(200);

      expect(response.body.status).toBe(OrderStatus.ACCEPTED);

      const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        fromStatus: OrderStatus.RECEIVED,
        toStatus: OrderStatus.ACCEPTED,
        actor: 'operator',
      });
    });

    it('rejects an illegal transition with 409 and the domain explanation', async () => {
      const order = await seedOrder();

      const response = await request(app.getHttpServer())
        .patch(`/orders/${order.id}/transition`)
        .send({ to: OrderStatus.DELIVERED })
        .expect(409);

      expect(response.body.message).toContain('RECEIVED -> DELIVERED');
      const unchanged = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(unchanged.status).toBe(OrderStatus.RECEIVED);
    });

    it('rejects an unknown target status with 400', async () => {
      const order = await seedOrder();
      await request(app.getHttpServer())
        .patch(`/orders/${order.id}/transition`)
        .send({ to: 'TELEPORTED' })
        .expect(400);
    });

    it('returns 404 for a nonexistent order', async () => {
      await request(app.getHttpServer())
        .patch('/orders/00000000-0000-0000-0000-000000000000/transition')
        .send({ to: OrderStatus.ACCEPTED })
        .expect(404);
    });
  });

  describe('GET /metrics/summary', () => {
    it('returns order counts by provider and by status', async () => {
      await seedOrder({ externalId: 'RAP-1', status: OrderStatus.RECEIVED });
      await seedOrder({ externalId: 'RAP-2', status: OrderStatus.DELIVERED });

      const response = await request(app.getHttpServer()).get('/metrics/summary').expect(200);

      expect(response.body).toEqual({
        byProvider: { RAPPI: 2 },
        byStatus: { RECEIVED: 1, DELIVERED: 1 },
      });
    });
  });
});

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HubOrder, OrderStatus, Provider, WS_EVENTS } from '@delivery-hub/shared';
import { io, Socket } from 'socket.io-client';

import { validateEnv } from '../../src/config/env.validation';
import { DomainEventPublisher } from '../../src/realtime/domain-event-publisher';
import { RealtimeModule } from '../../src/realtime/realtime.module';

const WIRE_ORDER: HubOrder = {
  id: 'order-rt-1',
  provider: Provider.RAPPI,
  externalId: 'RAP-RT-1',
  status: OrderStatus.RECEIVED,
  customerName: 'Laura Gómez',
  items: [{ name: 'Hamburguesa doble', quantity: 1, unitPriceCents: 1_890_000 }],
  totalCents: 1_890_000,
  currency: 'COP',
  placedAt: '2026-06-10T23:22:43.000Z',
  createdAt: '2026-06-10T23:22:50.000Z',
  updatedAt: '2026-06-10T23:22:50.000Z',
};

describe('Realtime bridge (integration: real Redis pub/sub + Socket.IO)', () => {
  let app: INestApplication;
  let client: Socket;
  let publisher: DomainEventPublisher;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, ignoreEnvFile: true }),
        RealtimeModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    publisher = moduleRef.get(DomainEventPublisher);

    const address = app.getHttpServer().address() as { port: number };
    client = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', reject);
    });
  });

  afterAll(async () => {
    client?.close();
    await app?.close();
  });

  it('relays a published domain event to connected dashboard clients', async () => {
    const received = new Promise<{ order: HubOrder }>((resolve) => {
      client.on(WS_EVENTS.ORDER_CREATED, resolve);
    });

    // Worker process publishes to Redis; the API gateway must relay it even
    // though publisher and websocket server live in different processes.
    await publisher.publish(WS_EVENTS.ORDER_CREATED, { order: WIRE_ORDER });

    const payload = await received;
    expect(payload.order).toEqual(WIRE_ORDER);
  });
});

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Provider } from '@delivery-hub/shared';
import request from 'supertest';

import { buildTestApp, TestApp, TEST_ENV } from './e2e-utils';

// Fixtures are sent as the exact string read from disk: signatures are
// computed over raw bytes, so re-serializing would invalidate them.
const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

const hmacHex = (secret: string, body: string): string =>
  createHmac('sha256', secret).update(body).digest('hex');

describe('POST /webhooks/:provider', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    ctx.prismaMock.webhookDelivery.create.mockClear();
    ctx.queueMock.add.mockClear();
  });

  const post = (path: string) =>
    request(ctx.app.getHttpServer()).post(path).set('content-type', 'application/json');

  it('rejects an unsigned Rappi webhook with 401 and queues nothing', async () => {
    await post('/webhooks/rappi').send(fixture('rappi-order-created.json')).expect(401);

    expect(ctx.prismaMock.webhookDelivery.create).not.toHaveBeenCalled();
    expect(ctx.queueMock.add).not.toHaveBeenCalled();
  });

  it('rejects a Rappi webhook signed with the wrong secret', async () => {
    const body = fixture('rappi-order-created.json');

    await post('/webhooks/rappi')
      .set('x-rappi-signature', hmacHex('wrong-secret', body))
      .send(body)
      .expect(401);
  });

  it('accepts a signed Rappi webhook: 202, persisted delivery, queued job', async () => {
    const body = fixture('rappi-order-created.json');

    const response = await post('/webhooks/rappi')
      .set('x-rappi-signature', hmacHex(TEST_ENV.RAPPI_WEBHOOK_SECRET, body))
      .send(body)
      .expect(202);

    expect(response.body.deliveryId).toBe('delivery-test-id');

    expect(ctx.prismaMock.webhookDelivery.create).toHaveBeenCalledTimes(1);
    const createArgs = ctx.prismaMock.webhookDelivery.create.mock.calls[0][0];
    expect(createArgs.data.provider).toBe(Provider.RAPPI);
    expect(typeof createArgs.data.externalEventId).toBe('string');

    expect(ctx.queueMock.add).toHaveBeenCalledTimes(1);
  });

  it('accepts a signed Uber Eats webhook', async () => {
    const body = fixture('ubereats-order-created.json');

    await post('/webhooks/ubereats')
      .set('x-uber-signature', hmacHex(TEST_ENV.UBEREATS_WEBHOOK_SECRET, body))
      .send(body)
      .expect(202);

    const createArgs = ctx.prismaMock.webhookDelivery.create.mock.calls[0][0];
    expect(createArgs.data.provider).toBe(Provider.UBEREATS);
  });

  it('accepts a signed DiDi webhook (timestamp scheme)', async () => {
    const body = fixture('didi-order-created.json');
    const timestamp = '1781140973000';
    const signature = createHmac('sha256', TEST_ENV.DIDI_WEBHOOK_SECRET)
      .update(`${timestamp}.${body}`)
      .digest('base64');

    await post('/webhooks/didi')
      .set('x-didi-signature', signature)
      .set('x-didi-timestamp', timestamp)
      .send(body)
      .expect(202);

    const createArgs = ctx.prismaMock.webhookDelivery.create.mock.calls[0][0];
    expect(createArgs.data.provider).toBe(Provider.DIDI);
  });

  it('rejects a DiDi webhook missing the timestamp header', async () => {
    const body = fixture('didi-order-created.json');
    const signature = createHmac('sha256', TEST_ENV.DIDI_WEBHOOK_SECRET)
      .update(`1781140973000.${body}`)
      .digest('base64');

    await post('/webhooks/didi').set('x-didi-signature', signature).send(body).expect(401);
  });
});

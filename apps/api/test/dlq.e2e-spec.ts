import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

import { buildTestApp, TestApp } from './e2e-utils';

describe('DLQ visibility endpoints', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    ctx.dlqQueueMock.getJobs.mockClear();
    ctx.dlqQueueMock.getJob.mockClear();
    ctx.queueMock.add.mockClear();
    ctx.prismaMock.webhookDelivery.update.mockClear();
  });

  it('GET /dlq lists parked dead letters with their failure reason', async () => {
    ctx.dlqQueueMock.getJobs.mockResolvedValueOnce([
      {
        id: 'dead-1',
        data: { deliveryId: 'd-1', error: 'Invalid RAPPI payload: bad shape' },
        timestamp: 1_781_141_000_000,
      },
    ]);

    const response = await request(ctx.app.getHttpServer()).get('/dlq').expect(200);

    expect(response.body).toEqual({
      count: 1,
      jobs: [
        {
          id: 'dead-1',
          deliveryId: 'd-1',
          error: 'Invalid RAPPI payload: bad shape',
          queuedAt: new Date(1_781_141_000_000).toISOString(),
        },
      ],
    });
  });

  it('POST /dlq/:id/retry returns 404 for an unknown dead letter', async () => {
    await request(ctx.app.getHttpServer()).post('/dlq/nonexistent/retry').expect(404);
  });

  it('POST /dlq/:id/retry resets the delivery and requeues processing', async () => {
    const remove = jest.fn(async () => undefined);
    ctx.dlqQueueMock.getJob.mockResolvedValueOnce({
      id: 'dead-1',
      data: { deliveryId: 'd-1', error: 'boom' },
      timestamp: 1_781_141_000_000,
      remove,
    });

    const response = await request(ctx.app.getHttpServer()).post('/dlq/dead-1/retry').expect(202);

    expect(response.body).toEqual({ requeued: true, deliveryId: 'd-1' });
    expect(ctx.prismaMock.webhookDelivery.update).toHaveBeenCalledWith({
      where: { id: 'd-1' },
      data: { status: 'RECEIVED', error: null },
    });
    expect(ctx.queueMock.add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

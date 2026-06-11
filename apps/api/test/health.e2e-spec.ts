import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';

import { buildTestApp, TestApp } from './e2e-utils';

describe('GET /health', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await buildTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('responds with status ok', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
  });
});

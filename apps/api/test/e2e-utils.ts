import { jest } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { INGEST_QUEUE } from '../src/queue/queue.constants';
import { DidiSignatureVerifier } from '../src/webhooks/verifiers/didi.verifier';
import { RappiSignatureVerifier } from '../src/webhooks/verifiers/rappi.verifier';
import { SIGNATURE_VERIFIERS } from '../src/webhooks/verifiers/signature-verifier.interface';
import { UberEatsSignatureVerifier } from '../src/webhooks/verifiers/ubereats.verifier';

export const TEST_ENV = {
  DATABASE_URL: 'postgresql://test:test@localhost:5499/unused',
  REDIS_URL: 'redis://localhost:6399',
  RAPPI_WEBHOOK_SECRET: 'rappi-test-secret',
  UBEREATS_WEBHOOK_SECRET: 'ubereats-test-secret',
  DIDI_WEBHOOK_SECRET: 'didi-test-secret',
};

type WebhookDeliveryCreateArgs = { data: Record<string, unknown> };

export const buildPrismaMock = () => ({
  webhookDelivery: {
    create: jest.fn(async (args: WebhookDeliveryCreateArgs) => ({
      id: 'delivery-test-id',
      ...args.data,
    })),
  },
});

export const buildQueueMock = () => ({
  add: jest.fn(async () => ({ id: 'job-test-id' })),
});

export interface TestApp {
  app: INestApplication;
  prismaMock: ReturnType<typeof buildPrismaMock>;
  queueMock: ReturnType<typeof buildQueueMock>;
}

/**
 * Boots the full HTTP app (real guards, verifiers, controllers, services)
 * with the infrastructure edges (DB, queue) replaced by in-memory fakes.
 * Real Postgres/Redis coverage lives in the integration suite.
 */
export async function buildTestApp(): Promise<TestApp> {
  Object.assign(process.env, TEST_ENV);

  const prismaMock = buildPrismaMock();
  const queueMock = buildQueueMock();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .overrideProvider(getQueueToken(INGEST_QUEUE))
    .useValue(queueMock)
    // Real verifier instances with deterministic secrets: tests must not
    // depend on whatever a developer has in their local .env file.
    .overrideProvider(SIGNATURE_VERIFIERS)
    .useValue([
      new RappiSignatureVerifier(TEST_ENV.RAPPI_WEBHOOK_SECRET),
      new UberEatsSignatureVerifier(TEST_ENV.UBEREATS_WEBHOOK_SECRET),
      new DidiSignatureVerifier(TEST_ENV.DIDI_WEBHOOK_SECRET),
    ])
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  await app.init();

  return { app, prismaMock, queueMock };
}

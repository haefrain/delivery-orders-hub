import { jest } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { INGEST_DLQ_QUEUE, INGEST_QUEUE } from '../src/queue/queue.constants';
import { DidiSignatureVerifier } from '../src/webhooks/verifiers/didi.verifier';
import { RappiSignatureVerifier } from '../src/webhooks/verifiers/rappi.verifier';
import { SIGNATURE_VERIFIERS } from '../src/webhooks/verifiers/signature-verifier.interface';
import { UberEatsSignatureVerifier } from '../src/webhooks/verifiers/ubereats.verifier';
import { TEST_ENV } from './test-env';

export { TEST_ENV };

type WebhookDeliveryCreateArgs = { data: Record<string, unknown> };

export const buildPrismaMock = () => ({
  webhookDelivery: {
    create: jest.fn(async (args: WebhookDeliveryCreateArgs) => ({
      id: 'delivery-test-id',
      ...args.data,
    })),
    update: jest.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: args.where.id,
      ...args.data,
    })),
  },
});

export const buildQueueMock = () => ({
  add: jest.fn(async () => ({ id: 'job-test-id' })),
});

export interface FakeDlqJob {
  id: string;
  data: { deliveryId: string; error: string };
  timestamp: number;
  remove?: () => Promise<void>;
}

export const buildDlqQueueMock = () => ({
  add: jest.fn(async () => ({ id: 'dlq-job-test-id' })),
  getJobs: jest.fn(async (): Promise<FakeDlqJob[]> => []),
  getJob: jest.fn(async (): Promise<FakeDlqJob | null> => null),
});

export interface TestApp {
  app: INestApplication;
  prismaMock: ReturnType<typeof buildPrismaMock>;
  queueMock: ReturnType<typeof buildQueueMock>;
  dlqQueueMock: ReturnType<typeof buildDlqQueueMock>;
}

/**
 * Boots the full HTTP app (real guards, verifiers, controllers, services)
 * with the infrastructure edges (DB, queue) replaced by in-memory fakes.
 * Real Postgres/Redis coverage lives in the integration suite.
 */
export async function buildTestApp(): Promise<TestApp> {
  const prismaMock = buildPrismaMock();
  const queueMock = buildQueueMock();
  const dlqQueueMock = buildDlqQueueMock();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .overrideProvider(getQueueToken(INGEST_QUEUE))
    .useValue(queueMock)
    .overrideProvider(getQueueToken(INGEST_DLQ_QUEUE))
    .useValue(dlqQueueMock)
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

  return { app, prismaMock, queueMock, dlqQueueMock };
}

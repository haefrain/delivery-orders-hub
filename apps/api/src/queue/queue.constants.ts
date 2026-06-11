export const INGEST_QUEUE = 'ingest';
export const INGEST_JOB = 'process-delivery';

/**
 * BullMQ has no native DLQ (unlike SQS/RabbitMQ): this is a worker-less
 * parking queue. Exhausted jobs are moved here by the failed-event listener
 * and stay visible until an operator inspects or requeues them (ADR 0004).
 */
export const INGEST_DLQ_QUEUE = 'ingest-dlq';
export const DLQ_JOB = 'dead-delivery';

/** Retries with exponential backoff: 1s, 2s, 4s, 8s, 16s — then the DLQ listener takes over. */
export const INGEST_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: false,
} as const;

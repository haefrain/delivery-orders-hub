export const INGEST_QUEUE = 'ingest';
export const INGEST_JOB = 'process-delivery';

/** Retries with exponential backoff: 1s, 2s, 4s, 8s, 16s — then the DLQ listener takes over. */
export const INGEST_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: false,
} as const;

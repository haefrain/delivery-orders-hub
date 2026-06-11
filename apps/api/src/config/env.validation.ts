export interface EnvVars {
  DATABASE_URL: string;
  REDIS_URL: string;
  PORT?: string;
  RAPPI_WEBHOOK_SECRET: string;
  UBEREATS_WEBHOOK_SECRET: string;
  DIDI_WEBHOOK_SECRET: string;
}

const REQUIRED: ReadonlyArray<keyof EnvVars> = [
  'DATABASE_URL',
  'REDIS_URL',
  'RAPPI_WEBHOOK_SECRET',
  'UBEREATS_WEBHOOK_SECRET',
  'DIDI_WEBHOOK_SECRET',
];

/** Fail fast at boot with every missing variable listed, not one at a time. */
export function validateEnv(config: Record<string, unknown>): EnvVars {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config as unknown as EnvVars;
}

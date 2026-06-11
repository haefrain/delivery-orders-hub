/**
 * Delivery platforms this hub ingests orders from.
 * Const object instead of a TS enum so the union type stays structurally
 * compatible with the Prisma-generated enum (same string literals).
 */
export const Provider = {
  RAPPI: 'RAPPI',
  UBEREATS: 'UBEREATS',
  DIDI: 'DIDI',
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];

export const ALL_PROVIDERS: readonly Provider[] = Object.values(Provider);

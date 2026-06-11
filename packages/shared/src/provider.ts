/** Delivery platforms this hub ingests orders from. */
export enum Provider {
  RAPPI = 'RAPPI',
  UBEREATS = 'UBEREATS',
  DIDI = 'DIDI',
}

export const ALL_PROVIDERS: readonly Provider[] = Object.values(Provider);

import { timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison; length check first because timingSafeEqual throws on mismatch. */
export const timingSafeCompare = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

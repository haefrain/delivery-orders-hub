import { CanonicalOrder, Provider } from '@delivery-hub/shared';

/**
 * Port every delivery platform integration implements. The processor depends
 * on this interface (via AdapterRegistry) and never on a concrete adapter:
 * adding a platform means one new class plus one line in providers.module.ts.
 */
export interface ProviderAdapter {
  readonly provider: Provider;
  /** @throws InvalidProviderPayloadError when the payload doesn't match the provider's schema */
  toCanonicalOrder(payload: unknown): CanonicalOrder;
}

export const PROVIDER_ADAPTERS = Symbol('PROVIDER_ADAPTERS');

export class InvalidProviderPayloadError extends Error {
  constructor(
    readonly provider: Provider,
    reason: string,
  ) {
    super(`Invalid ${provider} payload: ${reason}`);
    this.name = 'InvalidProviderPayloadError';
  }
}

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

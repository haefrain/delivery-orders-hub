import { Provider } from '@delivery-hub/shared';

export type WebhookHeaders = Record<string, string | string[] | undefined>;

/**
 * Strategy port for provider-specific webhook authentication.
 * Kept separate from ProviderAdapter (normalization) on purpose: the ingress
 * layer only needs to authenticate, the worker only needs to normalize (ISP).
 */
export interface SignatureVerifier {
  readonly provider: Provider;
  verify(rawBody: Buffer, headers: WebhookHeaders): boolean;
}

export const SIGNATURE_VERIFIERS = Symbol('SIGNATURE_VERIFIERS');

export const headerValue = (headers: WebhookHeaders, name: string): string | undefined => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

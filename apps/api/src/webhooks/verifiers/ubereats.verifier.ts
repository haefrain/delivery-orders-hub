import { createHmac } from 'node:crypto';

import { Provider } from '@delivery-hub/shared';

import { headerValue, SignatureVerifier, WebhookHeaders } from './signature-verifier.interface';
import { timingSafeCompare } from './timing-safe-compare';

/** Uber Eats signs the raw body with HMAC-SHA256 (client secret) — hex digest in X-Uber-Signature. */
export class UberEatsSignatureVerifier implements SignatureVerifier {
  readonly provider = Provider.UBEREATS;

  constructor(private readonly secret: string) {}

  verify(rawBody: Buffer, headers: WebhookHeaders): boolean {
    const signature = headerValue(headers, 'x-uber-signature');
    if (!signature) {
      return false;
    }
    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex');
    return timingSafeCompare(signature, expected);
  }
}

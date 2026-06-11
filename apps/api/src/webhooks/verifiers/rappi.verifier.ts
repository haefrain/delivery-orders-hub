import { createHmac } from 'node:crypto';

import { Provider } from '@delivery-hub/shared';

import { headerValue, SignatureVerifier, WebhookHeaders } from './signature-verifier.interface';
import { timingSafeCompare } from './timing-safe-compare';

/** Rappi signs the raw body with HMAC-SHA256 and sends the hex digest in X-Rappi-Signature. */
export class RappiSignatureVerifier implements SignatureVerifier {
  readonly provider = Provider.RAPPI;

  constructor(private readonly secret: string) {}

  verify(rawBody: Buffer, headers: WebhookHeaders): boolean {
    const signature = headerValue(headers, 'x-rappi-signature');
    if (!signature) {
      return false;
    }
    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex');
    return timingSafeCompare(signature, expected);
  }
}

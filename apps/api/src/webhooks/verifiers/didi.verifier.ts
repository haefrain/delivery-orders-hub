import { createHmac } from 'node:crypto';

import { Provider } from '@delivery-hub/shared';

import { headerValue, SignatureVerifier, WebhookHeaders } from './signature-verifier.interface';
import { timingSafeCompare } from './timing-safe-compare';

/**
 * DiDi signs `${timestamp}.${body}` with HMAC-SHA256 and sends the base64
 * digest in X-DiDi-Signature plus the timestamp in X-DiDi-Timestamp.
 */
export class DidiSignatureVerifier implements SignatureVerifier {
  readonly provider = Provider.DIDI;

  constructor(private readonly secret: string) {}

  verify(rawBody: Buffer, headers: WebhookHeaders): boolean {
    const signature = headerValue(headers, 'x-didi-signature');
    const timestamp = headerValue(headers, 'x-didi-timestamp');
    if (!signature || !timestamp) {
      return false;
    }
    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('base64');
    return timingSafeCompare(signature, expected);
  }
}

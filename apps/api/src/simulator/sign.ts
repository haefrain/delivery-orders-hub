import { createHmac } from 'node:crypto';

import { Provider } from '@delivery-hub/shared';

/**
 * Mirror of each provider's signing scheme — the simulator must sign exactly
 * the way the verifiers expect, headers included.
 */
export const signWebhook = (
  provider: Provider,
  body: string,
  secret: string,
): Record<string, string> => {
  switch (provider) {
    case Provider.RAPPI:
      return {
        'x-rappi-signature': createHmac('sha256', secret).update(body).digest('hex'),
      };
    case Provider.UBEREATS:
      return {
        'x-uber-signature': createHmac('sha256', secret).update(body).digest('hex'),
      };
    case Provider.DIDI: {
      const timestamp = String(Date.now());
      return {
        'x-didi-signature': createHmac('sha256', secret)
          .update(`${timestamp}.${body}`)
          .digest('base64'),
        'x-didi-timestamp': timestamp,
      };
    }
  }
};

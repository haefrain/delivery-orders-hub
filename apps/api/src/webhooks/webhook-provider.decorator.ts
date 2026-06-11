import { SetMetadata } from '@nestjs/common';
import { Provider } from '@delivery-hub/shared';

export const WEBHOOK_PROVIDER_KEY = 'webhookProvider';

/** Tags a webhook handler with its provider so the SignatureGuard picks the right verifier. */
export const WebhookProvider = (provider: Provider) => SetMetadata(WEBHOOK_PROVIDER_KEY, provider);

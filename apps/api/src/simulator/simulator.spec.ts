import { describe, expect, it } from '@jest/globals';
import { Provider } from '@delivery-hub/shared';

import { DidiAdapter } from '../providers/didi/didi.adapter';
import { ProviderAdapter } from '../providers/provider-adapter.interface';
import { RappiAdapter } from '../providers/rappi/rappi.adapter';
import { UberEatsAdapter } from '../providers/ubereats/ubereats.adapter';
import { DidiSignatureVerifier } from '../webhooks/verifiers/didi.verifier';
import { RappiSignatureVerifier } from '../webhooks/verifiers/rappi.verifier';
import { SignatureVerifier } from '../webhooks/verifiers/signature-verifier.interface';
import { UberEatsSignatureVerifier } from '../webhooks/verifiers/ubereats.verifier';
import { buildWebhookPayload } from './payload-factories';
import { signWebhook } from './sign';

const SECRET = 'simulator-test-secret';

/**
 * Self-consistency: everything the simulator emits must pass the same
 * verifier and adapter the real pipeline uses. If a factory drifts from a
 * provider dialect, this suite breaks before any demo does.
 */
const CASES: Array<{
  provider: Provider;
  verifier: SignatureVerifier;
  adapter: ProviderAdapter;
}> = [
  {
    provider: Provider.RAPPI,
    verifier: new RappiSignatureVerifier(SECRET),
    adapter: new RappiAdapter(),
  },
  {
    provider: Provider.UBEREATS,
    verifier: new UberEatsSignatureVerifier(SECRET),
    adapter: new UberEatsAdapter(),
  },
  {
    provider: Provider.DIDI,
    verifier: new DidiSignatureVerifier(SECRET),
    adapter: new DidiAdapter(),
  },
];

describe.each(CASES)('simulator output for $provider', ({ provider, verifier, adapter }) => {
  it('produces signed payloads the real pipeline accepts (50 random samples)', () => {
    for (let i = 0; i < 50; i += 1) {
      const payload = buildWebhookPayload(provider);
      const body = JSON.stringify(payload);
      const headers = signWebhook(provider, body, SECRET);

      expect(verifier.verify(Buffer.from(body), headers)).toBe(true);

      const canonical = adapter.toCanonicalOrder(JSON.parse(body));
      expect(canonical.provider).toBe(provider);
      expect(canonical.externalId.length).toBeGreaterThan(0);
      expect(canonical.items.length).toBeGreaterThan(0);

      const itemsTotal = canonical.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0,
      );
      expect(canonical.totalCents).toBe(itemsTotal);
    }
  });

  it('generates unique external ids across calls', () => {
    const first = buildWebhookPayload(provider);
    const second = buildWebhookPayload(provider);
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });
});

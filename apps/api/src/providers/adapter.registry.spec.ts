import { describe, expect, it } from '@jest/globals';
import { Provider } from '@delivery-hub/shared';

import { AdapterRegistry, UnsupportedProviderError } from './adapter.registry';
import { DidiAdapter } from './didi/didi.adapter';
import { RappiAdapter } from './rappi/rappi.adapter';
import { UberEatsAdapter } from './ubereats/ubereats.adapter';

describe('AdapterRegistry', () => {
  const registry = new AdapterRegistry([
    new RappiAdapter(),
    new UberEatsAdapter(),
    new DidiAdapter(),
  ]);

  it.each([[Provider.RAPPI], [Provider.UBEREATS], [Provider.DIDI]])(
    'resolves the adapter for %s',
    (provider) => {
      expect(registry.get(provider).provider).toBe(provider);
    },
  );

  it('throws UnsupportedProviderError for an unregistered provider', () => {
    const empty = new AdapterRegistry([]);
    expect(() => empty.get(Provider.RAPPI)).toThrow(UnsupportedProviderError);
  });
});

import { describe, expect, it } from '@jest/globals';
import { Provider } from '@delivery-hub/shared';

import didiFixture from '../../test/fixtures/didi-order-created.json';
import rappiFixture from '../../test/fixtures/rappi-order-created.json';
import ubereatsFixture from '../../test/fixtures/ubereats-order-created.json';
import { DidiAdapter } from './didi/didi.adapter';
import { RappiAdapter } from './rappi/rappi.adapter';
import { UberEatsAdapter } from './ubereats/ubereats.adapter';

describe('RappiAdapter', () => {
  const adapter = new RappiAdapter();

  it('normalizes a Rappi payload (flat COP pesos -> cents)', () => {
    const order = adapter.toCanonicalOrder(rappiFixture);

    expect(order).toEqual({
      provider: Provider.RAPPI,
      externalId: 'RAP-848271',
      customerName: 'Laura Gómez',
      items: [
        { name: 'Hamburguesa doble', quantity: 2, unitPriceCents: 1_890_000 },
        { name: 'Limonada de coco', quantity: 1, unitPriceCents: 900_000 },
        { name: 'Papas medianas', quantity: 1, unitPriceCents: 1_000_000 },
      ],
      totalCents: 5_680_000,
      currency: 'COP',
      placedAt: new Date('2026-06-10T18:22:43-05:00').toISOString(),
    });
  });
});

describe('UberEatsAdapter', () => {
  const adapter = new UberEatsAdapter();

  it('normalizes an Uber Eats payload (nested cart, amounts already in cents)', () => {
    const order = adapter.toCanonicalOrder(ubereatsFixture);

    expect(order).toEqual({
      provider: Provider.UBEREATS,
      externalId: 'UE-77F3K2',
      customerName: 'Carlos M.',
      items: [
        { name: 'Tacos al pastor', quantity: 3, unitPriceCents: 6_500 },
        { name: 'Agua de horchata', quantity: 1, unitPriceCents: 3_000 },
      ],
      totalCents: 22_500,
      currency: 'MXN',
      placedAt: new Date('2026-06-10T23:22:51Z').toISOString(),
    });
  });
});

describe('DidiAdapter', () => {
  const adapter = new DidiAdapter();

  it('normalizes a DiDi payload (orderDetail arrives as an embedded JSON string)', () => {
    const order = adapter.toCanonicalOrder(didiFixture);

    expect(order).toEqual({
      provider: Provider.DIDI,
      externalId: 'DD-20260610-5521',
      customerName: 'Ana Ruiz',
      items: [
        { name: 'Bowl de pollo', quantity: 1, unitPriceCents: 2_890_000 },
        { name: 'Té helado', quantity: 2, unitPriceCents: 730_000 },
      ],
      totalCents: 4_350_000,
      currency: 'COP',
      placedAt: new Date(1_781_140_973_000).toISOString(),
    });
  });
});

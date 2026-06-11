import { describe, expect, it } from '@jest/globals';

import didiFixture from '../../test/fixtures/didi-order-created.json';
import rappiFixture from '../../test/fixtures/rappi-order-created.json';
import ubereatsFixture from '../../test/fixtures/ubereats-order-created.json';
import { DidiAdapter } from './didi/didi.adapter';
import { InvalidProviderPayloadError } from './provider-adapter.interface';
import { RappiAdapter } from './rappi/rappi.adapter';
import { UberEatsAdapter } from './ubereats/ubereats.adapter';

/**
 * LSP contract: every adapter must be substitutable behind the same port.
 * These assertions run identically against all three implementations.
 */
const CASES = [
  { name: 'RappiAdapter', adapter: new RappiAdapter(), fixture: rappiFixture },
  { name: 'UberEatsAdapter', adapter: new UberEatsAdapter(), fixture: ubereatsFixture },
  { name: 'DidiAdapter', adapter: new DidiAdapter(), fixture: didiFixture },
] as const;

describe.each(CASES)('$name fulfills the ProviderAdapter contract', ({ adapter, fixture }) => {
  it('declares the provider it handles', () => {
    expect(adapter.provider).toBeTruthy();
  });

  it('produces an internally consistent canonical order', () => {
    const order = adapter.toCanonicalOrder(fixture);

    expect(order.provider).toBe(adapter.provider);
    expect(order.externalId.length).toBeGreaterThan(0);
    expect(order.customerName.length).toBeGreaterThan(0);
    expect(order.items.length).toBeGreaterThan(0);

    for (const item of order.items) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(Number.isInteger(item.quantity)).toBe(true);
      expect(item.quantity).toBeGreaterThan(0);
      expect(Number.isInteger(item.unitPriceCents)).toBe(true);
      expect(item.unitPriceCents).toBeGreaterThan(0);
    }

    // The canonical total must equal the sum of its items — no provider
    // quirk is allowed to leak through as an inconsistent order.
    const itemsTotal = order.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );
    expect(order.totalCents).toBe(itemsTotal);

    expect(order.currency).toMatch(/^[A-Z]{3}$/);
    expect(Number.isNaN(Date.parse(order.placedAt))).toBe(false);
  });

  it.each([[null], [{}], [{ unexpected: 'shape' }], ['not even an object']])(
    'rejects malformed payload %p with InvalidProviderPayloadError',
    (payload) => {
      expect(() => adapter.toCanonicalOrder(payload)).toThrow(InvalidProviderPayloadError);
    },
  );
});

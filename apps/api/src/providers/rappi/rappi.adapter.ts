import { Injectable } from '@nestjs/common';
import { CanonicalOrder, Provider } from '@delivery-hub/shared';

import { InvalidProviderPayloadError, ProviderAdapter } from '../provider-adapter.interface';
import { isRappiOrderPayload } from './rappi-payload.types';

/** Rappi sends amounts as whole COP pesos; the canonical model is integer cents. */
const pesosToCents = (pesos: number): number => Math.round(pesos * 100);

@Injectable()
export class RappiAdapter implements ProviderAdapter {
  readonly provider = Provider.RAPPI;

  toCanonicalOrder(payload: unknown): CanonicalOrder {
    if (!isRappiOrderPayload(payload)) {
      throw new InvalidProviderPayloadError(
        this.provider,
        'expected { order: { id, createdAt, totalOrder, products[], client } }',
      );
    }

    const { order } = payload;
    return {
      provider: this.provider,
      externalId: order.id,
      customerName: `${order.client.firstName} ${order.client.lastName}`.trim(),
      items: order.products.map((product) => ({
        name: product.name,
        quantity: product.units,
        unitPriceCents: pesosToCents(product.price),
      })),
      totalCents: pesosToCents(order.totalOrder),
      currency: 'COP',
      placedAt: new Date(order.createdAt).toISOString(),
    };
  }
}

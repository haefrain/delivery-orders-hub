import { Injectable } from '@nestjs/common';
import { CanonicalOrder, Provider } from '@delivery-hub/shared';

import { InvalidProviderPayloadError, ProviderAdapter } from '../provider-adapter.interface';
import { isUberEatsOrderPayload } from './ubereats-payload.types';

@Injectable()
export class UberEatsAdapter implements ProviderAdapter {
  readonly provider = Provider.UBEREATS;

  toCanonicalOrder(payload: unknown): CanonicalOrder {
    if (!isUberEatsOrderPayload(payload)) {
      throw new InvalidProviderPayloadError(
        this.provider,
        'expected { order: { display_id, placed_at, eater, cart.items[] } }',
      );
    }

    const { order } = payload;
    const items = order.cart.items.map((item) => ({
      name: item.title,
      quantity: item.quantity,
      unitPriceCents: item.price.unit_price.amount,
    }));

    return {
      provider: this.provider,
      externalId: order.display_id,
      customerName: `${order.eater.first_name} ${order.eater.last_name}`.trim(),
      items,
      // Uber doesn't send an order total in this event; derive it from the cart
      totalCents: items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0),
      currency: order.cart.items[0].price.unit_price.currency_code,
      placedAt: new Date(order.placed_at).toISOString(),
    };
  }
}

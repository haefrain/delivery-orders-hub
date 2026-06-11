import { Injectable } from '@nestjs/common';
import { CanonicalOrder, Provider } from '@delivery-hub/shared';

import { InvalidProviderPayloadError, ProviderAdapter } from '../provider-adapter.interface';
import { isDidiOrderDetail, isDidiWebhookPayload } from './didi-payload.types';

@Injectable()
export class DidiAdapter implements ProviderAdapter {
  readonly provider = Provider.DIDI;

  toCanonicalOrder(payload: unknown): CanonicalOrder {
    if (!isDidiWebhookPayload(payload)) {
      throw new InvalidProviderPayloadError(
        this.provider,
        'expected { eventType, orderId, timestamp, orderDetail }',
      );
    }

    let detail: unknown;
    try {
      detail = JSON.parse(payload.orderDetail);
    } catch {
      throw new InvalidProviderPayloadError(this.provider, 'orderDetail is not valid JSON');
    }

    if (!isDidiOrderDetail(detail)) {
      throw new InvalidProviderPayloadError(
        this.provider,
        'orderDetail must contain { orderId, customer, currency, totalAmount, items[], createTime }',
      );
    }

    return {
      provider: this.provider,
      externalId: detail.orderId,
      customerName: detail.customer.name,
      items: detail.items.map((item) => ({
        name: item.itemName,
        quantity: item.qty,
        unitPriceCents: item.unitPrice,
      })),
      totalCents: detail.totalAmount,
      currency: detail.currency,
      placedAt: new Date(detail.createTime).toISOString(),
    };
  }
}

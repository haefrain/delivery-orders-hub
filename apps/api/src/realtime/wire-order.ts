import { CanonicalOrderItem, HubOrder } from '@delivery-hub/shared';

import { OrderRecord } from '../orders/orders.repository';

/** DB record -> wire shape: dates become ISO strings, items get their real type back. */
export const toWireOrder = (order: OrderRecord): HubOrder => ({
  id: order.id,
  provider: order.provider,
  externalId: order.externalId,
  status: order.status,
  customerName: order.customerName,
  items: order.items as CanonicalOrderItem[],
  totalCents: order.totalCents,
  currency: order.currency,
  placedAt: order.placedAt.toISOString(),
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});

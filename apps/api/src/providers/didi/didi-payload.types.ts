import { isObject } from '../provider-adapter.interface';

/** DiDi dialect: numeric event codes and the order detail embedded as a JSON *string*. */
export interface DidiWebhookPayload {
  eventType: number;
  orderId: string;
  timestamp: number;
  orderDetail: string;
}

export interface DidiOrderDetail {
  orderId: string;
  customer: { name: string };
  currency: string;
  totalAmount: number;
  items: Array<{ itemName: string; qty: number; unitPrice: number }>;
  createTime: number;
}

export function isDidiWebhookPayload(value: unknown): value is DidiWebhookPayload {
  return (
    isObject(value) &&
    typeof value.eventType === 'number' &&
    typeof value.orderId === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.orderDetail === 'string'
  );
}

export function isDidiOrderDetail(value: unknown): value is DidiOrderDetail {
  if (
    !isObject(value) ||
    typeof value.orderId !== 'string' ||
    !isObject(value.customer) ||
    typeof value.customer.name !== 'string' ||
    typeof value.currency !== 'string' ||
    typeof value.totalAmount !== 'number' ||
    typeof value.createTime !== 'number' ||
    !Array.isArray(value.items) ||
    value.items.length === 0
  ) {
    return false;
  }
  return value.items.every(
    (item) =>
      isObject(item) &&
      typeof item.itemName === 'string' &&
      typeof item.qty === 'number' &&
      typeof item.unitPrice === 'number',
  );
}

import { isObject } from '../provider-adapter.interface';

/** Uber Eats dialect: deeply nested snake_case, amounts already in minor units. */
export interface UberEatsOrderPayload {
  event_type: string;
  event_id: string;
  order: {
    display_id: string;
    placed_at: string;
    eater: { first_name: string; last_name: string };
    cart: {
      items: Array<{
        title: string;
        quantity: number;
        price: { unit_price: { amount: number; currency_code: string } };
      }>;
    };
  };
}

export function isUberEatsOrderPayload(value: unknown): value is UberEatsOrderPayload {
  if (!isObject(value) || !isObject(value.order)) {
    return false;
  }
  const order = value.order;
  if (
    typeof order.display_id !== 'string' ||
    typeof order.placed_at !== 'string' ||
    !isObject(order.eater) ||
    typeof order.eater.first_name !== 'string' ||
    typeof order.eater.last_name !== 'string' ||
    !isObject(order.cart) ||
    !Array.isArray(order.cart.items) ||
    order.cart.items.length === 0
  ) {
    return false;
  }
  return order.cart.items.every((item) => {
    if (!isObject(item) || typeof item.title !== 'string' || typeof item.quantity !== 'number') {
      return false;
    }
    if (!isObject(item.price) || !isObject(item.price.unit_price)) {
      return false;
    }
    const unitPrice = item.price.unit_price;
    return typeof unitPrice.amount === 'number' && typeof unitPrice.currency_code === 'string';
  });
}

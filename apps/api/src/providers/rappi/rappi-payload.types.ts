import { isObject } from '../provider-adapter.interface';

/** Rappi dialect: flat structure, Spanish business keys, amounts in whole COP pesos. */
export interface RappiOrderPayload {
  event: string;
  order: {
    id: string;
    createdAt: string;
    totalOrder: number;
    products: Array<{ name: string; units: number; price: number }>;
    client: { firstName: string; lastName: string };
  };
}

export function isRappiOrderPayload(value: unknown): value is RappiOrderPayload {
  if (!isObject(value) || !isObject(value.order)) {
    return false;
  }
  const order = value.order;
  return (
    typeof order.id === 'string' &&
    typeof order.createdAt === 'string' &&
    typeof order.totalOrder === 'number' &&
    Array.isArray(order.products) &&
    order.products.length > 0 &&
    order.products.every(
      (product) =>
        isObject(product) &&
        typeof product.name === 'string' &&
        typeof product.units === 'number' &&
        typeof product.price === 'number',
    ) &&
    isObject(order.client) &&
    typeof order.client.firstName === 'string' &&
    typeof order.client.lastName === 'string'
  );
}

import { randomUUID } from 'node:crypto';

import { Provider } from '@delivery-hub/shared';

const CUSTOMERS = [
  ['Laura', 'Gómez'],
  ['Carlos', 'Mendoza'],
  ['Ana', 'Ruiz'],
  ['Santiago', 'Pardo'],
  ['Valentina', 'Ríos'],
  ['Mateo', 'Quintero'],
  ['Camila', 'Suárez'],
  ['Andrés', 'Castaño'],
] as const;

/** [name, price in whole COP pesos] — realistic Colombian menu prices. */
const MENU_COP: ReadonlyArray<[string, number]> = [
  ['Hamburguesa doble', 18_900],
  ['Bowl de pollo', 28_900],
  ['Limonada de coco', 9_000],
  ['Papas medianas', 10_000],
  ['Té helado', 7_300],
  ['Arepa rellena', 14_500],
  ['Jugo natural', 8_000],
];

/** [name, price in MXN cents] — Uber Eats sends minor units. */
const MENU_MXN_CENTS: ReadonlyArray<[string, number]> = [
  ['Tacos al pastor', 6_500],
  ['Agua de horchata', 3_000],
  ['Quesadilla grande', 7_800],
  ['Torta de milanesa', 9_200],
  ['Elote preparado', 4_100],
];

const pick = <T>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)];
const intBetween = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

const buildRappiPayload = () => {
  const products = Array.from({ length: intBetween(1, 4) }, () => {
    const [name, price] = pick(MENU_COP);
    return { name, units: intBetween(1, 3), price };
  });
  const [firstName, lastName] = pick(CUSTOMERS);

  return {
    event: 'order.created',
    order: {
      id: `RAP-${randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      totalProducts: products.length,
      totalOrder: products.reduce((sum, product) => sum + product.units * product.price, 0),
      products,
      client: { firstName, lastName },
    },
  };
};

const buildUberEatsPayload = () => {
  const items = Array.from({ length: intBetween(1, 4) }, () => {
    const [title, amount] = pick(MENU_MXN_CENTS);
    return {
      title,
      quantity: intBetween(1, 3),
      price: { unit_price: { amount, currency_code: 'MXN' } },
    };
  });
  const [firstName, lastName] = pick(CUSTOMERS);

  return {
    event_type: 'orders.notification',
    event_id: `evt_${randomUUID()}`,
    resource_href: `https://api.uber.com/v1/eats/orders/${randomUUID().slice(0, 8)}`,
    meta: { resource_id: `UE-${randomUUID().slice(0, 6).toUpperCase()}`, status: 'pos' },
    order: {
      display_id: `UE-${randomUUID().slice(0, 6).toUpperCase()}`,
      placed_at: new Date().toISOString(),
      eater: { first_name: firstName, last_name: `${lastName.charAt(0)}.` },
      cart: { items },
    },
  };
};

const buildDidiPayload = () => {
  const items = Array.from({ length: intBetween(1, 3) }, () => {
    const [itemName, pesos] = pick(MENU_COP);
    return { itemName, qty: intBetween(1, 2), unitPrice: pesos * 100 };
  });
  const now = Date.now();
  const orderId = `DD-${now}-${intBetween(1000, 9999)}`;

  // DiDi's signature quirk: the order detail travels as an embedded JSON string
  const orderDetail = JSON.stringify({
    orderId,
    customer: { name: pick(CUSTOMERS).join(' ') },
    currency: 'COP',
    totalAmount: items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    items,
    createTime: now,
  });

  return { eventType: 1, orderId, timestamp: now, orderDetail };
};

export const buildWebhookPayload = (provider: Provider): object => {
  switch (provider) {
    case Provider.RAPPI:
      return buildRappiPayload();
    case Provider.UBEREATS:
      return buildUberEatsPayload();
    case Provider.DIDI:
      return buildDidiPayload();
  }
};

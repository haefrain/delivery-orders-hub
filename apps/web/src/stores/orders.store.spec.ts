import { HubOrder, OrderStatus, Provider } from '@delivery-hub/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useOrdersStore } from './orders.store';

let sequence = 0;

const makeOrder = (overrides: Partial<HubOrder> = {}): HubOrder => {
  sequence += 1;
  return {
    id: `order-${sequence}`,
    provider: Provider.RAPPI,
    externalId: `RAP-${sequence}`,
    status: OrderStatus.RECEIVED,
    customerName: 'Laura Gómez',
    items: [{ name: 'Hamburguesa doble', quantity: 1, unitPriceCents: 1_890_000 }],
    totalCents: 1_890_000,
    currency: 'COP',
    placedAt: `2026-06-10T23:0${sequence % 10}:00.000Z`,
    createdAt: '2026-06-10T23:22:50.000Z',
    updatedAt: '2026-06-10T23:22:50.000Z',
    ...overrides,
  };
};

describe('orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('setOrders replaces the whole collection', () => {
    const store = useOrdersStore();
    store.setOrders([makeOrder(), makeOrder()]);
    expect(store.all).toHaveLength(2);

    store.setOrders([makeOrder()]);
    expect(store.all).toHaveLength(1);
  });

  it('applyOrderEvent inserts a new order into its status column', () => {
    const store = useOrdersStore();
    const order = makeOrder({ status: OrderStatus.RECEIVED });

    store.applyOrderEvent(order);

    expect(store.byStatus(OrderStatus.RECEIVED)).toHaveLength(1);
  });

  it('applyOrderEvent moves an order between columns when its status changes', () => {
    const store = useOrdersStore();
    const order = makeOrder({ status: OrderStatus.RECEIVED });
    store.applyOrderEvent(order);

    store.applyOrderEvent({ ...order, status: OrderStatus.ACCEPTED });

    expect(store.byStatus(OrderStatus.RECEIVED)).toHaveLength(0);
    expect(store.byStatus(OrderStatus.ACCEPTED)).toHaveLength(1);
    expect(store.all).toHaveLength(1);
  });

  it('byStatus returns newest orders first', () => {
    const store = useOrdersStore();
    const older = makeOrder({ placedAt: '2026-06-10T20:00:00.000Z' });
    const newer = makeOrder({ placedAt: '2026-06-10T23:00:00.000Z' });
    store.setOrders([older, newer]);

    const column = store.byStatus(OrderStatus.RECEIVED);
    expect(column.map((order) => order.id)).toEqual([newer.id, older.id]);
  });

  it('aggregates counts by provider and by status', () => {
    const store = useOrdersStore();
    store.setOrders([
      makeOrder({ provider: Provider.RAPPI, status: OrderStatus.RECEIVED }),
      makeOrder({ provider: Provider.RAPPI, status: OrderStatus.DELIVERED }),
      makeOrder({ provider: Provider.DIDI, status: OrderStatus.RECEIVED }),
    ]);

    expect(store.countsByProvider).toEqual({ RAPPI: 2, DIDI: 1 });
    expect(store.countsByStatus).toEqual({ RECEIVED: 2, DELIVERED: 1 });
  });
});

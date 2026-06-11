import { HubOrder, OrderStatus } from '@delivery-hub/shared';
import { defineStore } from 'pinia';

import { fetchOrders, transitionOrder } from '../lib/api';

const countBy = (orders: HubOrder[], key: 'provider' | 'status'): Record<string, number> =>
  orders.reduce<Record<string, number>>((acc, order) => {
    acc[order[key]] = (acc[order[key]] ?? 0) + 1;
    return acc;
  }, {});

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: {} as Record<string, HubOrder>,
    dlqCount: 0,
  }),
  getters: {
    all: (state): HubOrder[] => Object.values(state.orders),
    byStatus(): (status: OrderStatus) => HubOrder[] {
      return (status) =>
        this.all
          .filter((order) => order.status === status)
          .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
    },
    countsByProvider(): Record<string, number> {
      return countBy(this.all, 'provider');
    },
    countsByStatus(): Record<string, number> {
      return countBy(this.all, 'status');
    },
  },
  actions: {
    setOrders(orders: HubOrder[]) {
      this.orders = Object.fromEntries(orders.map((order) => [order.id, order]));
    },
    /** Single reducer for both order.created and order.updated WS events. */
    applyOrderEvent(order: HubOrder) {
      this.orders[order.id] = order;
    },
    setDlqCount(count: number) {
      this.dlqCount = count;
    },
    async load() {
      this.setOrders(await fetchOrders());
    },
    async transition(id: string, to: OrderStatus) {
      // No optimistic update: the server is the source of truth and its
      // order.updated event (relayed via Redis) moves the card.
      await transitionOrder(id, to);
    },
  },
});

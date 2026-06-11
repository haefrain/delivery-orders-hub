/**
 * Lifecycle states of an order inside the hub.
 * Const object instead of a TS enum so the union type stays structurally
 * compatible with the Prisma-generated enum (same string literals).
 */
export const OrderStatus = {
  RECEIVED: 'RECEIVED',
  ACCEPTED: 'ACCEPTED',
  IN_PREPARATION: 'IN_PREPARATION',
  READY: 'READY',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ALL_ORDER_STATUSES: readonly OrderStatus[] = Object.values(OrderStatus);

import { HubOrder } from './canonical-order';

/** Channel the worker publishes to and the gateway subscribes from (Redis pub/sub). */
export const DOMAIN_EVENTS_CHANNEL = 'domain-events';

/** Socket.IO event names shared by gateway and dashboard. */
export const WS_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

export interface OrderEventPayload {
  order: HubOrder;
}

export interface DomainEventEnvelope {
  event: WsEventName;
  payload: OrderEventPayload;
}

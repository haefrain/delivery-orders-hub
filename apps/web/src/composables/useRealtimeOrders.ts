import { OrderEventPayload, WS_EVENTS } from '@delivery-hub/shared';
import { onBeforeUnmount, onMounted } from 'vue';
import { io, Socket } from 'socket.io-client';

import { useOrdersStore } from '../stores/orders.store';

/** Connects the dashboard to the gateway and funnels events into the store. */
export function useRealtimeOrders(): void {
  const store = useOrdersStore();
  let socket: Socket | undefined;

  onMounted(() => {
    socket = io({ transports: ['websocket'] });
    socket.on(WS_EVENTS.ORDER_CREATED, (payload: OrderEventPayload) =>
      store.applyOrderEvent(payload.order),
    );
    socket.on(WS_EVENTS.ORDER_UPDATED, (payload: OrderEventPayload) =>
      store.applyOrderEvent(payload.order),
    );
  });

  onBeforeUnmount(() => {
    socket?.disconnect();
  });
}

import { HubOrder, OrderStatus } from '@delivery-hub/shared';

const json = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const fetchOrders = (): Promise<HubOrder[]> =>
  fetch('/api/orders').then((response) => json<HubOrder[]>(response));

export const transitionOrder = (id: string, to: OrderStatus): Promise<HubOrder> =>
  fetch(`/api/orders/${id}/transition`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to }),
  }).then((response) => json<HubOrder>(response));

export const fetchDlqCount = (): Promise<number> =>
  fetch('/api/dlq')
    .then((response) => json<{ count: number }>(response))
    .then((data) => data.count);

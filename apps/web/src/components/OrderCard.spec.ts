import { HubOrder, OrderStatus, Provider } from '@delivery-hub/shared';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import OrderCard from './OrderCard.vue';

const order = (status: OrderStatus): HubOrder => ({
  id: 'order-1',
  provider: Provider.RAPPI,
  externalId: 'RAP-848271',
  status,
  customerName: 'Laura Gómez',
  items: [
    { name: 'Hamburguesa doble', quantity: 2, unitPriceCents: 1_890_000 },
    { name: 'Limonada de coco', quantity: 1, unitPriceCents: 900_000 },
  ],
  totalCents: 4_680_000,
  currency: 'COP',
  placedAt: '2026-06-10T23:22:43.000Z',
  createdAt: '2026-06-10T23:22:50.000Z',
  updatedAt: '2026-06-10T23:22:50.000Z',
});

describe('OrderCard', () => {
  it('shows the order identity, customer and provider', () => {
    const wrapper = mount(OrderCard, { props: { order: order(OrderStatus.RECEIVED) } });

    expect(wrapper.text()).toContain('RAP-848271');
    expect(wrapper.text()).toContain('Laura Gómez');
    expect(wrapper.text()).toContain('Rappi');
    expect(wrapper.text()).toContain('3 items');
  });

  it('renders exactly the actions the shared transition table allows', () => {
    const wrapper = mount(OrderCard, { props: { order: order(OrderStatus.RECEIVED) } });

    const labels = wrapper.findAll('button').map((button) => button.text());
    expect(labels).toEqual(['Accept', 'Reject', 'Cancel']);
  });

  it('emits the chosen transition when an action is clicked', async () => {
    const wrapper = mount(OrderCard, { props: { order: order(OrderStatus.RECEIVED) } });

    await wrapper.findAll('button')[0].trigger('click');

    expect(wrapper.emitted('transition')).toEqual([[OrderStatus.ACCEPTED]]);
  });

  it('renders no actions for terminal statuses', () => {
    const wrapper = mount(OrderCard, { props: { order: order(OrderStatus.DELIVERED) } });

    expect(wrapper.findAll('button')).toHaveLength(0);
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import App from './App.vue';

describe('App', () => {
  it('renders the hub title and the three providers', () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain('Delivery Orders Hub');
    for (const provider of ['Rappi', 'Uber Eats', 'DiDi Food']) {
      expect(wrapper.text()).toContain(provider);
    }
  });
});

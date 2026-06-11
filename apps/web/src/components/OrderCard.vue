<script setup lang="ts">
import { HubOrder, ORDER_TRANSITIONS, OrderStatus } from '@delivery-hub/shared';
import { computed } from 'vue';

import ProviderBadge from './ProviderBadge.vue';

const props = defineProps<{ order: HubOrder }>();
const emit = defineEmits<{ transition: [to: OrderStatus] }>();

const ACTION_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RECEIVED]: 'Reset',
  [OrderStatus.ACCEPTED]: 'Accept',
  [OrderStatus.IN_PREPARATION]: 'Start prep',
  [OrderStatus.READY]: 'Ready',
  [OrderStatus.DISPATCHED]: 'Dispatch',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancel',
  [OrderStatus.REJECTED]: 'Reject',
};

// The dashboard reuses the same transition table the API enforces:
// it is impossible to render an action the server would reject.
const actions = computed(() => ORDER_TRANSITIONS[props.order.status]);

const total = computed(() =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.order.currency,
    maximumFractionDigits: 0,
  }).format(props.order.totalCents / 100),
);

const itemCount = computed(() => props.order.items.reduce((sum, item) => sum + item.quantity, 0));
</script>

<template>
  <article class="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
    <header class="flex items-center justify-between gap-2">
      <span class="font-mono text-xs text-slate-400">{{ order.externalId }}</span>
      <ProviderBadge :provider="order.provider" />
    </header>
    <p class="text-sm text-slate-200">{{ order.customerName }}</p>
    <p class="text-xs text-slate-400">{{ itemCount }} items · {{ total }} {{ order.currency }}</p>
    <footer v-if="actions.length > 0" class="flex flex-wrap gap-1.5 pt-1">
      <button
        v-for="to in actions"
        :key="to"
        class="rounded-md px-2 py-1 text-xs font-medium transition-colors"
        :class="
          to === 'CANCELLED' || to === 'REJECTED'
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
        "
        @click="emit('transition', to)"
      >
        {{ ACTION_LABELS[to] }}
      </button>
    </footer>
  </article>
</template>

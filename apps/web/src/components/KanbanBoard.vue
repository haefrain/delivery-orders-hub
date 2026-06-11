<script setup lang="ts">
import { OrderStatus } from '@delivery-hub/shared';
import { computed } from 'vue';

import { useOrdersStore } from '../stores/orders.store';
import KanbanColumn from './KanbanColumn.vue';

const store = useOrdersStore();

const COLUMNS: Array<{ status: OrderStatus; title: string }> = [
  { status: OrderStatus.RECEIVED, title: 'Received' },
  { status: OrderStatus.ACCEPTED, title: 'Accepted' },
  { status: OrderStatus.IN_PREPARATION, title: 'In preparation' },
  { status: OrderStatus.READY, title: 'Ready' },
  { status: OrderStatus.DISPATCHED, title: 'Dispatched' },
  { status: OrderStatus.DELIVERED, title: 'Delivered' },
];

const closedCount = computed(
  () => store.byStatus(OrderStatus.CANCELLED).length + store.byStatus(OrderStatus.REJECTED).length,
);

const onTransition = (orderId: string, to: OrderStatus) => {
  void store.transition(orderId, to);
};
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-3 overflow-x-auto pb-3">
      <KanbanColumn
        v-for="column in COLUMNS"
        :key="column.status"
        :title="column.title"
        :orders="store.byStatus(column.status)"
        @transition="onTransition"
      />
    </div>
    <p v-if="closedCount > 0" class="text-xs text-slate-500">
      {{ closedCount }} cancelled / rejected orders hidden from the board
    </p>
  </div>
</template>

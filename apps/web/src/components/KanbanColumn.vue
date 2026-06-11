<script setup lang="ts">
import { HubOrder, OrderStatus } from '@delivery-hub/shared';

import OrderCard from './OrderCard.vue';

defineProps<{ title: string; orders: HubOrder[] }>();
const emit = defineEmits<{ transition: [orderId: string, to: OrderStatus] }>();
</script>

<template>
  <section class="flex w-64 shrink-0 flex-col gap-2">
    <header class="flex items-center justify-between px-1">
      <h2 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">{{ title }}</h2>
      <span class="rounded-full bg-slate-800 px-2 text-xs text-slate-300">{{ orders.length }}</span>
    </header>
    <div class="flex min-h-24 flex-col gap-2 rounded-xl bg-slate-900/40 p-2">
      <OrderCard
        v-for="order in orders"
        :key="order.id"
        :order="order"
        @transition="(to) => emit('transition', order.id, to)"
      />
      <p v-if="orders.length === 0" class="py-6 text-center text-xs text-slate-600">No orders</p>
    </div>
  </section>
</template>

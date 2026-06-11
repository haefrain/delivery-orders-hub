<script setup lang="ts">
import { onMounted } from 'vue';

import DlqIndicator from './components/DlqIndicator.vue';
import KanbanBoard from './components/KanbanBoard.vue';
import MetricsBar from './components/MetricsBar.vue';
import { useRealtimeOrders } from './composables/useRealtimeOrders';
import { useOrdersStore } from './stores/orders.store';

const store = useOrdersStore();
useRealtimeOrders();

onMounted(() => {
  void store.load();
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
      <div>
        <h1 class="text-xl font-semibold">Delivery Orders Hub</h1>
        <p class="text-sm text-slate-400">Rappi · Uber Eats · DiDi Food — one live board</p>
      </div>
      <DlqIndicator />
    </header>
    <main class="space-y-4 p-6">
      <MetricsBar />
      <KanbanBoard />
    </main>
  </div>
</template>

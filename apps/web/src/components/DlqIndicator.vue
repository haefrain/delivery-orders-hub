<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

import { fetchDlqCount } from '../lib/api';
import { useOrdersStore } from '../stores/orders.store';

const store = useOrdersStore();
let timer: ReturnType<typeof setInterval> | undefined;

const refresh = async () => {
  try {
    store.setDlqCount(await fetchDlqCount());
  } catch {
    // API momentarily unreachable: keep the last known count
  }
};

onMounted(() => {
  void refresh();
  timer = setInterval(refresh, 10_000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <span
    class="rounded-full px-3 py-1 text-xs font-medium"
    :class="
      store.dlqCount > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/10 text-emerald-500'
    "
  >
    DLQ: {{ store.dlqCount }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useOrdersStore } from '../stores/orders.store';

const store = useOrdersStore();

const providerEntries = computed(() => Object.entries(store.countsByProvider));
const total = computed(() => store.all.length);
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 text-sm">
    <span class="text-slate-300">
      <strong class="text-slate-100">{{ total }}</strong> orders
    </span>
    <span v-for="[provider, count] in providerEntries" :key="provider" class="text-slate-400">
      {{ provider }}: <strong class="text-slate-200">{{ count }}</strong>
    </span>
  </div>
</template>

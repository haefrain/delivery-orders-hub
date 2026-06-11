<script setup lang="ts">
import { Provider } from '@delivery-hub/shared';
import { computed } from 'vue';

const props = defineProps<{ provider: Provider }>();

const STYLES: Record<Provider, { label: string; classes: string }> = {
  [Provider.RAPPI]: { label: 'Rappi', classes: 'bg-orange-500/15 text-orange-400' },
  [Provider.UBEREATS]: { label: 'Uber Eats', classes: 'bg-emerald-500/15 text-emerald-400' },
  [Provider.DIDI]: { label: 'DiDi Food', classes: 'bg-rose-500/15 text-rose-400' },
};

const style = computed(() => STYLES[props.provider]);
</script>

<template>
  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="style.classes">
    {{ style.label }}
  </span>
</template>

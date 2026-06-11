<script setup lang="ts">
const providers = ['Rappi', 'Uber Eats', 'DiDi Food'];
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 px-6 py-4">
      <h1 class="text-xl font-semibold">Delivery Orders Hub</h1>
      <p class="text-sm text-slate-400">Unified real-time view of incoming delivery orders</p>
    </header>
    <main class="p-6">
      <ul class="flex gap-2">
        <li
          v-for="provider in providers"
          :key="provider"
          class="rounded-full bg-slate-800 px-3 py-1 text-sm"
        >
          {{ provider }}
        </li>
      </ul>
      <p class="mt-6 text-slate-500">Live kanban board coming in upcoming milestones.</p>
    </main>
  </div>
</template>

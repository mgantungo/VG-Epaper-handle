<!--
  File:      /var/www/VGEpaper/handle/app/components/AnaStat.vue
  Repo path: apps/handle/app/components/AnaStat.vue             NEW FILE (Phases 1–4)
  One headline number: label, value, optional unit, change and note.
-->
<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  change: { type: Object, default: null }, // { text, dir }
  note: { type: String, default: '' },
  edge: { type: String, default: '' } // colour of the top edge
})
</script>

<template>
  <div class="stat" style="flex: 1 1 160px; min-width: 0" :style="edge ? { borderTopColor: edge } : null">
    <p class="mono text-[11px] muted">{{ label }}</p>
    <p class="font-extrabold mt-1 leading-tight" :class="String(value).length > 9 ? 'text-[22px]' : 'text-[28px]'">{{ value }} <span v-if="unit" class="text-[15px] font-medium muted">{{ unit }}</span></p>
    <p v-if="change" class="mono text-[11px] mt-0.5" :style="{ color: change.dir === 'up' ? '#0f7a55' : change.dir === 'down' ? '#b3261e' : 'rgba(15,27,45,.6)' }">{{ change.text }}</p>
    <p v-if="note" class="mono text-[11px] muted mt-0.5">{{ note }}</p>
  </div>
</template>

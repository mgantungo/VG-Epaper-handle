<!--
  File:      /var/www/VGEpaper/handle/app/components/SplitEditor.vue
  Repo path: apps/handle/app/components/SplitEditor.vue          NEW FILE (Phase 0)

  The revenue split of a bundle plan: what share of its price each
  publication is credited with in revenue reports. "Use suggested" asks the
  CMS for option A (agreed 23 Oct 2026): proportional to each publication's
  own standard price per day. Must total 100%. Frozen onto each sale.
  v-model: { NV: 78, NVW: 22 }
-->
<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="label !mb-0">Revenue split — how this plan's price is credited to each publication in reports</span>
      <button type="button" class="btn-soft" :disabled="busy" @click="$emit('suggest')">Use suggested</button>
    </div>
    <div class="flex h-7 rounded-lg overflow-hidden mt-2" aria-hidden="true">
      <div v-for="(c, i) in codes" :key="c" class="flex items-center justify-center mono text-[11px] text-white" :style="{ width: `${share(c)}%`, background: PALETTE[i % PALETTE.length] }">
        <span v-if="share(c) >= 10">{{ c }} {{ share(c) }}%</span>
      </div>
    </div>
    <div class="flex flex-wrap gap-3 mt-3">
      <label v-for="c in codes" :key="c" class="flex items-center gap-2 text-[13px]">
        <span class="mono w-12">{{ c }}</span>
        <input :value="share(c)" type="number" min="0" max="100" step="1" class="field !h-9 !w-20 mono text-right" :aria-label="`${c} percent`" @input="set(c, $event.target.value)">
        <span class="muted">%</span>
      </label>
      <span class="mono text-[12px] self-center" :class="total === 100 ? 'text-emerald-700' : 'text-red-700'">total {{ total }}%</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  codes: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'suggest'])
const PALETTE = ['#2f55e4', '#c2410c', '#0f7a55', '#6d28d9', '#9a5a05', '#0e7490']

const share = (c) => Number(props.modelValue?.[c]) || 0
const total = computed(() => props.codes.reduce((s, c) => s + share(c), 0))
function set(c, v) {
  const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
  emit('update:modelValue', { ...props.modelValue, [c]: n })
}
</script>

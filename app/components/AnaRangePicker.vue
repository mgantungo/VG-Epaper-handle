<!--
  File:      /var/www/VGEpaper/handle/app/components/AnaRangePicker.vue
  Repo path: apps/handle/app/components/AnaRangePicker.vue      NEW FILE (Phases 1–4)

  Date range for the Analytics pages: presets plus a custom from/to.
  v-model: { from, to } (YYYY-MM-DD, Kampala days). Kept in the URL
  (?from=&to=) by the pages, so a view can be bookmarked or shared.
-->
<script setup>
const props = defineProps({ modelValue: { type: Object, required: true } })
const emit = defineEmits(['update:modelValue'])

const PRESETS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: '12m', label: '12 months' }
]
const activePreset = computed(() => PRESETS.find((p) => {
  const r = rangePreset(p.key)
  return r.from === props.modelValue.from && r.to === props.modelValue.to
})?.key || 'custom')
const custom = ref(false)
const from = ref(props.modelValue.from)
const to = ref(props.modelValue.to)
watch(() => props.modelValue, (v) => { from.value = v.from; to.value = v.to })

function pick(key) {
  custom.value = false
  emit('update:modelValue', rangePreset(key))
}
function apply() {
  if (!from.value || !to.value) return
  emit('update:modelValue', from.value <= to.value ? { from: from.value, to: to.value } : { from: to.value, to: from.value })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="seg seg-light" role="group" aria-label="Date range">
      <button v-for="p in PRESETS" :key="p.key" class="seg-btn" :class="activePreset === p.key && !custom ? 'seg-on' : ''" @click="pick(p.key)">{{ p.label }}</button>
      <button class="seg-btn" :class="activePreset === 'custom' || custom ? 'seg-on' : ''" @click="custom = !custom">Custom</button>
    </div>
    <form v-if="custom || activePreset === 'custom'" class="flex items-center gap-2" @submit.prevent="apply">
      <input v-model="from" type="date" class="field" style="height: 34px; width: 150px" aria-label="From" min="1900-01-01">
      <span class="muted text-[12px]">to</span>
      <input v-model="to" type="date" class="field" style="height: 34px; width: 150px" aria-label="To" min="1900-01-01">
      <button class="btn-ghost" style="height: 34px">Show</button>
    </form>
    <span class="mono text-[12px] muted">{{ fmtRange(modelValue) }}</span>
  </div>
</template>

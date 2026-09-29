<template>
  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" :class="classes">
    <span class="w-1.5 h-1.5 rounded-full" :class="dotClasses" />
    {{ label }}
  </span>
</template>

<script setup>
const props = defineProps({ status: { type: String, default: null } })

// Mirrors Edition.pipelineStatus's enum exactly — pending/processing/
// ready_for_review/failed, per what apps/ingest/src/pipeline/runIngest.js
// actually writes. A status this component doesn't recognize (schema
// drift, a value added on the CMS side without updating this) falls
// through to the neutral/unknown style rather than crashing on an
// undefined class lookup.
const STYLES = {
  pending: { label: 'Pending', classes: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
  processing: { label: 'Processing', classes: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500 animate-pulse' },
  ready_for_review: { label: 'Ready for review', classes: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  failed: { label: 'Failed', classes: 'bg-red-50 text-red-700', dot: 'bg-red-500' }
}

const entry = computed(() => STYLES[props.status] || { label: props.status || 'Unknown', classes: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-300' })
const label = computed(() => entry.value.label)
const classes = computed(() => entry.value.classes)
const dotClasses = computed(() => entry.value.dot)
</script>

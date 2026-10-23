<!--
  File:      /var/www/VGEpaper/handle/app/components/AnaBarChart.vue
  Repo path: apps/handle/app/components/AnaBarChart.vue         NEW FILE (Phases 1–4)

  Bar chart for the Analytics pages: stacked or side-by-side series, with
  optional values below the zero line (e.g. lapsed subscribers) and an
  optional line drawn over the bars (e.g. net change) on the same axis.
  Bars have a 2px gap between neighbours, 4px rounded ends and a hover
  tooltip per column.

  Props:
    labels   x categories
    series   [{ key, name, colour, values, negative?, pale? }]  negative: drawn below zero
    line     { name, colour, values } optional, same axis
    stacked  stack the series (default true)
    yFormat  value -> text
    xFormat  label -> text
    highlight  [index] columns drawn darker (others muted), optional
    height
-->
<script setup>
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  line: { type: Object, default: null },
  stacked: { type: Boolean, default: true },
  yFormat: { type: Function, default: (v) => Number(v || 0).toLocaleString('en-GB') },
  xFormat: { type: Function, default: (l) => l },
  height: { type: Number, default: 240 },
  ariaLabel: { type: String, default: 'Bar chart' }
})

const box = ref(null)
const width = ref(720)
let ro = null
onMounted(() => {
  if (!box.value) return
  width.value = box.value.clientWidth || 720
  ro = new ResizeObserver(() => { width.value = box.value?.clientWidth || width.value })
  ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())

const PAD = { l: 50, r: 10, t: 12, b: 26 }
const n = computed(() => Math.max(1, props.labels.length))
const sums = computed(() => props.labels.map((_, i) => {
  let pos = 0
  let neg = 0
  for (const s of props.series) {
    const v = Number(s.values[i] || 0)
    if (s.negative) neg = props.stacked ? neg + v : Math.max(neg, v)
    else pos = props.stacked ? pos + v : Math.max(pos, v)
  }
  return { pos, neg }
}))
function nice(m) {
  if (m <= 0) return 0
  const p = 10 ** Math.floor(Math.log10(m))
  return Math.ceil(m / p) * p
}
const top = computed(() => nice(Math.max(1, ...sums.value.map((s) => s.pos), ...(props.line?.values || []).map((v) => Number(v) || 0))))
const bottom = computed(() => nice(Math.max(0, ...sums.value.map((s) => s.neg), ...(props.line?.values || []).map((v) => -(Number(v) || 0)))))
const plotH = computed(() => props.height - PAD.t - PAD.b)
const y = (v) => PAD.t + ((top.value - v) / (top.value + bottom.value || 1)) * plotH.value
const slot = computed(() => (width.value - PAD.l - PAD.r) / n.value)
const groupW = computed(() => Math.max(3, slot.value * 0.72))
const xOf = (i) => PAD.l + i * slot.value + (slot.value - groupW.value) / 2

const ticks = computed(() => {
  const list = [0, top.value / 2, top.value]
  if (bottom.value) list.push(-bottom.value / 2, -bottom.value)
  return [...new Set(list)].map((v) => ({ v, y: y(v) }))
})
const xTicks = computed(() => {
  const step = Math.max(1, Math.ceil(n.value / Math.max(2, Math.floor((width.value - 80) / 56))))
  return props.labels.map((l, i) => ({ i, l })).filter((t) => t.i % step === 0)
})

// rectangles: 2px gap between stacked segments and between side-by-side bars
const rects = computed(() => {
  const out = []
  const per = props.stacked ? 1 : props.series.filter((s) => !s.negative).length || 1
  props.labels.forEach((_, i) => {
    let up = 0
    let down = 0
    let slotIdx = 0
    props.series.forEach((s) => {
      const v = Number(s.values[i] || 0)
      if (!v) { if (!props.stacked && !s.negative) slotIdx += 1; return }
      const w = props.stacked ? groupW.value : Math.max(2, (groupW.value - 2 * (per - 1)) / per)
      const x0 = props.stacked ? xOf(i) : xOf(i) + slotIdx * (w + 2)
      if (!props.stacked && !s.negative) slotIdx += 1
      if (s.negative) {
        const a = props.stacked ? down : 0
        const y1 = y(-a)
        const y2 = y(-(a + v))
        out.push({ key: `${s.key}-${i}`, x: x0, w, y: y1 + (a ? 1 : 0), h: Math.max(1, y2 - y1 - (a ? 1 : 0)), colour: s.colour, pale: s.pale, i })
        if (props.stacked) down += v
      } else {
        const a = props.stacked ? up : 0
        const y1 = y(a + v)
        const y2 = y(a)
        out.push({ key: `${s.key}-${i}`, x: x0, w, y: y1, h: Math.max(1, y2 - y1 - (a ? 2 : 0)), colour: s.colour, pale: s.pale, i })
        if (props.stacked) up += v
      }
    })
  })
  return out
})
const linePath = computed(() => {
  if (!props.line) return ''
  return props.line.values.map((v, i) => `${i ? 'L' : 'M'}${(xOf(i) + groupW.value / 2).toFixed(1)},${y(Number(v) || 0).toFixed(1)}`).join(' ')
})

const hover = ref(null)
const tip = computed(() => {
  if (hover.value === null) return null
  const i = hover.value
  const cx = xOf(i) + groupW.value / 2
  return {
    left: cx,
    alignRight: cx > width.value / 2,
    title: props.xFormat(props.labels[i], true),
    rows: [
      ...props.series.map((s) => ({ key: s.key, name: s.name, colour: s.colour, v: (s.negative ? -1 : 1) * Number(s.values[i] || 0) })),
      ...(props.line ? [{ key: 'line', name: props.line.name, colour: props.line.colour, v: Number(props.line.values[i] || 0), isLine: true }] : [])
    ]
  }
})
</script>

<template>
  <div ref="box" class="relative w-full select-none">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="block max-w-full" role="img" :aria-label="ariaLabel">
      <g v-for="t in ticks" :key="t.v">
        <line :x1="PAD.l" :x2="width - PAD.r" :y1="t.y" :y2="t.y" :stroke="t.v === 0 ? 'rgba(15,27,45,.3)' : 'rgba(15,27,45,.08)'" />
        <text :x="PAD.l - 8" :y="t.y + 4" text-anchor="end" font-size="11" fill="rgba(15,27,45,.55)" font-family="IBM Plex Mono, monospace">{{ yFormat(t.v) }}</text>
      </g>
      <text v-for="t in xTicks" :key="t.i" :x="xOf(t.i) + groupW / 2" :y="height - 8" text-anchor="middle" font-size="11" fill="rgba(15,27,45,.55)" font-family="IBM Plex Mono, monospace">{{ xFormat(t.l) }}</text>
      <rect v-for="r in rects" :key="r.key" :x="r.x" :y="r.y" :width="r.w" :height="r.h" :rx="Math.min(4, r.w / 2)" :fill="r.colour" :opacity="(r.pale ? 0.45 : 1) * (hover === null || hover === r.i ? 1 : 0.55)" />
      <path v-if="line" :d="linePath" fill="none" :stroke="line.colour" stroke-width="2" stroke-linejoin="round" />
      <template v-if="line">
        <circle v-for="(v, i) in line.values" :key="'lc' + i" :cx="xOf(i) + groupW / 2" :cy="y(Number(v) || 0)" r="3.5" :fill="line.colour" stroke="#fff" stroke-width="2" />
      </template>
      <rect
        v-for="(l, i) in labels"
        :key="'hit' + i"
        :x="PAD.l + i * slot"
        :y="0"
        :width="slot"
        :height="height"
        fill="transparent"
        @mouseenter="hover = i"
        @mouseleave="hover = null"
      />
    </svg>
    <div
      v-if="tip"
      class="absolute top-2 pointer-events-none bg-white rounded-lg px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/10 z-10 min-w-[160px]"
      :style="tip.alignRight ? { right: `${width - tip.left + 10}px` } : { left: `${tip.left + 10}px` }"
    >
      <p class="font-semibold mb-1">{{ tip.title }}</p>
      <p v-for="r in tip.rows" :key="r.key" class="flex items-center gap-2 whitespace-nowrap">
        <span class="inline-block w-2.5 h-2.5 rounded-sm" :style="{ background: r.colour, height: r.isLine ? '2px' : undefined }" />
        <span class="flex-1">{{ r.name }}</span>
        <span class="font-mono">{{ yFormat(r.v) }}</span>
      </p>
    </div>
    <div v-if="series.length > 1 || line" class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px] text-[rgba(15,27,45,.72)]">
      <span v-for="s in series" :key="'lg' + s.key" class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-3 rounded-sm" :style="{ background: s.colour, opacity: s.pale ? 0.45 : 1 }" />{{ s.name }}
      </span>
      <span v-if="line" class="flex items-center gap-1.5"><span class="inline-block w-4 h-0.5" :style="{ background: line.colour }" />{{ line.name }}</span>
    </div>
  </div>
</template>

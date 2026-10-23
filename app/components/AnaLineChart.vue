<!--
  File:      /var/www/VGEpaper/handle/app/components/AnaLineChart.vue
  Repo path: apps/handle/app/components/AnaLineChart.vue        NEW FILE (Phases 1–4)

  Line chart for the Analytics pages: one y-axis, thin 2px lines, legend
  for two or more series, end-of-line labels when there are four or fewer,
  and a hover crosshair with every series' value at that point.

  Props:
    labels   x positions (strings), one per value
    series   [{ key, name, short?, colour, values: [number|null], dashed?, faint? }]
             short: label at the end of the line (default: name, cut to 14 characters)
    yFormat  value -> axis/tooltip text (default: thousands separators)
    xFormat  label -> axis text
    yMax     fixed top of the axis (e.g. 100 for percentages)
    markers  [{ index, text }] vertical notes (e.g. "half of readers by 09:12")
    height   px (default 240)
-->
<script setup>
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  yFormat: { type: Function, default: (v) => Number(v || 0).toLocaleString('en-GB') },
  xFormat: { type: Function, default: (l) => l },
  yMax: { type: Number, default: null },
  markers: { type: Array, default: () => [] },
  height: { type: Number, default: 240 },
  ariaLabel: { type: String, default: 'Line chart' }
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

const labelSpace = computed(() => (props.series.length <= 4 ? 96 : 12))
const PAD = computed(() => ({ l: 46, r: labelSpace.value, t: 12, b: 26 }))
const n = computed(() => Math.max(1, props.labels.length))
const max = computed(() => {
  if (props.yMax) return props.yMax
  const m = Math.max(0, ...props.series.flatMap((s) => s.values.filter((v) => v !== null && v !== undefined)))
  if (m <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(m))
  return Math.ceil(m / p) * p
})
const x = (i) => PAD.value.l + (n.value === 1 ? (width.value - PAD.value.l - PAD.value.r) / 2 : (i * (width.value - PAD.value.l - PAD.value.r)) / (n.value - 1))
const y = (v) => props.height - PAD.value.b - (Math.max(0, v) / max.value) * (props.height - PAD.value.t - PAD.value.b)

const ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: max.value * f, y: y(max.value * f) })))
const xTicks = computed(() => {
  const step = Math.max(1, Math.ceil(n.value / Math.max(2, Math.floor((width.value - 80) / 70))))
  return props.labels.map((l, i) => ({ i, l })).filter((t) => t.i % step === 0)
})
const paths = computed(() => props.series.map((s) => {
  let d = ''
  let pen = false
  s.values.forEach((v, i) => {
    if (v === null || v === undefined) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `
    pen = true
  })
  let last = s.values.length - 1
  while (last >= 0 && (s.values[last] === null || s.values[last] === undefined)) last -= 1
  // a value with no neighbour on either side would be an invisible path: draw it as a dot
  const has = (i) => s.values[i] !== null && s.values[i] !== undefined
  const isolated = s.values.map((v, i) => (has(i) && !has(i - 1) && !has(i + 1) ? { x: x(i), y: y(v) } : null)).filter(Boolean)
  return { ...s, d, isolated, end: last >= 0 ? { x: x(last), y: y(s.values[last]) } : null }
}))
// end labels, nudged apart so they never overlap
const endLabels = computed(() => {
  if (props.series.length > 4) return []
  const short = (t) => (String(t).length > 14 ? `${String(t).slice(0, 13)}…` : String(t))
  const list = paths.value.filter((p) => p.end && !p.faint).map((p) => ({ key: p.key, name: short(p.short || p.name), y: p.end.y, x: p.end.x }))
  list.sort((a, b) => a.y - b.y)
  for (let i = 1; i < list.length; i += 1) if (list[i].y - list[i - 1].y < 13) list[i].y = list[i - 1].y + 13
  // keep the stack inside the plot: if it runs off the bottom, lift it
  const bottom = props.height - PAD.value.b
  const over = list.length ? list[list.length - 1].y - bottom : 0
  if (over > 0) for (const l of list) l.y -= over
  return list
})

const hover = ref(null)
function onMove(e) {
  const r = e.currentTarget.getBoundingClientRect()
  const px = ((e.clientX - r.left) / r.width) * width.value
  const i = Math.round(((px - PAD.value.l) / (width.value - PAD.value.l - PAD.value.r)) * (n.value - 1))
  hover.value = Math.max(0, Math.min(n.value - 1, i))
}
const tip = computed(() => {
  if (hover.value === null) return null
  const i = hover.value
  const left = x(i)
  return {
    left: left > width.value / 2 ? left - 12 : left + 12,
    alignRight: left > width.value / 2,
    title: props.xFormat(props.labels[i], true),
    rows: props.series.map((s) => ({ key: s.key, name: s.name, colour: s.colour, dashed: s.dashed, v: s.values[i] }))
  }
})
</script>

<template>
  <div ref="box" class="relative w-full select-none">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="block max-w-full" role="img" :aria-label="ariaLabel">
      <g>
        <g v-for="t in ticks" :key="t.v">
          <line :x1="PAD.l" :x2="width - PAD.r" :y1="t.y" :y2="t.y" stroke="rgba(15,27,45,.08)" />
          <text :x="PAD.l - 8" :y="t.y + 4" text-anchor="end" font-size="11" fill="rgba(15,27,45,.55)" font-family="IBM Plex Mono, monospace">{{ yFormat(t.v) }}</text>
        </g>
        <text v-for="t in xTicks" :key="t.i" :x="x(t.i)" :y="height - 8" text-anchor="middle" font-size="11" fill="rgba(15,27,45,.55)" font-family="IBM Plex Mono, monospace">{{ xFormat(t.l) }}</text>
      </g>
      <g v-for="m in markers" :key="'m' + m.index">
        <line :x1="x(m.index)" :x2="x(m.index)" :y1="PAD.t" :y2="height - PAD.b" stroke="rgba(15,27,45,.25)" stroke-dasharray="3 3" />
        <text :x="x(m.index) + 5" :y="PAD.t + 10" font-size="11" fill="rgba(15,27,45,.7)">{{ m.text }}</text>
      </g>
      <path
        v-for="p in paths"
        :key="p.key"
        :d="p.d"
        fill="none"
        :stroke="p.colour"
        :stroke-width="p.faint ? 1.5 : 2"
        :stroke-dasharray="p.dashed ? '5 4' : null"
        :opacity="p.faint ? 0.45 : 1"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <template v-for="p in paths" :key="'iso' + p.key">
        <circle v-for="(pt, j) in p.isolated" :key="j" :cx="pt.x" :cy="pt.y" r="4" :fill="p.colour" />
      </template>
      <text v-for="l in endLabels" :key="'e' + l.key" :x="l.x + 6" :y="l.y + 4" font-size="11" font-weight="600" fill="#0f1b2d">{{ l.name }}</text>
      <g v-if="hover !== null">
        <line :x1="x(hover)" :x2="x(hover)" :y1="PAD.t" :y2="height - PAD.b" stroke="rgba(15,27,45,.35)" />
        <template v-for="p in paths" :key="'h' + p.key">
          <circle v-if="p.values[hover] !== null && p.values[hover] !== undefined" :cx="x(hover)" :cy="y(p.values[hover])" r="4.5" :fill="p.colour" stroke="#fff" stroke-width="2" />
        </template>
      </g>
      <rect :x="PAD.l - 10" :y="0" :width="width - PAD.l - PAD.r + 20" :height="height" fill="transparent" @mousemove="onMove" @mouseleave="hover = null" />
    </svg>
    <div
      v-if="tip"
      class="absolute top-2 pointer-events-none bg-white rounded-lg px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/10 z-10 min-w-[150px]"
      :style="tip.alignRight ? { right: `${width - tip.left}px` } : { left: `${tip.left}px` }"
    >
      <p class="font-semibold mb-1">{{ tip.title }}</p>
      <p v-for="r in tip.rows" :key="r.key" class="flex items-center gap-2 whitespace-nowrap">
        <span class="inline-block w-3 h-0.5" :style="{ background: r.colour, opacity: r.dashed ? 0.6 : 1 }" />
        <span class="flex-1">{{ r.name }}</span>
        <span class="font-mono">{{ r.v === null || r.v === undefined ? '—' : yFormat(r.v) }}</span>
      </p>
    </div>
    <div v-if="series.length > 1" class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px] text-[rgba(15,27,45,.72)]">
      <span v-for="s in series" :key="'lg' + s.key" class="flex items-center gap-1.5">
        <svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" :stroke="s.colour" stroke-width="2" :stroke-dasharray="s.dashed ? '4 3' : null" :opacity="s.faint ? 0.5 : 1" /></svg>
        {{ s.name }}
      </span>
    </div>
  </div>
</template>

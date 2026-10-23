<!--
  File:      /var/www/VGEpaper/handle/app/pages/analytics/curve.vue
  Repo path: apps/handle/app/pages/analytics/curve.vue          NEW FILE (Phases 1–4)
  URL:       /analytics/curve?editions=NV:2026-10-22,BK:2026-10-22

  Reader curve for one or two editions: how far readers get (readers on each
  page), how fast an edition is picked up on its release day, and how long
  it keeps being read afterwards. Compared with the publication's average
  over its previous 30 editions.
-->
<script setup>
definePageMeta({ middleware: 'org-rights' })
useHead({ title: 'Reader curve — Analytics — handle' })

const { analytics } = useHandleApi()
const route = useRoute()
const router = useRouter()
const data = ref(null)
const error = ref('')
const loading = ref(false)
const tab = ref('depth')

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.curve(route.query.editions ? String(route.query.editions) : undefined)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'The reader curve could not be loaded.'
  } finally {
    loading.value = false
  }
}
watch(() => route.query.editions, load, { immediate: true })

const pubs = computed(() => data.value?.publications || [])
const colours = computed(() => seriesColours(pubs.value))
const pubName = (code) => pubs.value.find((p) => p.code === code)?.name || code
const eds = computed(() => data.value?.editions || [])
// a second edition of the same paper gets a dashed line in that paper's colour
const styleOf = (i) => ({ colour: colours.value[eds.value[i]?.publication] || '#0f1b2d', dashed: i > 0 && eds.value[i].publication === eds.value[0].publication })
const edLabel = (e) => `${pubName(e.publication)} ${fmtDay(e.date)}`

// pickers
const picks = ref([{ pub: '', date: '' }, { pub: '', date: '' }])
watch(eds, (list) => {
  picks.value = [0, 1].map((i) => ({ pub: list[i]?.publication || '', date: list[i]?.date || '' }))
}, { immediate: true })
const datesFor = (pub) => data.value?.recentEditions?.[pub] || []
function applyPicks() {
  const v = picks.value.filter((p) => p.pub && p.date).map((p) => `${p.pub}:${p.date}`).join(',')
  router.replace({ query: { ...route.query, editions: v || undefined } })
}
function onPub(i) {
  picks.value[i].date = datesFor(picks.value[i].pub)[0] || ''
}

const depthChart = computed(() => {
  const maxPages = Math.max(0, ...eds.value.map((e) => e.pages))
  const labels = Array.from({ length: maxPages }, (_, i) => i + 1)
  const series = eds.value.map((e, i) => ({ key: `e${i}`, name: edLabel(e), ...styleOf(i), values: labels.map((p) => (p <= e.pages ? e.depthPct[p - 1] ?? 0 : null)) }))
  const first = eds.value[0]
  if (first?.average?.editions) {
    series.push({ key: 'avg', name: `${pubName(first.publication)}, average of ${first.average.editions} editions`, colour: colours.value[first.publication], faint: true, dashed: true, values: labels.map((p) => first.average.depthPct[p - 1] ?? null) })
  }
  return { labels, series }
})
const pickupChart = computed(() => ({
  labels: Array.from({ length: 24 }, (_, h) => h),
  series: eds.value.map((e, i) => ({ key: `e${i}`, name: edLabel(e), ...styleOf(i), values: e.pickup.cumulative })),
  markers: eds.value.map((e) => {
    if (!e.pickup.halfBy) return null
    return { index: Number(e.pickup.halfBy.slice(0, 2)), text: `half of ${e.publication} readers by ${e.pickup.halfBy}` }
  }).filter(Boolean)
}))
const lifeChart = computed(() => ({
  labels: Array.from({ length: 14 }, (_, d) => d),
  series: eds.value.map((e, i) => ({ key: `e${i}`, name: edLabel(e), ...styleOf(i), values: e.life.days }))
}))

const facts = computed(() => {
  const list = eds.value
  const f = (k, fn, note) => ({ k, values: list.map(fn), note })
  if (tab.value === 'depth') {
    return [
      f('Readers who opened the edition', (e) => fmtNum(e.readers), 'Front-page previews by readers without access are not included.'),
      f('Median depth', (e) => (e.medianDepth ? `p${e.medianDepth} of ${e.pages}` : '—'), 'Half of readers stop before this page.'),
      f('Reached the last page', (e) => `${e.reachedLast}%`, 'Read the last page for 3 seconds or more.'),
      f('Median time in edition', (e) => fmtMinutes(e.medianMinutes), 'Per reader, all visits added up.')
    ]
  }
  if (tab.value === 'pickup') {
    return [
      f('Readers in the first hour (05:00)', (e) => `${e.pickup.firstHourPct}%`, 'Of the release-day readers.'),
      f('Half of the day’s readers by', (e) => e.pickup.halfBy || '—', 'Kampala time, release day.'),
      f('Peak hour', (e) => e.pickup.peakHour || '—', 'Most first opens.'),
      f('Read after 18:00', (e) => `${e.pickup.eveningPct}%`, 'Of the release-day readers.')
    ]
  }
  return [
    f('Readers after release day', (e) => `${e.life.laterPct}%`, 'Share of the edition’s readers who first came later.'),
    f('Half-life', (e) => (e.life.halfLifeDays === null ? '—' : `${e.life.halfLifeDays} days`), 'Days until daily readers halve.'),
    f('Single-edition purchases', (e) => fmtNum(e.life.singleSales), 'For this edition, so far.'),
    f('Archive visits from search', (e) => `${e.life.fromSearchPct}%`, 'Of visits after the cover days.')
  ]
})

// where readers of the first edition stop
const stops = computed(() => {
  const e = eds.value[0]
  if (!e) return null
  const max = Math.max(1, ...e.depth)
  const openers = new Set(e.sectionStarts.map((s) => s.page))
  const drops = new Set(e.biggestDrops.map((d) => d.page))
  return {
    e,
    bars: e.depth.map((v, i) => ({ page: i + 1, v, h: (v / max) * 140, section: e.sections[i + 1] || '', opener: openers.has(i + 1), drop: drops.has(i + 1) }))
  }
})
const TABS = [
  { key: 'depth', label: 'How far readers get' },
  { key: 'pickup', label: 'How fast it is picked up' },
  { key: 'life', label: 'How long it is read' }
]
</script>

<template>
  <AnalyticsShell title="Reader curve" sub="How far readers get, how fast an edition is picked up, and how long it keeps being read.">
    <template #controls>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="applyPicks">
        <div v-for="(p, i) in picks" :key="i" class="flex items-end gap-2">
          <label>
            <span class="label">{{ i === 0 ? 'Edition' : 'Compare with' }}</span>
            <select v-model="p.pub" class="field" style="width: 190px" @change="onPub(i)">
              <option value="">{{ i === 0 ? 'Choose a paper' : 'Nothing' }}</option>
              <option v-for="x in pubs" :key="x.code" :value="x.code" :disabled="!datesFor(x.code).length">{{ x.name }}{{ datesFor(x.code).length ? '' : ' (no reading yet)' }}</option>
            </select>
          </label>
          <select v-if="p.pub" v-model="p.date" class="field" style="width: 160px" aria-label="Edition date">
            <option v-for="d in datesFor(p.pub)" :key="d" :value="d">{{ fmtDay(d, { weekday: true, year: true }) }}</option>
          </select>
        </div>
        <button class="btn-ink">Show</button>
        <span v-if="loading" class="mono text-[12px] muted">Loading…</span>
      </form>
    </template>

    <p v-if="error" class="notice notice-err">{{ error }}</p>
    <p v-else-if="data && !eds.length" class="notice notice-warn">No edition has been read yet since reading capture started.</p>

    <template v-if="eds.length">
      <section class="panel p-5">
        <div class="seg seg-light" role="tablist" aria-label="Curve">
          <button v-for="t in TABS" :key="t.key" role="tab" class="seg-btn" :class="tab === t.key ? 'seg-on' : ''" :aria-selected="tab === t.key" @click="tab = t.key">{{ t.label }}</button>
        </div>
        <template v-if="tab === 'depth'">
          <h2 class="text-[17px] font-bold mt-4">Readers still reading, page by page</h2>
          <p class="text-[12px] muted">Share of the edition’s readers who read each page (3 seconds or more)</p>
          <AnaLineChart class="mt-3" :labels="depthChart.labels" :series="depthChart.series" :y-max="100" :y-format="(v) => `${Math.round(v)}%`" :x-format="(p, full) => (full ? `Page ${p}` : `p${p}`)" :height="280" aria-label="Readers by page" />
        </template>
        <template v-else-if="tab === 'pickup'">
          <h2 class="text-[17px] font-bold mt-4">Release day: share of the day’s readers who had opened it, by hour</h2>
          <p class="text-[12px] muted">Kampala time; each reader counted at their first open on the release day</p>
          <AnaLineChart class="mt-3" :labels="pickupChart.labels" :series="pickupChart.series" :markers="pickupChart.markers" :y-max="100" :y-format="(v) => `${Math.round(v)}%`" :x-format="(h) => `${String(h).padStart(2, '0')}:00`" :height="280" aria-label="Pickup by hour" />
        </template>
        <template v-else>
          <h2 class="text-[17px] font-bold mt-4">Readers per day after release</h2>
          <p class="text-[12px] muted">Day 0 is the first day the edition covers</p>
          <AnaLineChart class="mt-3" :labels="lifeChart.labels" :series="lifeChart.series" :x-format="(d, full) => (full ? `Day ${d}` : `d${d}`)" :height="280" aria-label="Readers per day after release" />
        </template>

        <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
          <div v-for="f in facts" :key="f.k" class="rounded-xl p-3" style="background: rgba(15,27,45,.03)">
            <p class="mono text-[11px] muted">{{ f.k }}</p>
            <p v-for="(v, i) in f.values" :key="i" class="flex items-baseline gap-2 mt-1">
              <span class="text-[20px] font-extrabold">{{ v }}</span>
              <span class="text-[12px] muted">{{ edLabel(eds[i]) }}</span>
            </p>
            <p class="text-[11px] faint mt-1">{{ f.note }}</p>
          </div>
        </div>
      </section>

      <section v-if="stops" class="panel p-5" aria-labelledby="stops-h">
        <h2 id="stops-h" class="text-[17px] font-bold">Where {{ pubName(stops.e.publication) }} readers stop — readers on each page, {{ fmtDay(stops.e.date) }}</h2>
        <div class="overflow-x-auto mt-3">
          <svg :width="Math.max(600, stops.bars.length * 22 + 20)" height="190" role="img" aria-label="Readers on each page">
            <g v-for="(b, i) in stops.bars" :key="b.page">
              <rect
                :x="10 + i * 22"
                :y="160 - b.h"
                width="18"
                :height="Math.max(1, b.h)"
                rx="3"
                :fill="b.drop ? '#e34948' : colours[stops.e.publication]"
                :opacity="b.drop || b.opener ? 1 : 0.5"
              ><title>Page {{ b.page }}{{ b.section ? ` · ${b.section}` : '' }}: {{ b.v }} readers</title></rect>
              <text :x="10 + i * 22 + 9" y="176" text-anchor="middle" font-size="10" fill="rgba(15,27,45,.55)" font-family="IBM Plex Mono, monospace">{{ b.page }}</text>
            </g>
          </svg>
        </div>
        <p class="text-[12px] muted mt-2">
          <strong>Darker bars</strong> = section openers
          <template v-if="stops.e.sectionStarts.length">({{ stops.e.sectionStarts.map((s) => `${s.section} p${s.page}`).join(', ') }})</template>.
          <template v-if="stops.e.biggestDrops.length">
            <strong style="color: #e34948">Red</strong> = largest drop-offs: {{ stops.e.biggestDrops.map((d) => `p${d.page} (${d.change}%)`).join(', ') }}.
          </template>
        </p>
      </section>
    </template>
  </AnalyticsShell>
</template>

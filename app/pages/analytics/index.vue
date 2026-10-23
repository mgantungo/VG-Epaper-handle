<!--
  File:      /var/www/VGEpaper/handle/app/pages/analytics/index.vue
  Repo path: apps/handle/app/pages/analytics/index.vue          NEW FILE (Phases 1–4)
  URL:       /analytics?from=&to=

  Analytics overview: active readers and growth per publication, paying
  readers, subscriber gains and losses by month, who is reading (how they
  get access), when they read, and organisations at risk of not renewing.
  canManageOrganizations only (agreed 23 Oct 2026).
-->
<script setup>
definePageMeta({ middleware: 'org-rights' })
useHead({ title: 'Analytics — handle' })

const { analytics } = useHandleApi()
const range = useAnaRange('month')
const data = ref(null)
const error = ref('')
const loading = ref(false)
const view = ref('range') // 'range' | 'year'

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.overview(range.value)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Analytics could not be loaded.'
  } finally {
    loading.value = false
  }
}
watch(range, load, { immediate: true })

const pubs = computed(() => data.value?.publications || [])
const colours = computed(() => seriesColours(pubs.value))
const pubName = (code) => pubs.value.find((p) => p.code === code)?.name || code
// papers with any readers or payers in the range, in handle's order
const shown = computed(() => {
  const d = data.value
  if (!d) return []
  return pubs.value.filter((p) => d.byPublication.find((x) => x.code === p.code)?.readers || d.paying.find((x) => x.code === p.code)?.total)
})
const now = computed(() => data.value?.kpis?.now || {})
const before = computed(() => data.value?.kpis?.previous || {})

const growth = computed(() => {
  const d = data.value
  if (!d) return null
  if (view.value === 'year') {
    return {
      title: 'Monthly active readers — last 12 months',
      sub: 'Distinct readers each month, per publication and in total',
      labels: d.monthly.months,
      xFormat: (m, full) => fmtMonth(m, full),
      series: [
        ...shown.value.map((p) => ({ key: p.code, name: p.name, short: p.code, colour: colours.value[p.code], values: d.monthly.series[p.code] || [] })),
        { key: 'all', name: 'All papers', colour: '#0f1b2d', values: d.monthly.total, dashed: false }
      ]
    }
  }
  return {
    title: 'Daily active readers',
    sub: `${fmtRange(d.range)} · dashed: all papers in the previous ${d.daily.dates.length} days`,
    labels: d.daily.dates,
    xFormat: (iso, full) => fmtDay(iso, { weekday: full }),
    series: [
      ...shown.value.map((p) => ({ key: p.code, name: p.name, short: p.code, colour: colours.value[p.code], values: d.daily.series[p.code] || [] })),
      { key: 'all', name: 'All papers', colour: '#0f1b2d', values: d.daily.total },
      { key: 'prev', name: 'All papers, previous period', colour: '#0f1b2d', values: d.daily.previousTotal, dashed: true, faint: true }
    ]
  }
})

const flowChart = computed(() => {
  const d = data.value
  if (!d) return null
  const series = []
  for (const p of shown.value) {
    const f = d.flow.byPub[p.code]
    if (!f) continue
    series.push({ key: `${p.code}-new`, name: `${p.code} new`, colour: colours.value[p.code], values: f.new })
  }
  for (const p of shown.value) {
    const f = d.flow.byPub[p.code]
    if (!f) continue
    series.push({ key: `${p.code}-lapsed`, name: `${p.code} lapsed`, colour: colours.value[p.code], values: f.lapsed, negative: true, pale: true })
  }
  return { labels: d.flow.months, series, line: { name: 'Net change, all papers', colour: '#0f1b2d', values: d.flow.net } }
})

const hours = computed(() => {
  const d = data.value
  if (!d) return null
  return shown.value.map((p) => ({ key: p.code, name: p.name, short: p.code, colour: colours.value[p.code], values: d.hours.series[p.code] || [] }))
})
const peakHour = computed(() => {
  const d = data.value
  if (!d) return null
  const total = d.hours.hours.map((h) => shown.value.reduce((a, p) => a + (d.hours.series[p.code]?.[h] || 0), 0))
  const max = Math.max(...total)
  return max ? `${String(total.indexOf(max)).padStart(2, '0')}:00` : null
})
const payingCards = computed(() => (data.value?.paying || []).filter((p) => p.total > 0))
</script>

<template>
  <AnalyticsShell title="Analytics overview" :sub="data ? `${fmtRange(data.range)} · compared with ${fmtRange(data.previous)}` : ''">
    <template #controls>
      <AnaRangePicker v-model="range" />
      <span v-if="loading" class="mono text-[12px] muted">Loading…</span>
    </template>

    <p v-if="error" class="notice notice-err">{{ error }}</p>

    <template v-if="data">
      <div class="flex flex-wrap gap-3">
        <AnaStat label="Daily active readers (average)" :value="fmtNum(now.dailyActiveAvg)" :change="delta(now.dailyActiveAvg, before.dailyActiveAvg)" :note="!before.dailyActiveAvg ? 'no earlier period to compare' : 'vs previous period'" />
        <AnaStat label="Active readers in the range" :value="fmtNum(now.activeReaders)" :change="delta(now.activeReaders, before.activeReaders)" :note="`${fmtNum(now.signedIn)} signed in · ${fmtNum(now.anonymous)} not signed in`" edge="#22b389" />
        <AnaStat v-for="p in payingCards" :key="p.code" :label="`Paying for ${pubName(p.code)}`" :value="fmtNum(p.total)" :note="`${fmtNum(p.personal)} personal · ${fmtNum(p.org)} org seats · on ${fmtDay(data.range.to)}`" :edge="colours[p.code]" />
        <AnaStat label="Reading time per reader" :value="fmtMinutes(now.minutesPerReader)" :change="delta(now.minutesPerReader, before.minutesPerReader)" edge="#f0a42f" />
        <AnaStat label="Stickiness (daily ÷ range)" :value="`${now.stickiness}%`" :change="before.activeReaders ? delta(now.stickiness, before.stickiness, { points: true }) : null" note="share of readers who come back day after day" edge="rgba(15,27,45,.2)" />
      </div>

      <section class="panel p-5" aria-labelledby="growth-h">
        <div class="flex flex-wrap justify-between gap-3 items-start">
          <div>
            <h2 id="growth-h" class="text-[17px] font-bold">{{ growth.title }}</h2>
            <p class="text-[12px] muted">{{ growth.sub }}</p>
          </div>
          <div class="seg seg-light" role="group" aria-label="Period">
            <button class="seg-btn" :class="view === 'range' ? 'seg-on' : ''" @click="view = 'range'">Selected range</button>
            <button class="seg-btn" :class="view === 'year' ? 'seg-on' : ''" @click="view = 'year'">12 months</button>
          </div>
        </div>
        <AnaLineChart class="mt-3" :labels="growth.labels" :series="growth.series" :x-format="growth.xFormat" :height="260" aria-label="Active readers" />
      </section>

      <div class="grid lg:grid-cols-2 gap-4">
        <section class="panel p-5" aria-labelledby="flow-h">
          <h2 id="flow-h" class="text-[17px] font-bold">Paying readers gained and lost, by month</h2>
          <p class="text-[12px] muted">New paying readers above the line, lapsed below (pale); line = net change. Personal subscriptions and organisation seats.</p>
          <AnaBarChart class="mt-3" :labels="flowChart.labels" :series="flowChart.series" :line="flowChart.line" :x-format="(m, full) => fmtMonth(m, full)" :y-format="(v) => fmtNum(v)" :height="250" aria-label="Paying readers gained and lost" />
        </section>

        <section class="panel p-5" aria-labelledby="who-h">
          <h2 id="who-h" class="text-[17px] font-bold">Who is reading</h2>
          <p class="text-[12px] muted">Readers of each paper in the range, by how they get access</p>
          <ul class="mt-4 flex flex-col gap-4">
            <li v-for="w in data.who.filter((x) => x.readers)" :key="w.code">
              <p class="flex justify-between text-[13px]"><span class="font-semibold">{{ pubName(w.code) }}</span><span class="mono muted">{{ fmtNum(w.readers) }} readers</span></p>
              <div class="flex h-4 mt-1.5 gap-[2px]" role="img" :aria-label="`${w.personalPct}% personal, ${w.organisationPct}% organisation, ${w.previewPct}% preview only`">
                <span v-if="w.personal" class="rounded-l" :style="{ width: `${w.personalPct}%`, background: colours[w.code] }" />
                <span v-if="w.organisation" :style="{ width: `${w.organisationPct}%`, background: colours[w.code], opacity: 0.55 }" />
                <span v-if="w.preview" class="rounded-r" :style="{ width: `${w.previewPct}%`, background: 'rgba(15,27,45,.12)' }" />
              </div>
              <p class="mono text-[11px] muted mt-1">{{ w.personalPct }}% personal · {{ w.organisationPct }}% organisation · {{ w.previewPct }}% front page only, not paying</p>
            </li>
            <li v-if="!data.who.some((x) => x.readers)" class="text-[13px] muted">No reading recorded in this range.</li>
          </ul>
          <p v-if="data.crossSell" class="notice notice-warn mt-4">
            {{ fmtNum(data.crossSell.readers) }} {{ data.crossSell.readers === 1 ? 'reader who only previews' : 'readers who only preview' }} {{ pubName(data.crossSell.previewing) }} already pay for {{ pubName(data.crossSell.payingFor) }} — the largest cross-sell group.
          </p>
        </section>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <section class="panel p-5" aria-labelledby="hours-h">
          <h2 id="hours-h" class="text-[17px] font-bold">When people read</h2>
          <p class="text-[12px] muted">Readers by hour of day, Kampala time<template v-if="peakHour"> · busiest hour {{ peakHour }}</template></p>
          <AnaLineChart class="mt-3" :labels="data.hours.hours" :series="hours" :x-format="(h) => `${String(h).padStart(2, '0')}:00`" :height="220" aria-label="Readers by hour" />
        </section>

        <section class="panel p-5" aria-labelledby="bypub-h">
          <h2 id="bypub-h" class="text-[17px] font-bold">By publication</h2>
          <div class="table-scroll mt-2">
            <table class="otable">
              <thead><tr><th>Publication</th><th class="text-right">Readers</th><th class="text-right">Pages read</th><th class="text-right">Reading time</th><th class="text-right">Stories opened</th></tr></thead>
              <tbody>
                <tr v-for="p in data.byPublication.filter((x) => x.readers)" :key="p.code">
                  <td><span class="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" :style="{ background: colours[p.code] }" />{{ pubName(p.code) }}</td>
                  <td class="text-right mono">{{ fmtNum(p.readers) }}</td>
                  <td class="text-right mono">{{ fmtNum(p.pagesRead) }}</td>
                  <td class="text-right mono">{{ fmtMinutes(p.minutes) }}</td>
                  <td class="text-right mono">{{ fmtNum(p.stories) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[12px] muted mt-3">
            Devices:
            <template v-for="(d, i) in data.devices" :key="d.device">{{ i ? ' · ' : '' }}{{ d.device }} {{ fmtNum(d.readers) }}</template>
          </p>
        </section>
      </div>

      <section class="panel p-5" aria-labelledby="risk-h">
        <h2 id="risk-h" class="text-[17px] font-bold">Organisations most at risk of not renewing</h2>
        <p class="text-[12px] muted">Current contracts with the lowest seat use: seats that opened their paper in the 30 days to {{ fmtDay(data.range.to) }}</p>
        <div class="table-scroll mt-2">
          <table class="otable">
            <thead><tr><th>Organisation</th><th>Paper</th><th class="text-right">Seat use</th><th>Ends</th></tr></thead>
            <tbody>
              <tr v-for="o in data.atRisk" :key="`${o.orgId}-${o.publication}-${o.start}`" class="clickable" @click="navigateTo(`/organisations/${o.orgId}?tab=usage`)">
                <td class="font-semibold">{{ o.orgName }}</td>
                <td><span class="chip" :style="{ background: `${colours[o.publication]}22`, color: '#0f1b2d' }">{{ o.publication }}</span></td>
                <td class="text-right mono" :style="{ color: o.usePct < 40 ? '#b3261e' : undefined }">{{ o.usePct }}% of {{ o.seats || o.holders }}</td>
                <td class="mono">{{ fmtDay(o.end, { year: true }) }}</td>
              </tr>
              <tr v-if="!data.atRisk.length"><td colspan="4" class="muted">No current organisation contracts.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </AnalyticsShell>
</template>

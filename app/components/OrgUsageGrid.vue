<!--
  File:      /var/www/VGEpaper/handle/app/components/OrgUsageGrid.vue
  Repo path: apps/handle/app/components/OrgUsageGrid.vue        NEW FILE (Phases 1–4)

  The Usage tab of a handle organisation page: for one month, which days
  each member was active and which of the organisation's papers they opened,
  seat use per paper, active members per day and seat use month by month.
  The Org Admin sees the same tab (web /organisation) without the links;
  here a member's name opens their reader analytics page.
  A day counts when the member signed in or read anything that day
  (Kampala time). A paper counts when opened with access.
-->
<script setup>
const props = defineProps({ orgId: { type: [String, Number], required: true } })
const { analytics } = useHandleApi()

const data = ref(null)
const error = ref('')
const loading = ref(false)
const onlyPub = ref('')

async function load(month) {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.orgUsage(props.orgId, month)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Usage could not be loaded.'
  } finally {
    loading.value = false
  }
}
onMounted(() => load())

const pubs = computed(() => data.value?.publications || [])
const allPubsRes = ref([])
onMounted(async () => {
  try { allPubsRes.value = (await useHandleApi().catalogue.publications()).publications || [] } catch { allPubsRes.value = [] }
})
const colours = computed(() => seriesColours(allPubsRes.value.length ? allPubsRes.value : pubs.value))
const colourOf = (c) => colours.value[c] || '#64748b'
const nameOf = (c) => pubs.value.find((p) => p.code === c)?.name || c
const dates = computed(() => data.value?.daily?.dates || [])
const monthChoices = computed(() => (data.value?.months || []).slice(0, 6).reverse())
const k = computed(() => data.value?.kpis || {})
const prevLabel = computed(() => {
  if (!data.value) return ''
  const [y, m] = data.value.month.split('-').map(Number)
  return fmtMonth(new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7))
})
const head = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return { n: d.getUTCDate(), w: 'SMTWTFS'[d.getUTCDay()], weekend: d.getUTCDay() % 6 === 0 }
}
const members = computed(() => (data.value?.members || [])
  .filter((m) => !onlyPub.value || m.seatPublications.includes(onlyPub.value))
  .sort((a, b) => b.daysActive - a.daysActive || a.name.localeCompare(b.name)))

function cellStyle(papers) {
  if (!papers) return { background: 'rgba(15,27,45,.05)' }
  const list = onlyPub.value ? papers.filter((c) => c === onlyPub.value) : papers
  if (!list.length) return { background: '#cbd5e1' }
  if (list.length === 1) return { background: colourOf(list[0]) }
  const step = 100 / list.length
  return { background: `linear-gradient(135deg,${list.map((c, i) => `${colourOf(c)} ${i * step}% ${(i + 1) * step}%`).join(',')})` }
}
const cellTitle = (m, iso, papers) => `${m.name}, ${fmtDay(iso, { weekday: true })}: ${!papers ? 'not active' : papers.length ? papers.map(nameOf).join(' and ') : 'signed in'}`
const lastSeen = (s) => (s ? `${fmtDay(s.slice(0, 10))}, ${s.slice(11)}` : 'Never')

const dailyChart = computed(() => {
  const d = data.value
  if (!d) return null
  return {
    labels: d.daily.dates,
    series: [
      { key: 'active', name: 'Active members', colour: '#0f1b2d', values: d.daily.active },
      ...pubs.value.map((p) => ({ key: p.code, name: `Opened ${p.name}`, colour: colourOf(p.code), values: d.daily.series[p.code] || [] }))
    ]
  }
})
const historyChart = computed(() => {
  const d = data.value
  if (!d) return null
  return { labels: d.history.months, series: pubs.value.map((p) => ({ key: p.code, name: p.name, colour: colourOf(p.code), values: d.history.series[p.code] || [] })) }
})

function exportCsv() {
  const d = data.value
  downloadCsv(`usage-${d.organisation.name}-${d.month}.csv`, [
    ['Member', 'Email', 'Seat papers', ...dates.value, 'Days active', ...pubs.value.map((p) => `${p.code} days`), 'Last seen'],
    ...members.value.map((m) => [m.name, m.email, m.seatPublications.join(' '), ...dates.value.map((x) => (m.days[x] ? (m.days[x].join('+') || 'signed in') : '')), m.daysActive, ...pubs.value.map((p) => m.perPublication[p.code] || 0), m.lastSeen || 'never'])
  ])
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-3 items-center justify-between">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="seg seg-light" role="group" aria-label="Month">
          <button v-for="m in monthChoices" :key="m" class="seg-btn" :class="data?.month === m ? 'seg-on' : ''" @click="load(m)">{{ fmtMonth(m, data?.month === m) }}</button>
        </div>
        <div v-if="pubs.length > 1" class="seg seg-light" role="group" aria-label="Paper">
          <button class="seg-btn" :class="!onlyPub ? 'seg-on' : ''" @click="onlyPub = ''">All papers</button>
          <button v-for="p in pubs" :key="p.code" class="seg-btn" :class="onlyPub === p.code ? 'seg-on' : ''" @click="onlyPub = p.code">{{ p.name }}</button>
        </div>
        <span v-if="loading" class="mono text-[12px] muted">Loading…</span>
      </div>
      <button v-if="data" class="btn-ghost" @click="exportCsv">Download (CSV)</button>
    </div>

    <p v-if="error" class="notice notice-err">{{ error }}</p>

    <template v-if="data">
      <div class="flex flex-wrap gap-3">
        <AnaStat label="Members active this month" :value="k.activeMembers" :unit="`of ${k.members}`" :change="k.previousActiveMembers ? { text: `${k.activeMembers >= k.previousActiveMembers ? '▲' : '▼'} ${Math.abs(k.activeMembers - k.previousActiveMembers)} vs ${prevLabel}`, dir: k.activeMembers >= k.previousActiveMembers ? 'up' : 'down' } : null" />
        <AnaStat label="Average days active" :value="k.averageDays" :unit="`of ${k.daysSoFar} days`" :change="k.previousAverageDays ? { text: `${k.averageDays >= k.previousAverageDays ? '▲' : '▼'} ${Math.abs(Math.round((k.averageDays - k.previousAverageDays) * 10) / 10)} days vs ${prevLabel}`, dir: k.averageDays >= k.previousAverageDays ? 'up' : 'down' } : null" edge="#22b389" />
        <AnaStat v-for="s in data.seatUse" :key="s.code" :label="`${nameOf(s.code)} seat use`" :value="`${s.usePct}%`" :note="`${s.used} of ${s.seats || s.holders} ${s.code} seats opened ${s.code}`" :edge="colourOf(s.code)" />
        <AnaStat label="Never signed in" :value="k.neverSignedIn" :note="k.invitesPending ? `${k.invitesPending} invite${k.invitesPending === 1 ? '' : 's'} not yet accepted` : ''" edge="#f0a42f" />
      </div>

      <section class="panel p-4" aria-labelledby="grid-h">
        <div class="flex flex-wrap justify-between gap-3 items-baseline">
          <h3 id="grid-h" class="text-[15px] font-bold">Who signed in, and which paper they opened</h3>
          <div class="flex flex-wrap gap-3 text-[12px] muted">
            <span v-for="p in pubs" :key="p.code" class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-sm inline-block" :style="{ background: colourOf(p.code) }" />{{ p.name }}</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-sm inline-block" style="background: #cbd5e1" />Signed in only</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-sm inline-block" style="background: rgba(15,27,45,.05)" />Not active</span>
          </div>
        </div>
        <div class="overflow-x-auto mt-3">
          <table class="border-separate text-[12px]" style="border-spacing: 3px">
            <thead>
              <tr>
                <th class="text-left min-w-[180px] pl-1 font-medium muted">Member</th>
                <th v-for="d in dates" :key="d" class="mono font-medium text-[10px] w-6 text-center" :style="{ color: head(d).weekend ? '#0f1b2d' : 'rgba(15,27,45,.55)' }">{{ head(d).n }}<br>{{ head(d).w }}</th>
                <th class="pl-2 font-medium muted">Days</th>
                <th v-for="p in pubs" :key="p.code" class="mono font-medium muted px-1">{{ p.code }}</th>
                <th class="text-left pl-2 font-medium muted">Last seen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in members" :key="m.seatId">
                <td class="pr-2 pl-1 whitespace-nowrap">
                  <NuxtLink :to="{ path: `/analytics/readers/${m.userId}`, query: { from: data.from, to: data.to } }" class="font-semibold" style="color: var(--ink)">{{ m.name }}</NuxtLink>
                  <span v-if="m.role === 'admin'" class="ml-1 text-[10px] muted">admin</span>
                  <span class="block mono text-[10px] muted">{{ m.seatPublications.join(' · ') || 'no paper' }}<template v-if="m.status === 'suspended'"> · suspended</template></span>
                </td>
                <td v-for="d in dates" :key="d" class="w-6 h-6 rounded" :style="cellStyle(m.days[d])" :title="cellTitle(m, d, m.days[d])"><span class="sr-only">{{ cellTitle(m, d, m.days[d]) }}</span></td>
                <td class="pl-2 text-center mono font-semibold">{{ m.daysActive }}</td>
                <td v-for="p in pubs" :key="p.code" class="text-center mono">{{ m.perPublication[p.code] || 0 }}</td>
                <td class="pl-2 whitespace-nowrap muted">{{ lastSeen(m.lastSeen) }}</td>
              </tr>
              <tr v-if="!members.length"><td :colspan="dates.length + pubs.length + 3" class="py-4 muted">No members.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid lg:grid-cols-2 gap-4">
        <section class="panel p-4" aria-labelledby="daily-h">
          <h3 id="daily-h" class="text-[15px] font-bold">Active members per day</h3>
          <AnaLineChart class="mt-2" :labels="dailyChart.labels" :series="dailyChart.series" :x-format="(iso, full) => fmtDay(iso, { weekday: full })" :height="210" aria-label="Active members per day" />
        </section>
        <section class="panel p-4" aria-labelledby="hist-h">
          <h3 id="hist-h" class="text-[15px] font-bold">Seat use, month by month</h3>
          <p class="text-[12px] muted">Share of paid seats that opened their paper at least once; a line starts when the paper was first paid for</p>
          <AnaLineChart class="mt-2" :labels="historyChart.labels" :series="historyChart.series" :y-max="100" :y-format="(v) => `${Math.round(v)}%`" :x-format="(m, full) => fmtMonth(m, full)" :height="190" aria-label="Seat use by month" />
        </section>
      </div>
      <p class="text-[12px] faint">The organisation's admins see the same Usage tab on the e-paper site, without the links to each reader: days and papers only, never pages or stories.</p>
    </template>
  </div>
</template>

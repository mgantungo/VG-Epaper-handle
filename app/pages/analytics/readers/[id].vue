<!--
  File:      /var/www/VGEpaper/handle/app/pages/analytics/readers/[id].vue
  Repo path: apps/handle/app/pages/analytics/readers/[id].vue   NEW FILE (Phases 1–4)
  URL:       /analytics/readers/:userId?from=&to=

  One reader, for handle admins only: what they can read and how (personal
  subscriptions or organisation seat), days active, editions, pages,
  reading time, minutes per day per paper, sections, stories opened and
  their reading sessions. Readers in an organisation and readers on their
  own have the same page. Organisation admins never see this.
-->
<script setup>
definePageMeta({ middleware: 'org-rights' })

const { analytics } = useHandleApi()
const route = useRoute()
const range = useAnaRange('month')
const data = ref(null)
const error = ref('')
const loading = ref(false)
const allStories = ref(false)

useHead(() => ({ title: `${data.value?.user?.name || data.value?.user?.email || 'Reader'} — Analytics — handle` }))

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.reader(route.params.id, range.value)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'This reader could not be loaded.'
  } finally {
    loading.value = false
  }
}
watch([range, () => route.params.id], load, { immediate: true })

const pubs = computed(() => data.value?.publications || [])
const colours = computed(() => seriesColours(pubs.value))
const pubName = (code) => pubs.value.find((p) => p.code === code)?.name || code
const k = computed(() => data.value?.kpis || {})
const today = kampalaToday()

// what this reader can read: personal subscriptions and organisation seat
const accessChips = computed(() => {
  const a = data.value?.access
  if (!a) return []
  const out = []
  for (const p of a.personal || []) {
    if (p.end >= today) out.push({ code: p.publication, text: `${p.publication} · personal · ${p.start > today ? `from ${fmtDay(p.start)}` : `to ${fmtDay(p.end, { year: true })}`}` })
  }
  const o = a.org
  if (o?.usable) {
    for (const c of o.contracts || []) {
      if (c.end < today) continue
      if (o.seatPublications && !o.seatPublications.includes(c.publication)) continue
      out.push({ code: c.publication, text: `${c.publication} · via organisation · to ${fmtDay(c.end, { year: true })}` })
    }
  }
  return out
})
const editionsNote = computed(() => Object.entries(k.value.editionsByPublication || {}).map(([c, n]) => `${c} ${n}`).join(' · '))
const minutesChart = computed(() => {
  const d = data.value
  if (!d) return null
  return {
    labels: d.daily.dates,
    series: Object.keys(d.daily.series).map((c) => ({ key: c, name: pubName(c), colour: colours.value[c], values: d.daily.series[c] }))
  }
})
const maxSection = computed(() => Math.max(1, ...(data.value?.sections || []).map((s) => s.minutes)))
const stories = computed(() => (allStories.value ? data.value?.stories : data.value?.stories?.slice(0, 8)) || [])
</script>

<template>
  <AnalyticsShell :title="data?.user?.name || data?.user?.email || 'Reader'" crumb="Analytics › Readers ›">
    <template #crumb>
      <NuxtLink :to="{ path: '/analytics/readers', query: { from: range.from, to: range.to } }" style="color: inherit">Analytics › Readers ›</NuxtLink>
    </template>
    <template #hero>
      <div v-if="data" class="flex flex-wrap gap-2 mt-2 items-center">
        <span class="mono text-[12px] muted">{{ data.user.email }}</span>
        <span v-if="data.access?.org" class="chip chip-grey">{{ data.access.org.orgName }} · {{ data.access.org.role }}<template v-if="!data.access.org.usable"> · {{ data.access.org.orgStatus }}</template></span>
        <span v-for="c in accessChips" :key="c.text" class="chip" :style="{ background: `${colours[c.code] || '#64748b'}22`, color: '#0f1b2d' }">{{ c.text }}</span>
        <span v-if="!accessChips.length" class="chip chip-amber">Not paying for anything today</span>
        <span class="chip chip-red">Visible to handle admins only</span>
      </div>
    </template>
    <template #controls>
      <AnaRangePicker v-model="range" />
      <span v-if="loading" class="mono text-[12px] muted">Loading…</span>
    </template>

    <p v-if="error" class="notice notice-err">{{ error }}</p>

    <template v-if="data">
      <div class="flex flex-wrap gap-3">
        <AnaStat label="Days active" :value="k.daysActive" :unit="`of ${k.daysInRange}`" />
        <AnaStat label="Editions opened" :value="k.editionsOpened" :note="editionsNote" edge="#22b389" />
        <AnaStat label="Pages read (3 s or more)" :value="fmtNum(k.pagesRead)" edge="rgba(15,27,45,.2)" />
        <AnaStat label="Reading time" :value="fmtMinutes(k.minutes)" :note="`${k.minutesPerActiveDay} min a day active`" edge="#f0a42f" />
        <AnaStat label="Stories opened" :value="fmtNum(k.storiesOpened)" edge="#6250d6" />
        <AnaStat label="Last seen" :value="k.lastSeen ? fmtDay(k.lastSeen.slice(0, 10)) : 'Never'" :note="k.lastSeen ? `${k.lastSeen.slice(11)} · ${k.lastDevice || ''}` : ''" edge="rgba(15,27,45,.2)" />
      </div>

      <div class="grid lg:grid-cols-[2fr_1fr] gap-4">
        <section class="panel p-5" aria-labelledby="min-h">
          <h2 id="min-h" class="text-[17px] font-bold">Minutes read per day</h2>
          <p class="text-[12px] muted">Per paper, Kampala days</p>
          <AnaLineChart v-if="minutesChart.series.length" class="mt-3" :labels="minutesChart.labels" :series="minutesChart.series" :x-format="(iso, full) => fmtDay(iso, { weekday: full })" :y-format="(v) => `${Math.round(v * 10) / 10}`" :height="220" aria-label="Minutes read per day" />
          <p v-else class="text-[13px] muted mt-3">Nothing read in this range.</p>
        </section>
        <section class="panel p-5" aria-labelledby="secs-h">
          <h2 id="secs-h" class="text-[17px] font-bold">Sections read</h2>
          <ul class="mt-3 flex flex-col gap-2">
            <li v-for="s in data.sections.slice(0, 12)" :key="`${s.publication}-${s.name}`" class="grid grid-cols-[1fr_auto] gap-x-3 text-[13px]">
              <span class="truncate"><span class="font-semibold">{{ s.name }}</span> <span class="mono text-[11px] muted">{{ s.publication }}</span></span>
              <span class="mono text-[12px]">{{ s.minutes }} min</span>
              <span class="col-span-2 h-1.5 rounded mt-1" :style="{ width: `${Math.max(2, (s.minutes / maxSection) * 100)}%`, background: colours[s.publication] }" />
            </li>
            <li v-if="!data.sections.length" class="text-[13px] muted">None.</li>
          </ul>
        </section>
      </div>

      <section class="panel p-5" aria-labelledby="st-h">
        <h2 id="st-h" class="text-[17px] font-bold">Stories opened</h2>
        <div class="table-scroll mt-2">
          <table class="otable">
            <thead><tr><th>When</th><th>Paper · page</th><th>Headline</th><th>Section</th><th class="text-right">Read for</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in stories" :key="i">
                <td class="mono whitespace-nowrap">{{ fmtDay(s.at.slice(0, 10)) }} {{ s.at.slice(11) }}</td>
                <td class="mono whitespace-nowrap">{{ s.publication }} {{ fmtDay(s.editionDate) }}<template v-if="s.page"> · p{{ s.page }}</template></td>
                <td class="font-semibold">{{ s.headline }}</td>
                <td>{{ s.section || '—' }}</td>
                <td class="text-right mono">{{ s.seconds === null ? '—' : fmtSeconds(s.seconds) }}</td>
              </tr>
              <tr v-if="!stories.length"><td colspan="5" class="muted">No stories opened in this range.</td></tr>
            </tbody>
          </table>
        </div>
        <button v-if="!allStories && data.stories.length > 8" class="btn-soft mt-3" @click="allStories = true">All {{ data.stories.length }} stories</button>
      </section>

      <section class="panel p-5" aria-labelledby="ses-h">
        <h2 id="ses-h" class="text-[17px] font-bold">Sessions</h2>
        <p class="text-[12px] muted">A session ends after 30 minutes without activity. Latest 40.</p>
        <div class="table-scroll mt-2">
          <table class="otable">
            <thead><tr><th>Started</th><th>Paper and edition</th><th class="text-right">Pages read</th><th class="text-right">Deepest page</th><th class="text-right">Length</th><th>Device</th><th>Came in by</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in data.sessions" :key="s.sessionId || i">
                <td class="mono whitespace-nowrap">{{ fmtDay(s.started.slice(0, 10)) }} {{ s.started.slice(11) }}</td>
                <td>
                  <template v-if="s.publication">{{ pubName(s.publication) }} · {{ fmtDay(s.editionDate) }}<span v-if="s.archive" class="chip chip-blue ml-1">archive</span></template>
                  <span v-else class="muted">Signed in, no edition read</span>
                </td>
                <td class="text-right mono">{{ s.pagesRead }}</td>
                <td class="text-right mono">{{ s.deepestPage ? `${s.deepestPage}${s.pages ? ` of ${s.pages}` : ''}` : '—' }}</td>
                <td class="text-right mono">{{ s.minutes }} min</td>
                <td class="whitespace-nowrap">{{ s.device || '—' }}</td>
                <td>{{ s.cameInBy }}</td>
              </tr>
              <tr v-if="!data.sessions.length"><td colspan="7" class="muted">No sessions in this range.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </AnalyticsShell>
</template>

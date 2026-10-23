<!--
  File:      /var/www/VGEpaper/handle/app/pages/analytics/sections.vue
  Repo path: apps/handle/app/pages/analytics/sections.vue       NEW FILE (Phases 1–4)
  URL:       /analytics/sections?publication=NV&from=&to=&section=

  Which sections of a publication were read most in a date range, and by
  whom: readers and median minutes per section, how those readers get
  access, the organisations and readers who read a section most, section
  readers by day, and the most-read stories. Section names come from each
  page's section field set at ingest.
-->
<script setup>
definePageMeta({ middleware: 'org-rights' })
useHead({ title: 'Sections and stories — Analytics — handle' })

const { analytics } = useHandleApi()
const route = useRoute()
const router = useRouter()
const range = useAnaRange('30d')
const data = ref(null)
const error = ref('')
const loading = ref(false)

const publication = computed(() => (route.query.publication ? String(route.query.publication) : ''))
const section = computed(() => (route.query.section ? String(route.query.section) : ''))
function setQuery(q) {
  router.replace({ query: { ...route.query, ...q } })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.sections({ ...range.value, publication: publication.value || undefined, section: section.value || undefined })
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Sections could not be loaded.'
  } finally {
    loading.value = false
  }
}
watch([range, publication, section], load, { immediate: true })

const pubs = computed(() => data.value?.publications || [])
const colours = computed(() => seriesColours(pubs.value))
const pub = computed(() => data.value?.publication)
const colour = computed(() => colours.value[pub.value] || '#2f55e4')
const pubName = computed(() => pubs.value.find((p) => p.code === pub.value)?.name || pub.value)
const maxReaders = computed(() => Math.max(1, ...(data.value?.sections || []).map((s) => s.readers)))
const lead = computed(() => {
  const s = data.value?.sections || []
  if (!s.length) return ''
  const longest = [...s].sort((a, b) => b.medianMinutes - a.medianMinutes)[0]
  return longest.name === s[0].name ? `${s[0].name} leads on readers and time` : `${s[0].name} leads on readers; ${longest.name} holds them longest`
})
const heatMax = computed(() => Math.max(1, ...(data.value?.heatmap?.rows || []).flatMap((r) => r.values)))
const heatDates = computed(() => data.value?.heatmap?.dates || [])

function exportStories() {
  const d = data.value
  downloadCsv(`stories-${pub.value}-${d.range.from}-${d.range.to}.csv`, [
    ['#', 'Headline', 'Edition', 'Page', 'Section', 'Opens', 'Readers', 'Median read (s)'],
    ...d.stories.map((s) => [s.rank, s.headline, s.editionDate, s.page, s.section, s.opens, s.readers, s.medianSeconds])
  ])
}
</script>

<template>
  <AnalyticsShell :title="`Sections and stories${pubName ? ` · ${pubName}` : ''}`" :sub="data ? fmtRange(data.range) : ''">
    <template #controls>
      <div class="flex flex-wrap gap-3 items-center">
        <div class="seg seg-light" role="group" aria-label="Publication">
          <button v-for="p in pubs" :key="p.code" class="seg-btn" :class="pub === p.code ? 'seg-on' : ''" @click="setQuery({ publication: p.code, section: undefined })">{{ p.name }}</button>
        </div>
        <AnaRangePicker v-model="range" />
      </div>
      <span v-if="loading" class="mono text-[12px] muted">Loading…</span>
    </template>

    <p v-if="error" class="notice notice-err">{{ error }}</p>

    <template v-if="data">
      <p v-if="!data.sections.length" class="notice notice-warn">No pages of {{ pubName }} were read in this range.</p>

      <div v-else class="grid lg:grid-cols-[3fr_2fr] gap-4">
        <section class="panel p-5" aria-labelledby="sec-h">
          <h2 id="sec-h" class="text-[17px] font-bold">{{ lead }}</h2>
          <p class="text-[12px] muted">Distinct readers per section (bar) and median minutes per reader (right). Choose a section to see who read it.</p>
          <ul class="mt-4 flex flex-col gap-1.5">
            <li v-for="s in data.sections" :key="s.name">
              <button class="w-full grid grid-cols-[130px_1fr_70px] items-center gap-3 text-left rounded-lg px-2 py-1.5 hover:bg-[#f6f8ff]" :class="data.whoRead?.section === s.name ? 'bg-[#eef2ff]' : ''" :aria-pressed="data.whoRead?.section === s.name" @click="setQuery({ section: s.name })">
                <span class="text-[13px] font-semibold truncate">{{ s.name }}</span>
                <span class="flex items-center gap-2">
                  <span class="h-3.5 rounded" :style="{ width: `${(s.readers / maxReaders) * 100}%`, background: colour, minWidth: '3px' }" />
                  <span class="mono text-[12px]">{{ fmtNum(s.readers) }}</span>
                </span>
                <span class="mono text-[12px] text-right muted">{{ s.medianMinutes }} min</span>
              </button>
            </li>
          </ul>
        </section>

        <section v-if="data.whoRead" class="panel p-5" aria-labelledby="who-h">
          <h2 id="who-h" class="text-[17px] font-bold">Who read {{ data.whoRead.section }}</h2>
          <p class="text-[12px] muted">{{ fmtRange(data.range) }} · {{ fmtNum(data.whoRead.readers) }} readers</p>
          <div class="flex h-3.5 mt-3 gap-[2px]" role="img" :aria-label="`${data.whoRead.personalPct}% personal, ${data.whoRead.organisationPct}% organisation`">
            <span class="rounded-l" :style="{ width: `${data.whoRead.personalPct}%`, background: colour }" />
            <span :style="{ width: `${data.whoRead.organisationPct}%`, background: colour, opacity: 0.55 }" />
            <span class="rounded-r" :style="{ width: `${data.whoRead.previewPct}%`, background: 'rgba(15,27,45,.12)' }" />
          </div>
          <p class="mono text-[11px] muted mt-1">{{ data.whoRead.personalPct }}% personal subscribers · {{ data.whoRead.organisationPct }}% organisation members · {{ data.whoRead.previewPct }}% other</p>

          <h3 class="text-[13px] font-bold mt-5">Organisations whose members read it most</h3>
          <table class="otable mt-1">
            <thead><tr><th>Organisation</th><th class="text-right">Members</th><th class="text-right">Minutes</th></tr></thead>
            <tbody>
              <tr v-for="o in data.whoRead.organisations" :key="o.orgId" class="clickable" @click="navigateTo(`/organisations/${o.orgId}?tab=usage`)">
                <td>{{ o.name }}</td><td class="text-right mono">{{ o.members }}</td><td class="text-right mono">{{ fmtNum(o.minutes) }}</td>
              </tr>
              <tr v-if="!data.whoRead.organisations.length"><td colspan="3" class="muted">None in this range.</td></tr>
            </tbody>
          </table>

          <h3 class="text-[13px] font-bold mt-5">Top readers</h3>
          <ul class="mt-1">
            <li v-for="r in data.whoRead.topReaders" :key="r.userId" class="flex items-center gap-3 py-1.5 border-b border-[rgba(15,27,45,.05)] last:border-0">
              <NuxtLink :to="{ path: `/analytics/readers/${r.userId}`, query: { from: data.range.from, to: data.range.to } }" class="font-semibold text-[13px] flex-1 truncate" style="color: var(--ink)">{{ r.name }}</NuxtLink>
              <span class="text-[12px] muted truncate max-w-[45%]">{{ r.via }}</span>
              <span class="mono text-[12px]">{{ r.minutes }} min</span>
            </li>
          </ul>
        </section>
      </div>

      <section v-if="data.heatmap.rows.length" class="panel p-5" aria-labelledby="heat-h">
        <h2 id="heat-h" class="text-[17px] font-bold">Section readers by day</h2>
        <p class="text-[12px] muted">Darker = more readers</p>
        <div class="overflow-x-auto mt-3">
          <table class="border-separate" style="border-spacing: 2px">
            <thead>
              <tr>
                <th class="text-left text-[11px] font-medium muted pr-2" />
                <th v-for="d in heatDates" :key="d" class="mono text-[10px] font-medium muted w-6 text-center">{{ Number(d.slice(8)) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data.heatmap.rows" :key="r.name">
                <td class="text-[12px] font-semibold pr-3 whitespace-nowrap">{{ r.name }}</td>
                <td
                  v-for="(v, i) in r.values"
                  :key="i"
                  class="w-6 h-6 rounded"
                  :style="{ background: v ? colour : 'rgba(15,27,45,.04)', opacity: v ? 0.18 + 0.82 * (v / heatMax) : 1 }"
                  :title="`${r.name}, ${fmtDay(heatDates[i], { weekday: true })}: ${v} readers`"
                />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel p-5" aria-labelledby="stories-h">
        <div class="flex flex-wrap justify-between gap-3 items-center">
          <h2 id="stories-h" class="text-[17px] font-bold">Most-read stories</h2>
          <button v-if="data.stories.length" class="btn-ghost" @click="exportStories">Download (CSV)</button>
        </div>
        <div class="table-scroll mt-2">
          <table class="otable">
            <thead><tr><th>#</th><th>Headline</th><th>Edition · page</th><th>Section</th><th class="text-right">Opens</th><th class="text-right">Readers</th><th class="text-right">Median read</th></tr></thead>
            <tbody>
              <tr v-for="s in data.stories" :key="s.storyId">
                <td class="mono muted">{{ s.rank }}</td>
                <td class="font-semibold">{{ s.headline }}</td>
                <td class="mono whitespace-nowrap">{{ fmtDay(s.editionDate) }}<template v-if="s.page"> · p{{ s.page }}</template></td>
                <td>{{ s.section || '—' }}</td>
                <td class="text-right mono">{{ fmtNum(s.opens) }}</td>
                <td class="text-right mono">{{ fmtNum(s.readers) }}</td>
                <td class="text-right mono">{{ fmtSeconds(s.medianSeconds) }}</td>
              </tr>
              <tr v-if="!data.stories.length"><td colspan="7" class="muted">No stories opened in this range.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </AnalyticsShell>
</template>

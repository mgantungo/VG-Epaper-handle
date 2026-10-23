<!--
  File:      /var/www/VGEpaper/handle/app/pages/analytics/readers/index.vue
  Repo path: apps/handle/app/pages/analytics/readers/index.vue  NEW FILE (Phases 1–4)
  URL:       /analytics/readers?from=&to=&publication=&type=&org=&q=&sort=

  Every signed-in reader active in the range — organisation members and
  readers on their own — with days active, editions, pages read, reading
  time and what they pay for. Opens the reader's detail page. Readers who
  never signed in are counted in one line (visitors are anonymous).
-->
<script setup>
definePageMeta({ middleware: 'org-rights' })
useHead({ title: 'Readers — Analytics — handle' })

const { analytics, orgs } = useHandleApi()
const route = useRoute()
const router = useRouter()
const range = useAnaRange('month')
const data = ref(null)
const error = ref('')
const loading = ref(false)
const orgList = ref([])
const search = ref(String(route.query.q || ''))

const q = computed(() => ({
  publication: route.query.publication || undefined,
  type: route.query.type || undefined,
  org: route.query.org || undefined,
  q: route.query.q || undefined,
  sort: route.query.sort || 'minutes',
  page: route.query.page || 1
}))
function setQuery(patch) {
  router.replace({ query: { ...route.query, page: undefined, ...patch } })
}
let timer = null
watch(search, (v) => { clearTimeout(timer); timer = setTimeout(() => setQuery({ q: v.trim() || undefined }), 350) })

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.readers({ ...range.value, ...q.value, pageSize: 50 })
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Readers could not be loaded.'
  } finally {
    loading.value = false
  }
}
watch([range, q], load, { immediate: true })
onMounted(async () => {
  try {
    const res = await orgs.list({ pageSize: 100 })
    orgList.value = res.organisations || []
  } catch { orgList.value = [] }
})

const pubsRes = ref([])
onMounted(async () => {
  try { pubsRes.value = await useHandleApi().catalogue.publications() } catch { pubsRes.value = [] }
})
const pubs = computed(() => (Array.isArray(pubsRes.value) ? pubsRes.value : pubsRes.value?.publications || []))
const colours = computed(() => seriesColours(pubs.value))
const pages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1))
const SORTS = [
  { key: 'minutes', label: 'Reading time' },
  { key: 'days', label: 'Days active' },
  { key: 'pages', label: 'Pages read' },
  { key: 'last', label: 'Last active' }
]
function exportCsv() {
  const d = data.value
  downloadCsv(`readers-${d.range.from}-${d.range.to}.csv`, [
    ['Name', 'Email', 'Organisation', 'Pays for', 'Read', 'Days active', 'Editions', 'Pages read', 'Minutes', 'Stories', 'Last active'],
    ...d.readers.map((r) => [r.name, r.email, r.organisation?.name || '', r.pays.join(' '), r.publications.join(' '), r.daysActive, r.editions, r.pagesRead, r.minutes, r.stories, r.lastActive])
  ])
}
</script>

<template>
  <AnalyticsShell title="Readers" :sub="data ? `${fmtNum(data.total)} signed-in readers active · ${fmtRange(data.range)}` : ''">
    <template #controls>
      <div class="flex flex-wrap gap-3 items-center">
        <AnaRangePicker v-model="range" />
      </div>
      <button v-if="data?.readers?.length" class="btn-ghost" @click="exportCsv">Download this page (CSV)</button>
    </template>

    <section class="panel p-4 flex flex-wrap gap-3 items-end">
      <label class="flex-1 min-w-[220px]">
        <span class="label">Search</span>
        <input v-model="search" type="search" class="field" placeholder="Name or email">
      </label>
      <label>
        <span class="label">Reader</span>
        <select class="field" style="width: 170px" :value="route.query.type || ''" @change="setQuery({ type: $event.target.value || undefined })">
          <option value="">Everyone</option>
          <option value="personal">Not in an organisation</option>
          <option value="organisation">Organisation members</option>
        </select>
      </label>
      <label>
        <span class="label">Organisation</span>
        <select class="field" style="width: 200px" :value="route.query.org || ''" @change="setQuery({ org: $event.target.value || undefined })">
          <option value="">Any</option>
          <option v-for="o in orgList" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
      </label>
      <label>
        <span class="label">Publication read</span>
        <select class="field" style="width: 180px" :value="route.query.publication || ''" @change="setQuery({ publication: $event.target.value || undefined })">
          <option value="">Any</option>
          <option v-for="p in pubs" :key="p.code" :value="p.code">{{ p.name }}</option>
        </select>
      </label>
      <label>
        <span class="label">Sort by</span>
        <select class="field" style="width: 150px" :value="q.sort" @change="setQuery({ sort: $event.target.value })">
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
      </label>
    </section>

    <p v-if="error" class="notice notice-err">{{ error }}</p>

    <section v-if="data" class="panel">
      <div class="table-scroll">
        <table class="otable">
          <thead>
            <tr><th>Reader</th><th>Organisation</th><th>Pays for</th><th>Read</th><th class="text-right">Days</th><th class="text-right">Editions</th><th class="text-right">Pages read</th><th class="text-right">Reading time</th><th>Last active</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in data.readers" :key="r.userId" class="clickable" @click="navigateTo({ path: `/analytics/readers/${r.userId}`, query: { from: data.range.from, to: data.range.to } })">
              <td>
                <span class="font-semibold">{{ r.name || r.email || `Reader #${r.userId} (account removed)` }}</span>
                <span v-if="r.name" class="block text-[11px] muted">{{ r.email }}</span>
              </td>
              <td>{{ r.organisation?.name || '—' }}</td>
              <td><span v-for="c in r.pays" :key="c" class="chip mr-1" :style="{ background: `${colours[c] || '#64748b'}22`, color: '#0f1b2d' }">{{ c }}</span><span v-if="!r.pays.length" class="muted">—</span></td>
              <td class="mono text-[12px]">{{ r.publications.join(' · ') || '—' }}</td>
              <td class="text-right mono">{{ r.daysActive }}</td>
              <td class="text-right mono">{{ r.editions }}</td>
              <td class="text-right mono">{{ fmtNum(r.pagesRead) }}</td>
              <td class="text-right mono">{{ fmtMinutes(r.minutes) }}</td>
              <td class="mono whitespace-nowrap">{{ fmtDay(r.lastActive) }}</td>
            </tr>
            <tr v-if="!data.readers.length"><td colspan="9" class="muted">No signed-in readers match.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-[rgba(15,27,45,.06)]">
        <p class="text-[12px] muted">
          <template v-if="data.anonymous">Plus {{ fmtNum(data.anonymous.visitors) }} visitors who did not sign in ({{ fmtNum(data.anonymous.pagesRead) }} pages read).</template>
        </p>
        <div class="flex items-center gap-2">
          <button class="btn-soft" :disabled="data.page <= 1" @click="setQuery({ page: data.page - 1 })">Previous</button>
          <span class="mono text-[12px] muted">{{ data.page }} / {{ pages }}</span>
          <button class="btn-soft" :disabled="data.page >= pages" @click="setQuery({ page: data.page + 1 })">Next</button>
        </div>
      </div>
    </section>
  </AnalyticsShell>
</template>

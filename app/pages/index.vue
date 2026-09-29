<!--
  File:      /var/www/VGEpaper/handle/app/pages/index.vue
  Repo path: apps/handle/app/pages/index.vue
  System:    apps/handle (Nuxt 4, handle.epapers.visiongroup.co.ug)          REPLACE
  URL:       /

  Editions dashboard: latest edition with its front page, editions needing
  attention (failed / still processing), a 21-day calendar showing which
  publications came in each day, and a searchable, filterable editions list.
  Refreshes itself every 10 seconds while any edition is pending or processing.
  Data: GET /api/editions?page=&pageSize= (server/api/editions/index.get.ts).
-->
<template>
  <div class="max-w-7xl mx-auto px-4 lg:px-6 py-6">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 class="font-serif font-bold text-3xl leading-tight">Editions</h1>
        <p class="text-sm text-neutral-500 mt-1">Upload each day's paper, check the ingest, and fix its stories.</p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="lastLoaded" class="text-xs text-neutral-400">{{ polling ? 'Watching ingest, updated' : 'Updated' }} {{ timeAgo(lastLoaded) }}</span>
        <button class="btn" :disabled="loading" @click="load(true)">{{ loading ? 'Refreshing…' : 'Refresh' }}</button>
        <NuxtLink to="/editions/new" class="btn-primary">Upload edition</NuxtLink>
      </div>
    </div>

    <div v-if="loadError && !editions.length" class="bg-white rounded-xl shadow-sm p-10 text-center">
      <p class="text-sm text-red-600">{{ loadError }}</p>
      <button class="btn mt-4" @click="load(true)">Try again</button>
    </div>

    <div v-else-if="loading && !editions.length" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="bg-white rounded-xl shadow-sm h-72 animate-pulse" />
      <div class="bg-white rounded-xl shadow-sm h-72 animate-pulse" />
    </div>

    <div v-else-if="!editions.length" class="bg-white rounded-xl shadow-sm p-12 text-center">
      <h2 class="font-serif font-bold text-xl">No editions yet</h2>
      <p class="text-sm text-neutral-500 mt-2">Upload a PDF to create the first edition. Pages and stories are extracted automatically.</p>
      <NuxtLink to="/editions/new" class="btn-primary mt-5">Upload edition</NuxtLink>
    </div>

    <template v-else>
      <!-- Latest edition + needs attention -->
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] mb-5">
        <section v-if="latest" class="bg-white rounded-xl shadow-sm p-5 flex gap-6">
          <NuxtLink :to="`/editions/${latest.documentId}`" class="shrink-0 w-36 sm:w-44 block group" :aria-label="`Open ${latest.publicationCode} ${fmtDate(latest.date)}`">
            <div class="aspect-[5/7] rounded-md bg-neutral-100 overflow-hidden ring-1 ring-neutral-200 group-hover:ring-neutral-400 transition">
              <img v-if="latest.pageCount && !thumbFailed" :src="`/api/editions/${latest.documentId}/pages/1`" class="w-full h-full object-cover object-top" alt="" @error="thumbFailed = true">
              <div v-else class="w-full h-full flex items-center justify-center text-xs text-neutral-400 p-3 text-center">{{ latest.pipelineStatus === 'failed' ? 'No pages' : 'Front page appears after ingest' }}</div>
            </div>
          </NuxtLink>
          <div class="min-w-0 flex-1 flex flex-col">
            <p class="text-sm text-neutral-500">Latest edition</p>
            <h2 class="font-serif font-bold text-2xl leading-tight mt-0.5">{{ pubName(latest.publicationCode) }}</h2>
            <p class="font-serif text-lg text-neutral-700">{{ fmtDate(latest.date, true) }}</p>
            <div class="flex flex-wrap items-center gap-3 mt-3">
              <StatusBadge :status="latest.pipelineStatus" />
              <span v-if="latest.pageCount" class="text-sm text-neutral-600">{{ latest.pageCount }} pages</span>
              <span v-if="latest.volume || latest.issueNumber" class="text-sm text-neutral-600">Vol {{ latest.volume || '–' }}, issue {{ latest.issueNumber || '–' }}</span>
            </div>
            <p v-if="latest.pipelineStatus === 'failed' && latest.pipelineError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3 mt-3 line-clamp-3">{{ latest.pipelineError }}</p>
            <p v-else-if="isRunning(latest)" class="text-sm text-blue-800 bg-blue-50 rounded-lg p-3 mt-3">Pages and stories are being extracted. This page refreshes on its own.</p>
            <p class="text-xs text-neutral-400 mt-3">Uploaded {{ fmtDateTime(latest.createdAt) }}<template v-if="latest.sku"> as {{ latest.sku }}</template></p>
            <div class="flex flex-wrap gap-2 mt-auto pt-4">
              <NuxtLink :to="`/editions/${latest.documentId}`" class="btn-primary">Open edition</NuxtLink>
              <NuxtLink v-if="latest.pageCount" :to="`/story-editor/${latest.documentId}/1`" class="btn">Edit stories</NuxtLink>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-xl shadow-sm p-5">
          <h2 class="font-serif font-bold text-lg">Needs attention</h2>
          <p v-if="!attention.length" class="text-sm text-neutral-500 mt-3">Nothing needs attention. Every loaded edition has finished ingesting.</p>
          <ul v-else class="mt-3 space-y-2">
            <li v-for="e in attention.slice(0, 6)" :key="e.documentId">
              <NuxtLink :to="`/editions/${e.documentId}`" class="block rounded-lg p-3 hover:bg-neutral-50 ring-1" :class="e.pipelineStatus === 'failed' ? 'ring-red-200' : 'ring-neutral-200'">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium">{{ e.publicationCode }}, {{ fmtDate(e.date) }}</span>
                  <StatusBadge :status="e.pipelineStatus" />
                </div>
                <p v-if="e.pipelineStatus === 'failed'" class="text-xs text-red-700 mt-1 line-clamp-2">{{ e.pipelineError || 'Ingest failed without an error message.' }}</p>
                <p v-else class="text-xs text-neutral-500 mt-1">{{ stuckFor(e) }}</p>
              </NuxtLink>
            </li>
          </ul>
          <p v-if="attention.length > 6" class="text-xs text-neutral-500 mt-2">{{ attention.length - 6 }} more in the list below.</p>
        </section>
      </div>

      <!-- Calendar strip -->
      <section class="bg-white rounded-xl shadow-sm p-5 mb-5">
        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 class="font-serif font-bold text-lg">Last three weeks</h2>
          <div class="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />Ready</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-500" aria-hidden="true" />Processing or waiting</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-500" aria-hidden="true" />Failed</span>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1.5">
          <div v-for="d in calendar" :key="d.iso" class="rounded-lg p-2 min-h-20 ring-1" :class="d.isToday ? 'ring-neutral-900' : 'ring-neutral-100'">
            <div class="flex items-baseline justify-between">
              <span class="text-[11px] text-neutral-400">{{ d.weekday }}</span>
              <span class="text-sm font-semibold" :class="d.isToday ? 'text-neutral-900' : 'text-neutral-600'">{{ d.day }}</span>
            </div>
            <div class="flex flex-wrap gap-1 mt-1.5">
              <NuxtLink
                v-for="e in d.editions" :key="e.documentId" :to="`/editions/${e.documentId}`"
                class="text-[11px] font-semibold px-1.5 py-0.5 rounded text-white" :class="statusColor(e.pipelineStatus)"
                :title="`${pubName(e.publicationCode)}, ${fmtDate(e.date)}: ${statusLabel(e.pipelineStatus)}`"
              >{{ e.publicationCode }}</NuxtLink>
              <span v-if="!d.editions.length" class="text-[11px] text-neutral-300">No edition</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Editions list -->
      <section class="bg-white rounded-xl shadow-sm">
        <div class="flex flex-wrap items-center gap-3 p-4 border-b border-neutral-100">
          <h2 class="font-serif font-bold text-lg mr-auto">All editions</h2>
          <label class="sr-only" for="q">Search editions</label>
          <input id="q" v-model="q" type="search" class="h-9 w-52 border border-neutral-200 rounded-lg px-3 text-sm" placeholder="Search date or SKU">
          <label class="sr-only" for="pub">Publication</label>
          <select id="pub" v-model="pub" class="h-9 border border-neutral-200 rounded-lg px-2 text-sm bg-white">
            <option value="">All publications</option>
            <option v-for="p in publications" :key="p" :value="p">{{ pubName(p) }}</option>
          </select>
          <div class="inline-flex rounded-lg bg-neutral-100 p-0.5" role="group" aria-label="Filter by status">
            <button v-for="f in statusFilters" :key="f.value" class="h-8 px-3 rounded-md text-sm" :class="status === f.value ? 'bg-white shadow-sm font-medium' : 'text-neutral-600'" :aria-pressed="status === f.value" @click="status = f.value">
              {{ f.label }}<span class="text-neutral-400 ml-1">{{ countFor(f.value) }}</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs text-neutral-500">
              <tr>
                <th class="font-medium px-4 py-2.5">Date</th>
                <th class="font-medium px-4 py-2.5">Publication</th>
                <th class="font-medium px-4 py-2.5">Vol / issue</th>
                <th class="font-medium px-4 py-2.5 text-right">Pages</th>
                <th class="font-medium px-4 py-2.5">Status</th>
                <th class="font-medium px-4 py-2.5">Uploaded</th>
                <th class="px-4 py-2.5"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-for="e in shown" :key="e.documentId" class="hover:bg-neutral-50 cursor-pointer" @click="open(e)">
                <td class="px-4 py-3 whitespace-nowrap font-medium">{{ fmtDate(e.date) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ pubName(e.publicationCode) }}<span v-if="e.sku" class="block text-xs text-neutral-400">{{ e.sku }}</span></td>
                <td class="px-4 py-3 whitespace-nowrap text-neutral-600">{{ e.volume || '–' }} / {{ e.issueNumber || '–' }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ e.pageCount || '–' }}</td>
                <td class="px-4 py-3">
                  <StatusBadge :status="e.pipelineStatus" />
                  <p v-if="e.pipelineStatus === 'failed' && e.pipelineError" class="text-xs text-red-700 mt-1 max-w-xs truncate" :title="e.pipelineError">{{ e.pipelineError }}</p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-neutral-500">{{ fmtDateTime(e.createdAt) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right" @click.stop>
                  <NuxtLink v-if="e.pageCount" :to="`/story-editor/${e.documentId}/1`" class="text-sm text-blue-700 hover:underline mr-3">Edit stories</NuxtLink>
                  <NuxtLink :to="`/editions/${e.documentId}`" class="text-sm text-neutral-700 hover:underline">Open</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filtered.length" class="p-8 text-center text-sm text-neutral-500">
            No editions match these filters. <button class="underline" @click="clearFilters">Clear filters</button>
          </p>
        </div>
        <div class="flex items-center justify-between p-4 border-t border-neutral-100 text-xs text-neutral-500">
          <span>Showing {{ shown.length }} of {{ filtered.length }}<template v-if="pagination?.total"> ({{ pagination.total }} editions in total)</template></span>
          <div class="flex gap-2">
            <button v-if="shown.length < filtered.length" class="btn" @click="visibleCount += ROWS_STEP">Show {{ Math.min(ROWS_STEP, filtered.length - shown.length) }} more</button>
            <button v-else-if="hasMore" class="btn" :disabled="loading" @click="loadMore">Load older editions</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
const PAGE_SIZE = 100
const ROWS_STEP = 20
const POLL_MS = 10000
const PUBLICATION_NAMES = { NV: 'New Vision', BK: 'Bukedde', NVW: 'New Vision Weekend', BKW: 'Bukedde Weekend' }

const router = useRouter()
const editions = ref([])
const pagination = ref(null)
const loading = ref(false)
const loadError = ref('')
const lastLoaded = ref(null)
const thumbFailed = ref(false)
const q = ref('')
const pub = ref('')
const status = ref('')
const now = ref(Date.now())
let pageLoaded = 1
let pollTimer = null
let clockTimer = null

async function fetchPage(page) {
  return await $fetch('/api/editions', { query: { page, pageSize: PAGE_SIZE } })
}
async function load(manual = false) {
  loading.value = true
  if (manual) loadError.value = ''
  try {
    // Refresh everything loaded so far, so status changes show up in older rows too.
    const pages = await Promise.all(Array.from({ length: pageLoaded }, (_, i) => fetchPage(i + 1)))
    editions.value = pages.flatMap(p => p?.editions || [])
    pagination.value = pages.at(-1)?.pagination || null
    lastLoaded.value = Date.now()
    loadError.value = ''
  } catch (err) {
    loadError.value = err?.statusMessage || err?.data?.statusMessage || 'Editions could not be loaded.'
  } finally {
    loading.value = false
    schedulePoll()
  }
}
async function loadMore() {
  pageLoaded += 1
  await load()
}
const hasMore = computed(() => pagination.value && pagination.value.page < pagination.value.pageCount)

const isRunning = e => e.pipelineStatus === 'pending' || e.pipelineStatus === 'processing'
const polling = computed(() => editions.value.some(isRunning))
function schedulePoll() {
  clearTimeout(pollTimer)
  if (polling.value) pollTimer = setTimeout(() => load(), POLL_MS)
}
onMounted(() => {
  load(true)
  clockTimer = setInterval(() => (now.value = Date.now()), 30000)
})
onUnmounted(() => { clearTimeout(pollTimer); clearInterval(clockTimer) })

// ---------- derived ----------
const byNewest = computed(() => [...editions.value].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')))
const latest = computed(() => byNewest.value[0] || null)
watch(latest, () => (thumbFailed.value = false))
const attention = computed(() => byNewest.value.filter(e => e.pipelineStatus === 'failed' || isRunning(e)))
const publications = computed(() => [...new Set(editions.value.map(e => e.publicationCode).filter(Boolean))].sort())

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'ready_for_review', label: 'Ready' },
  { value: 'running', label: 'In progress' },
  { value: 'failed', label: 'Failed' }
]
function matchesStatus(e, s) {
  if (!s) return true
  if (s === 'running') return isRunning(e)
  return e.pipelineStatus === s
}
const countFor = s => editions.value.filter(e => matchesStatus(e, s) && (!pub.value || e.publicationCode === pub.value)).length
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return byNewest.value.filter(e =>
    matchesStatus(e, status.value) &&
    (!pub.value || e.publicationCode === pub.value) &&
    (!term || (e.date || '').includes(term) || (e.sku || '').toLowerCase().includes(term) || fmtDate(e.date).toLowerCase().includes(term)))
})
const visibleCount = ref(ROWS_STEP)
const shown = computed(() => filtered.value.slice(0, visibleCount.value))
watch([q, pub, status], () => (visibleCount.value = ROWS_STEP))
function clearFilters() { q.value = ''; pub.value = ''; status.value = '' }
function open(e) { router.push(`/editions/${e.documentId}`) }

// 21 days ending today, Monday-aligned rows are not needed: newest week last.
const calendar = computed(() => {
  const byDate = new Map()
  for (const e of editions.value) {
    if (!byDate.has(e.date)) byDate.set(e.date, [])
    byDate.get(e.date).push(e)
  }
  const today = new Date(now.value)
  const out = []
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({
      iso,
      day: d.getDate(),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      isToday: i === 0,
      editions: (byDate.get(iso) || []).sort((a, b) => (a.publicationCode || '').localeCompare(b.publicationCode || ''))
    })
  }
  return out
})

// ---------- formatting ----------
const pubName = code => PUBLICATION_NAMES[code] || code || 'Unknown publication'
function statusColor(s) {
  if (s === 'ready_for_review') return 'bg-emerald-500 hover:bg-emerald-600'
  if (s === 'failed') return 'bg-red-500 hover:bg-red-600'
  return 'bg-blue-500 hover:bg-blue-600'
}
const statusLabel = s => ({ ready_for_review: 'ready', processing: 'processing', pending: 'waiting to ingest', failed: 'failed' }[s] || s || 'unknown')
function fmtDate(iso, long = false) {
  if (!iso) return '–'
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(v) {
  if (!v) return '–'
  const d = new Date(v)
  return isNaN(d) ? String(v) : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function timeAgo(t) {
  const s = Math.max(0, Math.round((now.value - t) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
}
function duration(mins) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return mins % 60 ? `${h} h ${mins % 60} min` : `${h} h`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}
function stuckFor(e) {
  const mins = Math.round((now.value - new Date(e.createdAt).getTime()) / 60000)
  const what = e.pipelineStatus === 'pending' ? 'Waiting to start' : 'Extracting pages and stories'
  if (!Number.isFinite(mins)) return what
  return mins > 30
    ? `${what}, uploaded ${duration(mins)} ago. It may be stuck: check that the ingest service is running.`
    : `${what}, uploaded ${duration(mins)} ago.`
}
</script>

<style scoped>
.btn { white-space: nowrap; display: inline-flex; align-items: center; height: 2.25rem; padding: 0 .875rem; border-radius: .5rem; font-size: .875rem; font-weight: 500; background: #f5f5f5; }
.btn:hover:not(:disabled) { background: #e5e5e5; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary { white-space: nowrap; display: inline-flex; align-items: center; height: 2.25rem; padding: 0 .875rem; border-radius: .5rem; font-size: .875rem; font-weight: 500; background: #171717; color: #fff; }
.btn-primary:hover { background: #404040; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
</style>
<!--
  File:      /var/www/VGEpaper/handle/app/pages/index.vue
  Repo path: apps/handle/app/pages/index.vue
  System:    apps/handle (Nuxt 4, handle.epapers.visiongroup.co.ug)          REPLACE
  URL:       /   (?e=<editionDocumentId> keeps the selected edition)

  Editions desk. Hero band with what needs doing now; three panes:
    left   editions queue (search + status filter)
    centre selected edition: pipeline cards (upload, pages, stories, status)
           and its pages, 24 per screen, each marked Checked / Needs review /
           Pending, filterable by that status, with a go-to-page box
    right  front page, page readiness, and the next page to fix
  Data: GET /api/editions (list), GET /api/editions/:id (detail, cached).
  Refreshes every 10 s while any edition is pending or processing.
  inheritAttrs is off so layout classes on <NuxtPage> cannot reach this root.
-->
<template>
  <div class="desk" style="display:block !important; width:100% !important; max-width:none !important; flex:1 1 100% !important; align-self:stretch !important; min-width:0 !important; margin:0 !important; --ink:#0f1b2d; --accent:#2f55e4; --line:rgba(15,27,45,.08);">
   <!-- Inline !important styles on the root above: it must stay a full-width block whatever
        app.vue, a layout or global CSS does to the page element. Keep this comment inside the
        root: a comment directly under <template> gives the page two root nodes. -->
   <div style="display:block; width:100%;">
    <!-- ================= Hero band ================= -->
    <header class="hero">
      <div class="hero-inner">
        <div class="min-w-0">
          <h1 class="display text-[26px] leading-none">Editions desk</h1>
          <p class="mono text-[11px] text-ink/60 mt-2">Ingest monitor · {{ clock }}</p>
        </div>

        <div class="text-center">
          <p class="display hero-word" :class="hero.tone">{{ hero.word }} <span class="hero-num">{{ hero.count }}</span></p>
          <p class="text-[13px] text-ink/70 mt-1">{{ hero.line }}</p>
        </div>

        <div class="flex flex-col items-end gap-3">
          <div class="seg" role="group" aria-label="Filter editions by status">
            <button v-for="f in statusFilters" :key="f.value" class="seg-btn" :class="status === f.value ? 'seg-on' : ''" :aria-pressed="status === f.value" @click="status = f.value">
              {{ f.label }} <span class="seg-n">{{ countFor(f.value) }}</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="lastLoaded" class="mono text-[11px] text-ink/50">{{ polling ? 'watching ingest' : 'updated' }} {{ timeAgo(lastLoaded) }}</span>
            <button class="btn-ghost" :disabled="loading" @click="load(true)">{{ loading ? 'Refreshing…' : 'Refresh' }}</button>
            <NuxtLink to="/editions/new" class="btn-ink">Upload edition</NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <div v-if="loadError && !editions.length" class="panel m-6 p-10 text-center">
      <p class="text-sm text-red-700">{{ loadError }}</p>
      <button class="btn-ghost mt-4" @click="load(true)">Try again</button>
    </div>

    <div v-else-if="!loading && !editions.length" class="panel m-6 p-12 text-center">
      <h2 class="display text-2xl">No editions yet</h2>
      <p class="text-sm text-ink/60 mt-2">Upload a PDF to create the first edition. Pages and stories are extracted automatically.</p>
      <NuxtLink to="/editions/new" class="btn-ink mt-5">Upload edition</NuxtLink>
    </div>

    <!-- ================= Three panes ================= -->
    <div v-else class="panes">
      <!-- Left: queue -->
      <aside class="pane-left">
        <div class="flex items-baseline justify-between gap-2 px-1">
          <h2 class="display text-[17px]">Editions</h2>
          <span class="mono text-[11px] text-ink/50">{{ filtered.length }} shown · {{ editions.length }} loaded</span>
        </div>
        <label for="q" class="sr-only">Search editions</label>
        <input id="q" v-model="q" type="search" class="field mt-3" placeholder="Search date, SKU or paper">
        <select v-if="publications.length > 1" v-model="pub" class="field mt-2" aria-label="Publication">
          <option value="">All publications</option>
          <option v-for="p in publications" :key="p" :value="p">{{ pubName(p) }}</option>
        </select>

        <ul class="mt-3 space-y-2">
          <li v-for="e in shownQueue" :key="e.documentId">
            <button class="queue-item" :class="e.documentId === selectedId ? 'queue-on' : ''" @click="selectEdition(e.documentId)">
              <span class="queue-bar" :class="statusMeta(e.pipelineStatus).bar" aria-hidden="true" />
              <span class="min-w-0 flex-1 text-left">
                <span class="block mono text-[13px] font-semibold" :class="e.documentId === selectedId ? 'text-accent' : 'text-ink'">{{ e.sku || e.documentId }}</span>
                <span class="block text-[13px] text-ink/75 mt-0.5 truncate">{{ pubName(e.publicationCode) }} · {{ fmtShort(e.date) }}</span>
              </span>
              <span class="text-right shrink-0">
                <span class="block mono text-[13px] text-ink/70">{{ e.pageCount || '–' }}</span>
                <span class="block text-[10px] mt-0.5" :class="statusMeta(e.pipelineStatus).text">{{ statusMeta(e.pipelineStatus).short }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-if="!filtered.length" class="text-sm text-ink/60 mt-4 px-1">No editions match. <button class="underline" @click="clearFilters">Clear filters</button></p>
        <button v-if="shownQueue.length < filtered.length" class="btn-ghost w-full mt-3" @click="queueCount += 25">Show more</button>
        <button v-else-if="hasMore" class="btn-ghost w-full mt-3" :disabled="loading" @click="loadMore">Load older editions</button>
      </aside>

      <!-- Centre: selected edition -->
      <main class="pane-main">
        <template v-if="selected">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="display text-[17px]">{{ selected.sku || 'Edition' }} · {{ pubName(selected.publicationCode) }}, {{ fmtDate(selected.date, true) }}</h2>
            <p class="mono text-[12px] text-accent">
              {{ detail?.summary?.pageCount ?? selected.pageCount ?? 0 }} pages · {{ detail?.summary?.storyCount ?? '…' }} stories
              <template v-if="needsReviewPages.length"> · <span class="text-red-700">{{ needsReviewPages.length }} {{ needsReviewPages.length === 1 ? 'page needs' : 'pages need' }} review</span></template>
            </p>
          </div>

          <!-- pipeline cards -->
          <div class="stage-row mt-3">
            <div v-for="s in stages" :key="s.key" class="stage" :class="s.edge">
              <div class="stage-art" :class="s.art" aria-hidden="true"><span class="display text-[22px]">{{ s.glyph }}</span></div>
              <p class="text-[13px] font-semibold mt-2.5">{{ s.title }}</p>
              <p class="mono text-[11px] text-ink/60 mt-1">{{ s.meta }}</p>
              <span class="chip mt-2.5" :class="s.chip"><span class="dot" aria-hidden="true" />{{ s.note }}</span>
            </div>
          </div>

          <p v-if="selected.pipelineStatus === 'failed'" class="mt-3 text-sm text-red-800 bg-red-50 ring-1 ring-red-200 rounded-lg p-3">
            <span class="font-semibold">Ingest failed:</span> {{ selected.pipelineError || 'no error message was recorded.' }}
          </p>

          <!-- pages -->
          <section class="panel mt-4">
            <div class="flex flex-wrap items-center gap-2 p-4 pb-3">
              <div class="mr-auto">
                <h3 class="display text-[16px]">Pages</h3>
                <p class="mono text-[11px] text-ink/55 mt-0.5">
                  {{ completePages }} checked · {{ needsReviewPages.length }} need review · {{ pendingPages.length }} pending · {{ detail?.summary?.pagesWithNoStories ?? 0 }} without stories
                </p>
              </div>
              <div class="seg seg-light" role="group" aria-label="Filter pages">
                <button v-for="f in pageFilters" :key="f.value" class="seg-btn" :class="pageFilter === f.value ? 'seg-on' : ''" :aria-pressed="pageFilter === f.value" @click="pageFilter = f.value">
                  {{ f.label }} <span class="seg-n">{{ f.count }}</span>
                </button>
              </div>
            </div>

            <div v-if="detailLoading && !detail" class="page-grid px-4 pb-4">
              <div v-for="n in 12" :key="n" class="aspect-[5/7] rounded-lg bg-ink/5 animate-pulse" />
            </div>
            <p v-else-if="detailError" class="px-4 pb-4 text-sm text-red-700">{{ detailError }} <button class="underline" @click="loadDetail(selectedId, true)">Try again</button></p>
            <p v-else-if="!pagesFiltered.length" class="px-4 pb-5 text-sm text-ink/60">{{ emptyPagesText }}</p>
            <div v-else class="page-grid px-4 pb-2">
              <NuxtLink v-for="p in pagesShown" :key="p.pageNumber" :to="`/story-editor/${selectedId}/${p.pageNumber}`" class="page-card" :class="p.extractionStatus === 'needs_review' ? 'page-warn' : ''" :title="pageTitle(p)">
                <div class="aspect-[5/7] bg-ink/5 overflow-hidden rounded-t-lg">
                  <img :src="`/api/editions/${selectedId}/pages/${p.pageNumber}`" loading="lazy" class="w-full h-full object-cover object-top" alt="">
                </div>
                <div class="p-2">
                  <div class="flex items-center justify-between gap-1">
                    <span class="mono text-[12px] font-semibold">p.{{ p.pageNumber }}</span>
                    <span class="mono text-[10px] text-ink/55">{{ p.storyCount }} {{ p.storyCount === 1 ? 'story' : 'stories' }}</span>
                  </div>
                  <p class="text-[11px] text-ink/60 truncate mt-0.5">{{ p.section || 'No section' }}</p>
                  <span class="chip mt-1.5" :class="pageChip(p).cls"><span class="dot" aria-hidden="true" />{{ pageChip(p).text }}</span>
                </div>
              </NuxtLink>
            </div>

            <!-- pager: one button per range of pages -->
            <nav v-if="gridPageCount > 1" class="flex flex-wrap items-center gap-2 px-4 pb-4 pt-2 border-t border-ink/5" aria-label="Page ranges">
              <button class="btn-soft" :disabled="gridPage === 0" aria-label="Previous pages" @click="gridPage--">‹ Prev</button>
              <button v-for="(r, i) in gridRanges" :key="i" class="btn-soft mono" :class="gridPage === i ? 'btn-soft-on' : ''" :aria-current="gridPage === i ? 'page' : undefined" @click="gridPage = i">{{ r }}</button>
              <button class="btn-soft" :disabled="gridPage >= gridPageCount - 1" aria-label="Next pages" @click="gridPage++">Next ›</button>
              <form class="ml-auto flex items-center gap-1.5" @submit.prevent="jumpToPage">
                <label for="pjump" class="mono text-[11px] text-ink/55">Go to p.</label>
                <input id="pjump" v-model="pageJump" inputmode="numeric" class="field !h-8 !w-16 text-center" :placeholder="String(pagesFiltered[0]?.pageNumber || 1)">
              </form>
            </nav>
          </section>

          <!-- activity -->
          <section class="panel mt-4 p-4">
            <div class="flex items-baseline justify-between">
              <h3 class="display text-[15px]">Activity</h3>
              <span class="mono text-[11px] text-ink/50">newest first</span>
            </div>
            <ul class="mt-2 divide-y divide-ink/5">
              <li v-for="a in activity" :key="a.label" class="flex items-center gap-4 py-2 mono text-[12px]">
                <span class="w-36 shrink-0 text-ink/55">{{ fmtDateTime(a.at) }}</span>
                <span class="flex-1 text-ink/80">{{ a.label }}</span>
              </li>
            </ul>
          </section>
        </template>
        <div v-else class="panel p-10 text-center text-sm text-ink/60">Select an edition from the list.</div>
      </main>

      <!-- Right: front page + readiness -->
      <aside v-if="selected" class="pane-right">
        <section class="panel p-4">
          <div class="flex items-baseline justify-between">
            <h3 class="display text-[15px]">Front page</h3>
            <span class="mono text-[11px] text-ink/50">{{ (detail?.pages || []).length }} pages</span>
          </div>
          <NuxtLink :to="`/editions/${selectedId}`" class="block mt-3 rounded-xl overflow-hidden ring-1 ring-ink/10 bg-gradient-to-b from-[#e3f4f1] to-[#dbeaf6] p-4 hover:ring-accent" aria-label="Open this edition">
            <div class="aspect-[5/7] mx-auto max-w-[190px] bg-white shadow-sm overflow-hidden">
              <img v-if="hasPages && !frontFailed" :src="`/api/editions/${selectedId}/pages/1`" class="w-full h-full object-cover object-top" alt="" @error="frontFailed = true">
              <div v-else class="w-full h-full flex items-center justify-center text-[11px] text-ink/45 p-3 text-center">Appears after ingest</div>
            </div>
          </NuxtLink>
          <div v-if="hasPages" class="grid grid-cols-4 gap-2 mt-3">
            <NuxtLink v-for="n in thumbStrip" :key="n" :to="`/story-editor/${selectedId}/${n}`" class="rounded-md overflow-hidden ring-1 ring-ink/10 hover:ring-accent bg-white" :title="`Page ${n}`">
              <img :src="`/api/editions/${selectedId}/pages/${n}`" loading="lazy" class="w-full aspect-[5/7] object-cover object-top" alt="">
              <span class="block mono text-[10px] text-center text-ink/60 py-0.5">p.{{ n }}</span>
            </NuxtLink>
          </div>
          <NuxtLink :to="`/editions/${selectedId}`" class="btn-ghost w-full mt-3 justify-center">Open edition</NuxtLink>
        </section>

        <section class="panel p-4 mt-4">
          <div class="flex items-baseline justify-between">
            <h3 class="display text-[15px]">Page readiness</h3>
            <span class="mono text-[12px] text-accent">{{ completePages }}/{{ totalPages }}</span>
          </div>
          <div v-for="r in readiness" :key="r.label" class="ready-row" :class="r.edge">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[13px] font-semibold">{{ r.label }}</span>
              <span class="mono text-[13px]">{{ r.value }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-ink/10 mt-2 overflow-hidden"><div class="h-full rounded-full" :class="r.fill" :style="{ width: `${r.pct}%` }" /></div>
            <p class="text-[11px] text-ink/60 mt-1.5">{{ r.note }}</p>
          </div>
        </section>

        <section class="next-card mt-4">
          <p class="mono text-[10px] text-ink/60">Next step</p>
          <p class="display text-[18px] mt-1">{{ next.title }}</p>
          <p class="text-[12px] text-ink/70 mt-1">{{ next.text }}</p>
          <NuxtLink v-if="next.to" :to="next.to" class="chip chip-accent mt-3">{{ next.cta }}</NuxtLink>
        </section>
      </aside>
    </div>
   </div>
  </div>
</template>

<script setup>
defineOptions({ inheritAttrs: false })

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
  ]
})

const PAGE_SIZE = 100
const POLL_MS = 10000
const PUBLICATION_NAMES = { NV: 'New Vision', BK: 'Bukedde', NVW: 'New Vision Weekend', BKW: 'Bukedde Weekend' }
const STATUS = {
  published: { label: 'Published', short: 'published', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  ready_for_review: { label: 'Ready for review', short: 'review', bar: 'bg-amber-500', text: 'text-amber-700' },
  processing: { label: 'Processing', short: 'processing', bar: 'bg-blue-500', text: 'text-blue-700' },
  pending: { label: 'Waiting to start', short: 'waiting', bar: 'bg-blue-300', text: 'text-blue-600' },
  failed: { label: 'Failed', short: 'failed', bar: 'bg-red-500', text: 'text-red-700' }
}
const statusMeta = s => STATUS[s] || { label: s || 'Unknown', short: s || 'unknown', bar: 'bg-neutral-400', text: 'text-neutral-600' }

const route = useRoute()
const router = useRouter()
const editions = ref([])
const pagination = ref(null)
const loading = ref(true)
const loadError = ref('')
const lastLoaded = ref(null)
const now = ref(Date.now())
const q = ref('')
const pub = ref('')
const status = ref('')
const queueCount = ref(25)
const selectedId = ref(route.query.e ? String(route.query.e) : null)
const details = reactive({})
const detailLoading = ref(false)
const detailError = ref('')
const frontFailed = ref(false)
let pageLoaded = 1
let pollTimer = null
let clockTimer = null

// ---------- data ----------
async function load(manual = false) {
  loading.value = true
  if (manual) loadError.value = ''
  try {
    const pages = await Promise.all(Array.from({ length: pageLoaded }, (_, i) => $fetch('/api/editions', { query: { page: i + 1, pageSize: PAGE_SIZE } })))
    editions.value = pages.flatMap(p => p?.editions || [])
    pagination.value = pages.at(-1)?.pagination || null
    lastLoaded.value = Date.now()
    loadError.value = ''
    if (!selectedId.value || !editions.value.some(e => e.documentId === selectedId.value)) selectedId.value = byNewest.value[0]?.documentId || null
    if (selectedId.value) loadDetail(selectedId.value, manual || isRunning(selected.value))
  } catch (err) {
    loadError.value = err?.statusMessage || err?.data?.statusMessage || 'Editions could not be loaded.'
  } finally {
    loading.value = false
    schedulePoll()
  }
}
async function loadMore() { pageLoaded += 1; await load() }
async function loadDetail(id, force = false) {
  if (!id || (details[id] && !force)) return
  detailLoading.value = true
  detailError.value = ''
  try {
    details[id] = await $fetch(`/api/editions/${encodeURIComponent(id)}`)
  } catch (err) {
    if (id === selectedId.value) detailError.value = err?.statusMessage || 'This edition could not be loaded.'
  } finally {
    detailLoading.value = false
  }
}
function selectEdition(id) {
  selectedId.value = id
  frontFailed.value = false
  pageFilter.value = 'all'
  router.replace({ query: { ...route.query, e: id } })
  loadDetail(id)
}
const hasMore = computed(() => pagination.value && pagination.value.page < pagination.value.pageCount)
const isRunning = e => !!e && (e.pipelineStatus === 'pending' || e.pipelineStatus === 'processing')
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

// ---------- queue ----------
const byNewest = computed(() => [...editions.value].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')))
const publications = computed(() => [...new Set(editions.value.map(e => e.publicationCode).filter(Boolean))].sort())
const statusFilters = [
  { value: '', label: 'All' },
  { value: 'ready_for_review', label: 'Review' },
  { value: 'running', label: 'In progress' },
  { value: 'failed', label: 'Failed' },
  { value: 'published', label: 'Published' }
]
const matchesStatus = (e, s) => !s || (s === 'running' ? isRunning(e) : e.pipelineStatus === s)
const countFor = s => editions.value.filter(e => matchesStatus(e, s) && (!pub.value || e.publicationCode === pub.value)).length
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return byNewest.value.filter(e => matchesStatus(e, status.value) && (!pub.value || e.publicationCode === pub.value) &&
    (!term || [e.date, e.sku, pubName(e.publicationCode), fmtDate(e.date)].some(v => (v || '').toLowerCase().includes(term))))
})
const shownQueue = computed(() => filtered.value.slice(0, queueCount.value))
watch([q, pub, status], () => (queueCount.value = 25))
function clearFilters() { q.value = ''; pub.value = ''; status.value = '' }

// ---------- hero ----------
const hero = computed(() => {
  const review = countFor('ready_for_review')
  const failed = countFor('failed')
  const running = countFor('running')
  if (failed) return { word: 'FAILED', count: failed, tone: 'tone-red', line: `${failed} ${failed === 1 ? 'edition' : 'editions'} could not be ingested. Open ${failed === 1 ? 'it' : 'them'} to see why.` }
  if (review) return { word: 'REVIEW', count: review, tone: 'tone-accent', line: `${review} ${review === 1 ? 'edition is' : 'editions are'} ingested and waiting for an editor.` }
  if (running) return { word: 'INGEST', count: running, tone: 'tone-accent', line: `${running} ${running === 1 ? 'edition is' : 'editions are'} being extracted right now.` }
  // Nothing waiting at edition level: surface pages with text in no story (known for editions opened here).
  const pagesToFix = Object.entries(details).reduce((n, [, d]) => n + (d?.pages || []).filter(p => p.extractionStatus === 'needs_review').length, 0)
  if (pagesToFix) {
    const where = Object.keys(details).length === 1 ? (editions.value.find(e => details[e.documentId])?.sku || 'this edition') : 'the editions opened here'
    return { word: 'FIX', count: pagesToFix, tone: 'tone-red', line: `${pagesToFix} ${pagesToFix === 1 ? 'page' : 'pages'} in ${where} ${pagesToFix === 1 ? 'needs' : 'need'} review.` }
  }
  const published = countFor('published')
  return { word: 'CLEAR', count: published, tone: 'tone-green', line: `Nothing waiting. ${published} ${published === 1 ? 'edition' : 'editions'} published.` }
})
const clock = computed(() => new Date(now.value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))

// ---------- selected edition ----------
const selected = computed(() => editions.value.find(e => e.documentId === selectedId.value) || null)
const detail = computed(() => (selectedId.value ? details[selectedId.value] : null))
const pagesAll = computed(() => detail.value?.pages || [])
const hasPages = computed(() => (selected.value?.pageCount || pagesAll.value.length) > 0)
const totalPages = computed(() => pagesAll.value.length)
const needsReviewPages = computed(() => pagesAll.value.filter(p => pageState(p) === 'review'))
const pendingPages = computed(() => pagesAll.value.filter(p => pageState(p) === 'pending'))
const completePages = computed(() => pagesAll.value.filter(p => pageState(p) === 'checked').length)
const uncheckedPages = computed(() => pendingPages.value.length)

const PER_GRID_PAGE = 24
const pageFilter = ref('all')
const gridPage = ref(0)
const pageJump = ref('')
const pageFilters = computed(() => [
  { value: 'all', label: 'All', count: pagesAll.value.length },
  { value: 'review', label: 'Needs review', count: needsReviewPages.value.length },
  { value: 'pending', label: 'Pending', count: pendingPages.value.length },
  { value: 'checked', label: 'Checked', count: completePages.value }
])
const pagesFiltered = computed(() => pageFilter.value === 'all' ? pagesAll.value : pagesAll.value.filter(p => pageState(p) === pageFilter.value))
const gridPageCount = computed(() => Math.max(1, Math.ceil(pagesFiltered.value.length / PER_GRID_PAGE)))
const pagesShown = computed(() => pagesFiltered.value.slice(gridPage.value * PER_GRID_PAGE, (gridPage.value + 1) * PER_GRID_PAGE))
// Range labels use real page numbers ("p.1–24", "p.25–48"), which stay meaningful when filtered.
const gridRanges = computed(() => Array.from({ length: gridPageCount.value }, (_, i) => {
  const chunk = pagesFiltered.value.slice(i * PER_GRID_PAGE, (i + 1) * PER_GRID_PAGE)
  const a = chunk[0]?.pageNumber; const b = chunk.at(-1)?.pageNumber
  return a === b ? `p.${a}` : `p.${a}–${b}`
}))
watch([pageFilter, selectedId], () => (gridPage.value = 0))
watch(gridPageCount, n => { if (gridPage.value > n - 1) gridPage.value = n - 1 })
function jumpToPage() {
  const n = Number(pageJump.value)
  pageJump.value = ''
  if (!Number.isInteger(n)) return
  let idx = pagesFiltered.value.findIndex(p => p.pageNumber === n)
  if (idx < 0 && pageFilter.value !== 'all') { pageFilter.value = 'all'; idx = pagesAll.value.findIndex(p => p.pageNumber === n) }
  if (idx >= 0) nextTick(() => (gridPage.value = Math.floor(idx / PER_GRID_PAGE)))
}
const emptyPagesText = computed(() => ({
  review: 'No page needs review.',
  pending: 'No page is waiting to be checked.',
  checked: 'No page has been checked yet.'
}[pageFilter.value] || 'No pages yet. They appear once ingest has rendered the PDF.'))
const lowConfidence = computed(() => pagesAll.value.reduce((n, p) => n + (p.stories || []).filter(s => s.detectionConfidence != null && s.detectionConfidence < 0.4).length, 0))
const thumbStrip = computed(() => pagesAll.value.slice(1, 5).map(p => p.pageNumber))

// Checked: all text accounted for. Needs review: text missing from stories or in two. Pending: not checked yet.
const pageState = p => (p.extractionStatus === 'complete' || p.extractionStatus === 'skipped') ? 'checked' : p.extractionStatus === 'needs_review' ? 'review' : 'pending'
function pageChip(p) {
  const s = pageState(p)
  if (s === 'checked') return { text: 'Checked', cls: 'chip-green' }
  if (s === 'review') return { text: 'Needs review', cls: 'chip-red' }
  return { text: 'Pending', cls: 'chip-grey' }
}
function pageTitle(p) {
  const s = pageState(p)
  if (s === 'review') return `Page ${p.pageNumber}: ${p.unassignedWords ? `${p.unassignedWords} words are not in any story yet` : 'some text is missing from the stories'}. Click to fix.`
  if (s === 'pending') return `Page ${p.pageNumber}: not checked yet. Click to open it in the story editor.`
  return `Page ${p.pageNumber}: checked. Click to edit its stories.`
}

const stages = computed(() => {
  const e = selected.value || {}
  const s = detail.value?.summary || {}
  const running = isRunning(e)
  const failed = e.pipelineStatus === 'failed'
  const meta = statusMeta(e.pipelineStatus)
  return [
    { key: 'up', title: 'PDF upload', glyph: 'PDF', meta: `received ${fmtDateTime(e.createdAt)}`, note: 'Received', chip: 'chip-accent', edge: 'edge-accent', art: 'art-accent' },
    { key: 'pages', title: 'Pages', glyph: String(s.pageCount ?? e.pageCount ?? '–'), meta: failed ? 'rendering failed' : running ? 'rendering…' : `${s.pageCount ?? e.pageCount ?? 0} rendered`,
      note: failed ? 'Failed' : running ? 'In progress' : 'Rendered', chip: failed ? 'chip-red' : running ? 'chip-blue' : 'chip-green', edge: failed ? 'edge-red' : running ? 'edge-blue' : 'edge-green', art: failed ? 'art-red' : running ? 'art-blue' : 'art-green' },
    { key: 'stories', title: 'Stories', glyph: String(s.storyCount ?? '–'), meta: lowConfidence.value ? `${lowConfidence.value} low confidence` : 'detected on pages',
      note: needsReviewPages.value.length ? `${needsReviewPages.value.length} need review` : (uncheckedPages.value ? `${uncheckedPages.value} pending` : 'All checked'),
      chip: needsReviewPages.value.length ? 'chip-amber' : 'chip-green', edge: needsReviewPages.value.length ? 'edge-amber' : 'edge-green', art: needsReviewPages.value.length ? 'art-amber' : 'art-green' },
    { key: 'status', title: 'Edition', glyph: meta.short.slice(0, 3).toUpperCase(), meta: e.publishedAt ? `published ${fmtDateTime(e.publishedAt)}` : `updated ${fmtDateTime(e.updatedAt || e.createdAt)}`, note: meta.label,
      chip: failed ? 'chip-red' : e.pipelineStatus === 'published' ? 'chip-green' : running ? 'chip-blue' : 'chip-amber',
      edge: failed ? 'edge-red' : e.pipelineStatus === 'published' ? 'edge-green' : running ? 'edge-blue' : 'edge-amber',
      art: failed ? 'art-red' : e.pipelineStatus === 'published' ? 'art-green' : running ? 'art-blue' : 'art-amber' }
  ]
})

const readiness = computed(() => {
  const t = Math.max(totalPages.value, 1)
  return [
    { label: 'Checked', value: `${completePages.value}/${totalPages.value}`, pct: (completePages.value / t) * 100, fill: 'bg-emerald-500', edge: 'edge-green', note: 'Every piece of text on the page is in a story, or is a caption, advert or graphic.' },
    { label: 'Needs review', value: String(needsReviewPages.value.length), pct: (needsReviewPages.value.length / t) * 100, fill: 'bg-red-500', edge: needsReviewPages.value.length ? 'edge-red' : 'edge-grey', note: 'Some text is missing from the stories, or sits in two stories. Open the page to fix it.' },
    { label: 'Pending', value: String(pendingPages.value.length), pct: (pendingPages.value.length / t) * 100, fill: 'bg-slate-400', edge: pendingPages.value.length ? 'edge-amber' : 'edge-grey', note: 'Not checked yet. A page is checked when a story on it is saved, or when the edition is re-ingested.' }
  ]
})

const next = computed(() => {
  const e = selected.value
  if (!e) return { title: '', text: '' }
  if (e.pipelineStatus === 'failed') return { title: 'Fix the upload', text: 'Ingest stopped before pages were ready. Re-upload the PDF or check the ingest service.', to: `/editions/${e.documentId}`, cta: 'Open edition' }
  if (isRunning(e)) return { title: 'Ingest running', text: 'Pages and stories appear here as they are extracted. This desk refreshes on its own.' }
  const first = needsReviewPages.value[0]
  if (first) return { title: `${needsReviewPages.value.length} ${needsReviewPages.value.length === 1 ? 'page needs' : 'pages need'} review`, text: `Start with page ${first.pageNumber}: some of its text is not in any story yet.`, to: `/story-editor/${e.documentId}/${first.pageNumber}`, cta: `Review page ${first.pageNumber}` }
  if (uncheckedPages.value) return { title: `${uncheckedPages.value} pages pending`, text: 'These pages have not been checked yet. Re-ingest the edition to check them all, or open a page and save a story.', to: `/story-editor/${e.documentId}/${pendingPages.value[0].pageNumber}`, cta: `Open page ${pendingPages.value[0].pageNumber}` }
  return { title: 'All pages checked', text: 'Every page has all its text in stories.', to: `/editions/${e.documentId}`, cta: 'Open edition' }
})

const activity = computed(() => {
  const e = selected.value || {}
  const rows = [{ label: `PDF uploaded${e.sku ? ` as ${e.sku}` : ''}`, at: e.createdAt }]
  if (e.updatedAt && e.updatedAt !== e.createdAt) rows.push({ label: `Edition updated, status ${statusMeta(e.pipelineStatus).label.toLowerCase()}`, at: e.updatedAt })
  if (e.publishedAt) rows.push({ label: 'Published to readers', at: e.publishedAt })
  return rows.filter(r => r.at).sort((a, b) => new Date(b.at) - new Date(a.at))
})

// ---------- formatting ----------
const pubName = code => PUBLICATION_NAMES[code] || code || 'Unknown'
function fmtDate(iso, long = false) {
  if (!iso) return '–'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', long ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(iso) {
  if (!iso) return '–'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
</script>

<style scoped>
.desk {
  --ink: #0f1b2d; --accent: #2f55e4; --line: rgba(15, 27, 45, .08);
  font-family: 'Archivo', ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink); background: #eef1f5; min-height: calc(100vh - 70px);
}
.display { font-family: 'Archivo', ui-sans-serif, system-ui, sans-serif; font-weight: 800; letter-spacing: -.01em; }
.mono { font-family: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace; }
.text-ink { color: var(--ink); } .text-accent { color: var(--accent); }
.text-ink\/45 { color: rgba(15,27,45,.45); } .text-ink\/50 { color: rgba(15,27,45,.5); } .text-ink\/55 { color: rgba(15,27,45,.55); }
.text-ink\/60 { color: rgba(15,27,45,.6); } .text-ink\/70 { color: rgba(15,27,45,.7); } .text-ink\/75 { color: rgba(15,27,45,.75); } .text-ink\/80 { color: rgba(15,27,45,.8); }
.bg-ink\/5 { background: rgba(15,27,45,.05); } .bg-ink\/10 { background: rgba(15,27,45,.1); }
.ring-ink\/10 { --tw-ring-color: rgba(15,27,45,.1); } .divide-ink\/5 > * + * { border-color: rgba(15,27,45,.05); }
.hover\:ring-accent:hover { --tw-ring-color: var(--accent); }

/* hero band */
.hero { background: linear-gradient(100deg, #d9f3ee 0%, #cdebf1 45%, #d6e3f8 100%); border-bottom: 1px solid var(--line); }
.hero-inner { max-width: 1760px; margin: 0 auto; padding: 22px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 32px; }
.hero-inner > :nth-child(1) { flex: 0 1 240px; }
.hero-inner > :nth-child(2) { flex: 1 1 320px; }
.hero-inner > :nth-child(3) { flex: 0 1 auto; }
.hero-word { font-size: clamp(44px, 6vw, 76px); line-height: .9; font-weight: 900; letter-spacing: -.035em; }
.hero-num { color: var(--accent); }
.tone-red .hero-num { color: #d4312e; } .tone-green .hero-num { color: #0f8a5f; }
.seg { display: inline-flex; background: rgba(255,255,255,.55); border: 1px solid rgba(255,255,255,.8); border-radius: 12px; padding: 3px; backdrop-filter: blur(6px); }
.seg-light { background: rgba(15,27,45,.04); border-color: transparent; backdrop-filter: none; }
.seg-light .seg-btn { height: 30px; font-size: 12px; }
.seg-btn { height: 34px; padding: 0 12px; border-radius: 9px; font-size: 13px; color: rgba(15,27,45,.7); white-space: nowrap; }
.seg-btn:hover { color: var(--ink); }
.seg-on { background: #fff; color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(15,27,45,.08); }
.seg-n { font-family: 'IBM Plex Mono', ui-monospace, monospace; color: var(--accent); margin-left: 2px; }

/* panes */
.panes { max-width: 1760px; margin: 0 auto; display: grid; grid-template-columns: 290px minmax(0, 1fr) 330px; gap: 0; }
.pane-left { padding: 20px 16px 24px 24px; border-right: 1px solid var(--line); }
.pane-main { padding: 20px 20px 32px; min-width: 0; }
.pane-right { padding: 20px 24px 32px 4px; }
@media (max-width: 1280px) { .panes { grid-template-columns: 270px minmax(0, 1fr); } .pane-right { grid-column: 2; padding: 0 20px 32px; } }
@media (max-width: 900px) {
  .hero-inner > div:nth-child(2) { text-align: left; } .hero-inner > div:last-child { align-items: flex-start; }
  .panes { grid-template-columns: 1fr; } .pane-left { border-right: 0; padding: 16px; } .pane-main, .pane-right { grid-column: 1; padding: 0 16px 24px; }
  .seg { flex-wrap: wrap; }
}

.panel { background: #fff; border-radius: 14px; box-shadow: 0 1px 2px rgba(15,27,45,.05), 0 0 0 1px var(--line); }
.field { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; background: #fff; border: 1px solid var(--line); font-size: 13px; }
.queue-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 12px 11px 0; background: #fff; border-radius: 12px; box-shadow: 0 0 0 1px var(--line); overflow: hidden; }
.queue-item:hover { box-shadow: 0 0 0 1px rgba(47,85,228,.35); }
.queue-on { box-shadow: 0 0 0 2px var(--accent) !important; background: #f6f8ff; }
.queue-bar { align-self: stretch; width: 4px; border-radius: 0 4px 4px 0; margin-right: 2px; }

.stage-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 12px; border-radius: 16px; background: #f5f7ff; box-shadow: inset 0 0 0 2px rgba(47,85,228,.55); }
@media (max-width: 1100px) { .stage-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.stage { background: #fff; border-radius: 12px; padding: 10px 12px 12px; border-top: 4px solid; box-shadow: 0 0 0 1px var(--line); }
.stage-art { height: 64px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #fff; }
.art-accent { background: linear-gradient(135deg, #9fb8ff, #5f83f2); } .art-green { background: linear-gradient(135deg, #8ee6cf, #2fbf95); }
.art-blue { background: linear-gradient(135deg, #a8d8ff, #4a9df0); } .art-amber { background: linear-gradient(135deg, #ffd98a, #f3a93a); }
.art-red { background: linear-gradient(135deg, #ffb2a4, #e5604d); }
.edge-accent { border-top-color: var(--accent); } .edge-green { border-top-color: #22b389; } .edge-blue { border-top-color: #3b8ff0; }
.edge-amber { border-top-color: #f0a42f; } .edge-red { border-top-color: #e04d3a; } .edge-grey { border-left-color: rgba(15,27,45,.15) !important; }

.chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 7px; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.chip .dot { width: 6px; height: 6px; border-radius: 9999px; background: currentColor; flex-shrink: 0; }
.chip-accent { background: #e8edff; color: #2442c4; } .chip-green { background: #e3f7ef; color: #0f7a55; } .chip-blue { background: #e4f1fe; color: #1f6fc4; }
.chip-amber { background: #fff2dc; color: #9a5a05; } .chip-red { background: #fde8e5; color: #b3261e; } .chip-grey { background: rgba(15,27,45,.06); color: rgba(15,27,45,.6); }

.page-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 12px; }
.page-card { display: block; background: #fff; border-radius: 10px; box-shadow: 0 0 0 1px var(--line); transition: box-shadow .12s; }
.page-card:hover { box-shadow: 0 0 0 2px var(--accent); }
.page-warn { box-shadow: 0 0 0 1.5px #e8847a; }

.ready-row { margin-top: 12px; padding: 10px 12px; border-radius: 10px; border-left: 4px solid; background: #fafbfd; box-shadow: 0 0 0 1px var(--line); }
.ready-row.edge-green { border-left-color: #22b389; } .ready-row.edge-red { border-left-color: #e04d3a; } .ready-row.edge-amber { border-left-color: #f0a42f; }

.next-card { padding: 16px; border-radius: 14px; background: #fff; box-shadow: 0 0 0 1px var(--line), 0 10px 24px -12px rgba(15,27,45,.25); border-top: 4px solid #22b389; transform: rotate(-.6deg); }

.btn-ink { display: inline-flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 10px; background: #0f1b2d; color: #fff !important; font-size: 13px; font-weight: 600; white-space: nowrap; }
.btn-ink:hover { background: #24344e; }
.btn-ghost { display: inline-flex; align-items: center; height: 36px; padding: 0 12px; border-radius: 10px; background: #fff; color: #0f1b2d; box-shadow: 0 0 0 1px rgba(15,27,45,.12); font-size: 13px; font-weight: 500; white-space: nowrap; }
.btn-ghost:hover:not(:disabled) { background: #fff; } .btn-ghost:disabled { opacity: .5; }
.btn-soft { height: 32px; padding: 0 12px; border-radius: 9px; font-size: 12px; background: rgba(15,27,45,.05); white-space: nowrap; }
.btn-soft:disabled { opacity: .4; cursor: not-allowed; }
.border-ink\/5 { border-color: rgba(15,27,45,.06); }
.btn-soft-on { background: #e8edff; color: #2442c4; box-shadow: inset 0 0 0 1px rgba(47,85,228,.4); }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .next-card { transform: none; } .page-card { transition: none; } }
</style>
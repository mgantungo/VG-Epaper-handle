<!--
  File:      /var/www/VGEpaper/apps/handle/app/pages/editions/[id].vue
  Repo path: apps/handle/app/pages/editions/[id].vue
  System:    apps/handle (Nuxt 4)          MODIFIED

  Changes: per-page extraction status, "Edit stories on this page" link to
  the story editor, red ring on pages with unclaimed text, summary card.
-->
<template>
  <div class="max-w-7xl mx-auto px-6 py-6">
    <NuxtLink to="/" class="text-sm text-neutral-500 hover:text-neutral-900">← Editions</NuxtLink>

    <div v-if="pending && !data" class="text-neutral-400 text-sm py-8 text-center">Loading…</div>
    <div v-else-if="error" class="text-red-600 text-sm py-8 text-center">
      Could not load this edition: {{ error.statusMessage || error.message }}
    </div>

    <template v-else>
      <!-- Heading -->
      <div class="flex flex-wrap items-start justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 class="font-serif font-bold text-2xl">{{ edition.publicationCode }} — {{ edition.date }}</h1>
          <p class="text-sm text-neutral-500 mt-1">
            Vol {{ edition.volume || '—' }} / Issue {{ edition.issueNumber || '—' }}
            <span v-if="edition.sku" class="font-mono ml-2 text-neutral-400">{{ edition.sku }}</span>
          </p>
          <p class="text-xs text-neutral-400 mt-1">
            Created {{ fmtDate(edition.createdAt) }}
            <template v-if="edition.updatedAt">, last updated {{ fmtDate(edition.updatedAt) }}</template>
          </p>
        </div>
        <StatusBadge :status="edition.pipelineStatus" />
      </div>

      <div v-if="edition.pipelineError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6">
        <strong>Pipeline error:</strong> {{ edition.pipelineError }}
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="text-2xl font-bold">{{ summary.pageCount }}</div>
          <div class="text-xs text-neutral-500 mt-1">Pages</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="text-2xl font-bold">{{ summary.storyCount }}</div>
          <div class="text-xs text-neutral-500 mt-1">Stories detected</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="text-2xl font-bold" :class="summary.pagesWithNoStories ? 'text-amber-600' : ''">{{ summary.pagesWithNoStories }}</div>
          <div class="text-xs text-neutral-500 mt-1">Pages with no stories</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="text-2xl font-bold" :class="lowConfidenceCount ? 'text-amber-600' : ''">{{ lowConfidenceCount }}</div>
          <div class="text-xs text-neutral-500 mt-1">Stories under 40% confidence</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4">
          <div class="text-2xl font-bold" :class="summary.pagesNeedingReview ? 'text-red-600' : ''">{{ summary.pagesNeedingReview || 0 }}</div>
          <div class="text-xs text-neutral-500 mt-1">Pages with unclaimed text</div>
        </div>
      </div>

      <div v-if="!pages.length" class="bg-white rounded-xl shadow-sm p-8 text-center text-neutral-400 text-sm">
        No pages yet — ingest may still be running.
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <!-- Page viewer -->
        <div>
          <div class="bg-white rounded-xl shadow-sm p-3">
            <div class="flex items-center justify-between gap-3 mb-3">
              <button class="nav-btn" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">← Prev</button>
              <div class="text-sm text-neutral-600 text-center">
                Page <strong>{{ currentPage.pageNumber }}</strong> of {{ pages.length }}
                <span v-if="currentPage.section" class="text-neutral-400">· {{ currentPage.section }}</span>
              </div>
              <button class="nav-btn" :disabled="currentIndex === pages.length - 1" @click="goTo(currentIndex + 1)">Next →</button>
            </div>

            <div class="flex items-center justify-between gap-3 mb-3 text-xs">
              <span v-if="currentPage.extractionStatus === 'needs_review'" class="px-2 py-0.5 rounded bg-red-50 text-red-700">
                Needs review<template v-if="currentPage.unassignedWords"> · {{ currentPage.unassignedWords }} words in no story</template>
              </span>
              <span v-else-if="currentPage.extractionStatus === 'complete'" class="px-2 py-0.5 rounded bg-green-50 text-green-700">All text accounted for</span>
              <span v-else />
              <NuxtLink :to="`/story-editor/${route.params.id}/${currentPage.pageNumber}`" class="nav-btn">Edit stories on this page</NuxtLink>
            </div>

            <!-- The box is sized from the image's real dimensions before it
                 loads, so hotspots never collapse into thin lines. -->
            <div class="relative w-full bg-neutral-100 rounded-lg overflow-hidden" :style="{ aspectRatio: pageAspect }">
              <img
                :key="imageSrc"
                :src="imageSrc"
                :alt="`Page ${currentPage.pageNumber}`"
                class="absolute inset-0 w-full h-full object-contain"
                @load="imageState = 'ok'"
                @error="imageState = 'error'"
              >
              <div v-if="imageState === 'loading'" class="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                Loading page image…
              </div>
              <div v-if="imageState === 'error'" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-red-600 p-6 text-center">
                <span>The image for page {{ currentPage.pageNumber }} didn't load.</span>
                <a :href="imageSrc" target="_blank" class="underline text-neutral-600">Open the image request to see the error</a>
              </div>

              <template v-if="showHotspots">
                <button
                  v-for="(s, i) in currentPage.stories" :key="s.documentId"
                  class="absolute border-2 rounded-sm text-left"
                  :class="hotspotClass(s)"
                  :style="boxStyle(s)"
                  :title="s.headline"
                  @mouseenter="hoveredStory = s.documentId"
                  @mouseleave="hoveredStory = null"
                  @click="openStory(s.documentId)"
                >
                  <span class="absolute -top-px -left-px text-[10px] font-bold leading-none px-1 py-0.5 bg-blue-600 text-white rounded-br">{{ i + 1 }}</span>
                </button>
              </template>
            </div>

            <label class="flex items-center gap-2 text-xs text-neutral-500 mt-3 select-none">
              <input v-model="showHotspots" type="checkbox"> Show story boxes
            </label>
          </div>

          <!-- Page jump strip; amber = no stories detected, red ring = text in no story -->
          <div class="flex flex-wrap gap-1.5 mt-4">
            <button
              v-for="(p, i) in pages" :key="p.pageNumber"
              class="w-9 h-9 rounded-lg text-xs flex items-center justify-center"
              :class="[
                i === currentIndex ? 'bg-neutral-900 text-white' :
                p.storyCount === 0 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                'bg-white text-neutral-600 hover:bg-neutral-100 shadow-sm',
                p.extractionStatus === 'needs_review' ? 'ring-2 ring-red-400' : ''
              ]"
              :title="`Page ${p.pageNumber}${p.section ? ' · ' + p.section : ''} — ${p.storyCount} stories${p.extractionStatus === 'needs_review' ? ' · needs review' : ''}`"
              @click="goTo(i)"
            >{{ p.pageNumber }}</button>
          </div>
        </div>

        <!-- Stories on this page -->
        <div class="lg:sticky lg:top-4">
          <h2 class="font-serif font-bold text-base mb-3">Stories on this page ({{ currentPage.stories.length }})</h2>
          <div class="bg-white rounded-xl shadow-sm divide-y divide-neutral-100 lg:max-h-[calc(100vh-7rem)] overflow-y-auto">
            <button
              v-for="(s, i) in currentPage.stories" :key="s.documentId"
              class="w-full text-left p-3 flex gap-3 hover:bg-neutral-50"
              :class="{ 'bg-blue-50': hoveredStory === s.documentId }"
              @mouseenter="hoveredStory = s.documentId"
              @mouseleave="hoveredStory = null"
              @click="openStory(s.documentId)"
            >
              <span class="shrink-0 w-6 h-6 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium leading-snug line-clamp-3">{{ s.headline || 'Untitled story' }}</span>
                <span v-if="s.teaser" class="block text-xs text-neutral-500 mt-1 line-clamp-2">{{ s.teaser }}</span>
                <span class="flex items-center gap-2 mt-1.5 text-[11px] text-neutral-400">
                  <span>{{ wordCount(s.body) }} words</span>
                  <span v-if="s.byline">· {{ s.byline }}</span>
                  <span v-if="s.source">· {{ s.source }}</span>
                  <span
                    v-if="s.detectionConfidence != null"
                    class="ml-auto px-1.5 py-0.5 rounded"
                    :class="s.detectionConfidence < 0.4 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'"
                  >{{ pct(s.detectionConfidence) }}</span>
                </span>
              </span>
            </button>
            <div v-if="!currentPage.stories.length" class="p-6 text-center text-neutral-400 text-sm">
              No stories detected on this page.
            </div>
          </div>
        </div>
      </div>

      <h2 class="font-serif font-bold text-lg mt-10 mb-3">Ingest log</h2>
      <div class="bg-white rounded-xl shadow-sm p-6 text-sm text-neutral-400">
        Per-stage logging isn't wired up yet. Current visibility is the status and pipeline error above.
      </div>
    </template>

    <!-- Story detail panel -->
    <Teleport to="body">
      <div v-if="selectedStory" class="fixed inset-0 z-50 flex justify-end">
        <div class="absolute inset-0 bg-black/30" @click="closeStory" />
        <aside class="relative w-full max-w-2xl h-full bg-white shadow-xl flex flex-col" role="dialog" aria-modal="true">
          <header class="flex items-center justify-between gap-3 px-6 py-3 border-b border-neutral-100">
            <div class="text-sm text-neutral-500">
              Page {{ currentPage.pageNumber }}, story {{ selectedIndex + 1 }} of {{ currentPage.stories.length }}
            </div>
            <div class="flex items-center gap-2">
              <button class="nav-btn" :disabled="selectedIndex === 0" @click="stepStory(-1)">← Prev</button>
              <button class="nav-btn" :disabled="selectedIndex === currentPage.stories.length - 1" @click="stepStory(1)">Next →</button>
              <button class="nav-btn" aria-label="Close" @click="closeStory">Close</button>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto px-6 py-5">
            <h2 class="font-serif font-bold text-2xl leading-tight">{{ selectedStory.headline || 'Untitled story' }}</h2>
            <p v-if="selectedStory.teaser" class="text-neutral-600 mt-3 leading-relaxed">{{ selectedStory.teaser }}</p>
            <p v-if="selectedStory.byline" class="text-sm text-neutral-500 mt-2">By {{ selectedStory.byline }}</p>

            <!-- Crop of the page showing exactly the detected region -->
            <div class="mt-5">
              <div class="text-xs text-neutral-500 mb-1.5">Detected region on the page</div>
              <div class="max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-neutral-100">
                <div class="w-full bg-no-repeat" :style="cropStyle(selectedStory)" />
              </div>
            </div>

            <dl class="grid grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm">
              <div><dt class="text-xs text-neutral-500">Confidence</dt><dd>{{ selectedStory.detectionConfidence != null ? pct(selectedStory.detectionConfidence) : '—' }}</dd></div>
              <div><dt class="text-xs text-neutral-500">Source</dt><dd>{{ selectedStory.source || '—' }}</dd></div>
              <div><dt class="text-xs text-neutral-500">Words in body</dt><dd>{{ wordCount(selectedStory.body) }}</dd></div>
              <div><dt class="text-xs text-neutral-500">Section</dt><dd>{{ currentPage.section || '—' }}</dd></div>
              <div class="col-span-2">
                <dt class="text-xs text-neutral-500">Position (top, left, width, height — % of page)</dt>
                <dd class="font-mono text-xs mt-0.5">{{ num(selectedStory.top) }}, {{ num(selectedStory.left) }}, {{ num(selectedStory.width) }}, {{ num(selectedStory.height) }}</dd>
              </div>
              <div class="col-span-2"><dt class="text-xs text-neutral-500">Document ID</dt><dd class="font-mono text-xs mt-0.5 break-all">{{ selectedStory.documentId }}</dd></div>
              <div><dt class="text-xs text-neutral-500">Created</dt><dd>{{ fmtDate(selectedStory.createdAt) }}</dd></div>
              <div><dt class="text-xs text-neutral-500">Updated</dt><dd>{{ fmtDate(selectedStory.updatedAt) }}</dd></div>
              <div><dt class="text-xs text-neutral-500">Published</dt><dd>{{ selectedStory.publishedAt ? fmtDate(selectedStory.publishedAt) : 'Draft' }}</dd></div>
            </dl>

            <div class="mt-6">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs text-neutral-500">Body</div>
                <button v-if="selectedStory.body" class="text-xs text-neutral-500 underline" @click="copy(selectedStory.body)">{{ copied ? 'Copied' : 'Copy text' }}</button>
              </div>
              <div v-if="selectedStory.body" class="font-serif text-[15px] leading-7 whitespace-pre-line text-neutral-800 max-w-prose">{{ selectedStory.body }}</div>
              <div v-else class="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">No body text was extracted for this story.</div>
            </div>

            <div v-if="extraFields.length" class="mt-6">
              <div class="text-xs text-neutral-500 mb-2">Other fields</div>
              <table class="w-full text-xs">
                <tbody>
                  <tr v-for="[k, v] in extraFields" :key="k" class="border-t border-neutral-100 align-top">
                    <td class="py-1.5 pr-4 font-mono text-neutral-500 whitespace-nowrap">{{ k }}</td>
                    <td class="py-1.5 break-all whitespace-pre-wrap">{{ fmtValue(v) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()
const api = useHandleApi()

const { data, pending, error } = await useAsyncData(`edition-${route.params.id}`, () => api.getEdition(route.params.id))
const edition = computed(() => data.value?.edition || {})
const pages = computed(() => data.value?.pages || [])
const summary = computed(() => data.value?.summary || { pageCount: 0, storyCount: 0, pagesWithNoStories: 0, pagesNeedingReview: 0 })
const lowConfidenceCount = computed(() =>
  pages.value.reduce((n, p) => n + (p.stories || []).filter(s => s.detectionConfidence != null && s.detectionConfidence < 0.4).length, 0)
)

// ── Page navigation (kept in the URL so refresh / sharing keeps your place)
function indexFromQuery() {
  const n = Number(route.query.page)
  const i = pages.value.findIndex(p => p.pageNumber === n)
  return i >= 0 ? i : 0
}
const currentIndex = ref(indexFromQuery())
const currentPage = computed(() => {
  const p = pages.value[currentIndex.value]
  return p ? { ...p, stories: p.stories || [] } : { pageNumber: 0, stories: [] }
})

const imageSrc = computed(() => `/api/editions/${route.params.id}/pages/${currentPage.value.pageNumber}`)
const imageState = ref('loading')
watch(imageSrc, () => { imageState.value = 'loading' })
onMounted(() => {
  // The image may finish loading before hydration attaches @load.
  const img = document.querySelector(`img[alt="Page ${currentPage.value.pageNumber}"]`)
  if (img?.complete) imageState.value = img.naturalWidth ? 'ok' : 'error'
})

const pageAspect = computed(() => {
  const { imageWidth: w, imageHeight: h } = currentPage.value
  return w && h ? `${w} / ${h}` : '5 / 7'
})

const showHotspots = ref(true)
const hoveredStory = ref(null)
const selectedId = ref(route.query.story || null)

function syncQuery() {
  const query = { ...route.query, page: String(currentPage.value.pageNumber) }
  if (selectedId.value) query.story = selectedId.value
  else delete query.story
  router.replace({ query })
}

function goTo(index) {
  if (index < 0 || index >= pages.value.length) return
  currentIndex.value = index
  hoveredStory.value = null
  selectedId.value = null
  syncQuery()
}

// ── Story detail
const selectedIndex = computed(() => currentPage.value.stories.findIndex(s => s.documentId === selectedId.value))
const selectedStory = computed(() => selectedIndex.value >= 0 ? currentPage.value.stories[selectedIndex.value] : null)

function openStory(id) { selectedId.value = id; syncQuery() }
function closeStory() { selectedId.value = null; syncQuery() }
function stepStory(delta) {
  const next = currentPage.value.stories[selectedIndex.value + delta]
  if (next) openStory(next.documentId)
}

const KNOWN = new Set(['id', 'documentId', 'headline', 'teaser', 'body', 'byline', 'source', 'detectionConfidence',
  'top', 'left', 'width', 'height', 'createdAt', 'updatedAt', 'publishedAt', 'locale'])
const extraFields = computed(() =>
  selectedStory.value ? Object.entries(selectedStory.value).filter(([k, v]) => !KNOWN.has(k) && v != null && v !== '') : []
)

// ── Geometry
function boxStyle(s) {
  return { top: `${s.top}%`, left: `${s.left}%`, width: `${s.width}%`, height: `${s.height}%` }
}
function hotspotClass(s) {
  if (s.documentId === selectedId.value) return 'border-blue-600 bg-blue-600/25'
  if (s.documentId === hoveredStory.value) return 'border-blue-500 bg-blue-500/20'
  return 'border-blue-400/70 bg-blue-400/10 hover:bg-blue-400/20'
}
function cropStyle(s) {
  const w = Math.max(Number(s.width) || 100, 0.1)
  const h = Math.max(Number(s.height) || 100, 0.1)
  const l = Number(s.left) || 0
  const t = Number(s.top) || 0
  const { imageWidth: iw = 5, imageHeight: ih = 7 } = currentPage.value
  return {
    backgroundImage: `url("${imageSrc.value}")`,
    backgroundSize: `${(100 / w) * 100}% ${(100 / h) * 100}%`,
    backgroundPosition: `${w >= 100 ? 0 : (l / (100 - w)) * 100}% ${h >= 100 ? 0 : (t / (100 - h)) * 100}%`,
    aspectRatio: `${w * (iw || 5)} / ${h * (ih || 7)}`
  }
}

// ── Formatting
const pct = v => `${Math.round(v * 100)}%`
const num = v => (v == null ? '—' : Number(v).toFixed(2))
const wordCount = t => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0)
function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? String(v) : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}
const fmtValue = v => (typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v))

const copied = ref(false)
async function copy(text) {
  try { await navigator.clipboard.writeText(text); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch {}
}

// ── Keyboard: ←/→ change page, or change story while the panel is open; Esc closes
function onKeydown(e) {
  if (e.target.closest?.('input, textarea, select')) return
  if (selectedStory.value) {
    if (e.key === 'Escape') closeStory()
    if (e.key === 'ArrowLeft') stepStory(-1)
    if (e.key === 'ArrowRight') stepStory(1)
    return
  }
  if (e.key === 'ArrowLeft') goTo(currentIndex.value - 1)
  if (e.key === 'ArrowRight') goTo(currentIndex.value + 1)
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.nav-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #f5f5f5;
}
.nav-btn:hover:not(:disabled) { background: #e5e5e5; }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
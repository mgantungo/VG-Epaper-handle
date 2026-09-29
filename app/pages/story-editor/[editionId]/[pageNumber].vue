<!--
  File:      /var/www/VGEpaper/handle/app/pages/story-editor/[editionId]/[pageNumber].vue
  Repo path: apps/handle/app/pages/story-editor/[editionId]/[pageNumber].vue
  System:    apps/handle (Nuxt 4, handle.epapers.visiongroup.co.ug)          REPLACE
  URL:       /story-editor/<editionDocumentId>/<pageNumber>

  Story editor.
    Edit a story:  pick it in the list (or click its box on the page) → Edit
                   → Title to redraw the headline box, or Body to add/redraw
                   columns → Save story.
    New story:     New story → Title → drag over the headline → Body → drag
                   over each column in reading order → Save story.
  Boxes can be moved and resized; columns can be reordered or removed.
  Keys: T title · B body · Esc stop drawing · Ctrl/Cmd+Z undo · Ctrl/Cmd+S save.
-->
<template>
  <div class="max-w-[1500px] mx-auto px-4 lg:px-6 py-5">
    <!-- Top bar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <NuxtLink :to="`/editions/${editionId}?page=${pageNumber}`" class="text-sm text-neutral-500 hover:text-neutral-900">← Edition</NuxtLink>
      <h1 class="font-serif font-bold text-xl">
        Page {{ pageNumber }}<span v-if="state?.page.section" class="font-normal text-neutral-500">, {{ state.page.section }}</span>
      </h1>
      <span v-if="state" class="text-xs px-2 py-1 rounded-full" :class="ledgerChip.cls">{{ ledgerChip.text }}</span>
      <div class="ml-auto flex items-center gap-1.5">
        <button class="btn" :disabled="pageNumber <= 1" @click="goPage(pageNumber - 1)">← Prev</button>
        <form class="flex items-center gap-1" @submit.prevent="goPage(Number(jumpTo))">
          <label for="jump" class="sr-only">Go to page</label>
          <input id="jump" v-model="jumpTo" inputmode="numeric" class="w-14 h-9 text-center text-sm border border-neutral-200 rounded-lg" :placeholder="String(pageNumber)">
        </form>
        <button class="btn" @click="goPage(pageNumber + 1)">Next →</button>
      </div>
    </div>

    <div v-if="loading && !state" class="py-24 text-center text-sm text-neutral-400">Loading page…</div>
    <div v-else-if="loadError" class="py-24 text-center">
      <p class="text-sm text-red-600">{{ loadError }}</p>
      <button class="btn mt-4" @click="load">Try again</button>
    </div>

    <div v-else-if="state" class="grid gap-5 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
      <!-- ============ Page canvas ============ -->
      <section class="bg-white rounded-xl shadow-sm p-3">
        <!-- Toolbar -->
        <div class="flex flex-wrap items-center gap-2 mb-3 min-h-9">
          <template v-if="mode === 'browse'">
            <button class="btn-primary" @click="startNew">+ New story</button>
            <button class="btn" :disabled="!selected" @click="selected && startEdit(selected)">Edit selected</button>
            <span class="text-xs text-neutral-500 ml-1">Click a story on the page or in the list to select it.</span>
          </template>
          <template v-else>
            <div class="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50" role="group" aria-label="Drawing tool">
              <button class="tool" :class="tool === 'title' ? 'tool-on-title' : ''" :aria-pressed="tool === 'title'" @click="setTool('title')">
                <span class="w-2.5 h-2.5 rounded-sm bg-amber-500" aria-hidden="true" /> Title <kbd>T</kbd>
              </button>
              <button class="tool" :class="[tool === 'body' ? 'tool-on-body' : '', nudgeBody ? 'ring-2 ring-blue-400' : '']" :aria-pressed="tool === 'body'" @click="setTool('body')">
                <span class="w-2.5 h-2.5 rounded-sm bg-blue-600" aria-hidden="true" /> Body <kbd>B</kbd>
              </button>
            </div>
            <button class="btn" :disabled="!history.length" title="Undo (Ctrl+Z)" @click="undo">Undo</button>
            <button v-if="draft.columns.length" class="btn" @click="clearColumns">Redraw columns</button>
            <span class="text-xs text-neutral-600 ml-1">{{ hint }}</span>
          </template>
          <div class="ml-auto flex items-center gap-1">
            <button v-for="z in [1, 1.5, 2]" :key="z" class="zoom" :class="zoom === z ? 'bg-neutral-900 text-white' : ''" @click="zoom = z">{{ z * 100 }}%</button>
          </div>
        </div>

        <div class="relative overflow-auto rounded-lg border border-neutral-200 bg-neutral-100 max-h-[calc(100vh-11rem)]">
          <div
            ref="canvasEl"
            class="relative select-none touch-none"
            :class="canvasCursor"
            :style="{ width: `${zoom * 100}%` }"
            @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
          >
            <img :src="`/api/editions/${editionId}/pages/${pageNumber}`" class="block w-full pointer-events-none" draggable="false" alt="">

            <template v-if="show.excluded">
              <div v-for="(x, i) in state.exclusions" :key="`x${i}`" class="absolute bg-neutral-600/15 pointer-events-none" :style="boxStyle(x)" />
            </template>
            <template v-if="show.unclaimed">
              <div v-for="(u, i) in state.ledger.unassigned" :key="`u${i}`" class="absolute bg-red-500/25 outline outline-1 outline-red-500 pointer-events-none" :style="boxStyle(u)" :title="u.text" />
            </template>

            <!-- Saved stories -->
            <template v-for="s in visibleStories" :key="s.documentId">
              <div
                v-for="(r, i) in s.layout" :key="i"
                class="absolute rounded-sm transition-colors"
                :class="[savedBoxClass(s), mode === 'browse' ? 'cursor-pointer' : 'pointer-events-none']"
                :style="boxStyle(r)"
                :title="s.headline"
                data-story="1"
                @click.stop="mode === 'browse' && select(s.documentId)"
                @dblclick.stop="mode === 'browse' && startEdit(s)"
                @mouseenter="hoveredId = s.documentId"
                @mouseleave="hoveredId = null"
              >
                <span v-if="i === 0 && mode === 'browse'" class="absolute -top-2.5 -left-2.5 min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold flex items-center justify-center pointer-events-none" :class="numberTagClass(s)">{{ storyNumber[s.documentId] }}</span>
              </div>
            </template>

            <!-- Draft -->
            <template v-if="mode !== 'browse'">
              <div v-if="draft.title" class="absolute border-2 border-amber-500 bg-amber-400/15 cursor-move" :style="boxStyle(draft.title)" data-kind="title">
                <span class="badge bg-amber-500">Title</span>
                <button class="box-x" aria-label="Remove title box" @pointerdown.stop @click.stop="removeTitle">×</button>
                <span class="handle border-amber-500" data-handle="se" aria-hidden="true" />
              </div>
              <div v-for="(c, i) in draft.columns" :key="`c${i}`" class="absolute border-2 border-blue-600 bg-blue-500/15 cursor-move" :style="boxStyle(c)" data-kind="column" :data-index="i">
                <span class="badge bg-blue-600">{{ i + 1 }}</span>
                <button class="box-x" :aria-label="`Remove column ${i + 1}`" @pointerdown.stop @click.stop="removeColumn(i)">×</button>
                <span class="handle border-blue-600" data-handle="se" aria-hidden="true" />
              </div>
            </template>
            <div v-if="rubber" class="absolute border-2 border-dashed pointer-events-none" :class="tool === 'title' ? 'border-amber-500' : 'border-blue-600'" :style="boxStyle(rubber)" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-neutral-600">
          <label class="flex items-center gap-1.5"><input v-model="show.stories" type="checkbox"> Other stories</label>
          <label class="flex items-center gap-1.5"><input v-model="show.unclaimed" type="checkbox"> <span class="w-3 h-3 bg-red-500/40 outline outline-1 outline-red-500" aria-hidden="true" /> Text in no story</label>
          <label class="flex items-center gap-1.5"><input v-model="show.excluded" type="checkbox"> <span class="w-3 h-3 bg-neutral-600/25" aria-hidden="true" /> Captions, graphics, adverts</label>
        </div>
      </section>

      <!-- ============ Side panel ============ -->
      <aside class="space-y-4 xl:sticky xl:top-4">
        <!-- Editing panel -->
        <section v-if="mode !== 'browse'" class="bg-white rounded-xl shadow-sm p-4 border-2" :class="mode === 'create' ? 'border-blue-600' : 'border-amber-500'">
          <div class="flex items-center justify-between">
            <h2 class="font-serif font-bold">{{ mode === 'create' ? 'New story' : 'Editing story' }}</h2>
            <span v-if="dirty" class="text-[11px] text-amber-700">Unsaved changes</span>
          </div>

          <ol class="mt-3 space-y-2 text-sm">
            <li class="flex items-center gap-2 rounded-lg px-2 py-1.5" :class="tool === 'title' ? 'bg-amber-50' : ''">
              <span class="step" :class="draft.title ? 'bg-amber-500 text-white' : 'bg-neutral-100 text-neutral-500'">{{ draft.title ? '✓' : '1' }}</span>
              <button class="flex-1 text-left" @click="setTool('title')">Title box</button>
              <span class="text-xs text-neutral-500">{{ draft.title ? 'Set' : 'Not set' }}</span>
            </li>
            <li class="rounded-lg px-2 py-1.5" :class="tool === 'body' ? 'bg-blue-50' : ''">
              <div class="flex items-center gap-2">
                <span class="step" :class="draft.columns.length ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-500'">{{ draft.columns.length ? '✓' : '2' }}</span>
                <button class="flex-1 text-left" @click="setTool('body')">Body columns</button>
                <span class="text-xs text-neutral-500">{{ draft.columns.length }} in reading order</span>
              </div>
              <ul v-if="draft.columns.length" class="mt-2 ml-8 space-y-1">
                <li v-for="(c, i) in draft.columns" :key="`l${i}`" class="flex items-center gap-2 text-xs">
                  <span class="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center">{{ i + 1 }}</span>
                  <span class="flex-1 text-neutral-600">Column {{ i + 1 }}</span>
                  <button class="icon-btn" :disabled="i === 0" :aria-label="`Move column ${i + 1} earlier`" @click="moveColumn(i, -1)">↑</button>
                  <button class="icon-btn" :disabled="i === draft.columns.length - 1" :aria-label="`Move column ${i + 1} later`" @click="moveColumn(i, 1)">↓</button>
                  <button class="icon-btn text-red-600" :aria-label="`Remove column ${i + 1}`" @click="removeColumn(i)">×</button>
                </li>
              </ul>
            </li>
          </ol>

          <label class="block text-xs text-neutral-600 mt-4">Headline
            <input v-model="draft.headline" class="mt-1 w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm" :placeholder="preview?.headline || 'Taken from the title box'">
          </label>

          <div class="mt-4">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-neutral-500">Text readers will see</span>
              <span v-if="compiling" class="text-[11px] text-neutral-400">Updating…</span>
              <span v-else-if="preview" class="text-[11px] text-neutral-400">{{ preview.wordCount }} words</span>
            </div>
            <div class="rounded-lg bg-neutral-50 border border-neutral-100 p-3 max-h-80 overflow-auto">
              <template v-if="preview">
                <p v-if="preview.kicker" class="text-xs text-neutral-500">{{ preview.kicker }}</p>
                <p class="font-serif font-bold leading-snug">{{ draft.headline || preview.headline || 'No title box yet' }}</p>
                <p v-if="preview.byline" class="text-xs text-neutral-500 mt-1">By {{ preview.byline }}</p>
                <p class="font-serif text-[13px] leading-6 whitespace-pre-line mt-2 text-neutral-800">{{ preview.body }}</p>
              </template>
              <p v-else class="text-xs text-neutral-500">Draw at least one body column to see the story text here.</p>
            </div>
            <p v-for="(j, i) in preview?.suspiciousJoins || []" :key="i" class="mt-2 text-xs text-amber-800 bg-amber-50 rounded-lg p-2">
              Column order may be wrong: "…{{ j.after }}" is followed by "{{ j.before }}…". Check the order of the columns above.
            </p>
          </div>

          <p v-if="actionError" class="mt-3 text-xs text-red-600">{{ actionError }}</p>
          <div class="flex items-center justify-end gap-2 mt-4">
            <button class="btn" :disabled="busy" @click="cancelEdit">Cancel</button>
            <button class="btn-primary" :disabled="busy || !draft.columns.length" @click="save">{{ busy ? 'Saving…' : 'Save story' }}</button>
          </div>
        </section>

        <!-- Stories list -->
        <section class="bg-white rounded-xl shadow-sm">
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 class="font-serif font-bold">Stories on this page</h2>
            <button v-if="mode === 'browse'" class="text-sm text-blue-700 hover:underline" @click="startNew">+ New</button>
          </div>
          <p v-if="notice" class="mx-4 mb-2 text-xs text-green-800 bg-green-50 rounded-lg p-2">{{ notice }}</p>
          <p v-if="!state.stories.length" class="px-4 pb-4 text-sm text-neutral-500">No stories on this page yet. Use New story to draw the first one.</p>
          <ul class="divide-y divide-neutral-100 max-h-[55vh] overflow-auto">
            <li
              v-for="s in sortedStories" :key="s.documentId" :ref="el => (rowEls[s.documentId] = el)"
              class="px-4 py-3 cursor-pointer"
              :class="[s.documentId === selectedId ? 'bg-blue-50' : (s.documentId === hoveredId ? 'bg-neutral-50' : 'hover:bg-neutral-50'), s.documentId === draft.storyDocumentId ? 'ring-2 ring-inset ring-amber-500' : '']"
              @click="mode === 'browse' && select(s.documentId)"
              @mouseenter="hoveredId = s.documentId"
              @mouseleave="hoveredId = null"
            >
              <div class="flex items-start gap-2">
                <span v-if="storyNumber[s.documentId]" class="min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5" :class="numberTagClass(s)">{{ storyNumber[s.documentId] }}</span>
                <span class="text-[11px] px-1.5 py-0.5 rounded shrink-0 mt-0.5" :class="badge(s).cls">{{ badge(s).text }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium leading-snug" :class="s.reviewState === 'dropped' ? 'line-through text-neutral-400' : ''">{{ s.headline }}</p>
                  <p v-if="s.teaser" class="text-xs text-neutral-500 mt-0.5 line-clamp-2">{{ s.teaser }}</p>
                  <p v-if="s.reviewState === 'drop_pending'" class="text-xs text-red-700 mt-1">Replaced by a story you drew. Drop it, or keep both.</p>
                </div>
              </div>
              <div v-if="mode === 'browse' && (s.documentId === selectedId || s.reviewState === 'drop_pending')" class="flex flex-wrap gap-2 mt-2 ml-1" @click.stop>
                <button v-if="s.reviewState !== 'dropped'" class="btn-sm-primary" @click="startEdit(s)">Edit</button>
                <button v-if="s.reviewState === 'drop_pending'" class="btn-sm" :disabled="busy" @click="setState(s, 'keep')">Keep</button>
                <button v-if="s.reviewState !== 'dropped'" class="btn-sm text-red-700" :disabled="busy" @click="setState(s, 'drop')">Drop</button>
                <button v-else class="btn-sm" :disabled="busy" @click="setState(s, 'restore')">Restore</button>
              </div>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()
const editionId = computed(() => String(route.params.editionId))
const pageNumber = computed(() => Number(route.params.pageNumber))
const apiBase = computed(() => `/api/editor/${encodeURIComponent(editionId.value)}/${pageNumber.value}`)

// ---------- state ----------
const state = ref(null)
const loading = ref(false)
const loadError = ref('')
const busy = ref(false)
const actionError = ref('')
const notice = ref('')
const jumpTo = ref('')
const zoom = ref(1)
const show = reactive({ stories: true, unclaimed: true, excluded: false })

const mode = ref('browse')            // browse | edit | create
const tool = ref(null)                // null | title | body
const selectedId = ref(null)
const hoveredId = ref(null)
const draft = reactive({ storyDocumentId: null, title: null, columns: [], headline: '' })
const history = ref([])
const savedSnapshot = ref('')
const preview = ref(null)
const compiling = ref(false)
const rowEls = {}

const selected = computed(() => state.value?.stories.find(s => s.documentId === selectedId.value) || null)
// Awaiting a drop decision first, then top-to-bottom, left-to-right on the page; dropped last.
const sortedStories = computed(() => {
  const order = { drop_pending: 0, active: 1, dropped: 2 }
  const anchor = s => { const r = (s.layout || [])[0] || { top: 100, left: 100 }; return [r.top, r.left] }
  return [...(state.value?.stories || [])].sort((a, b) => {
    const d = order[a.reviewState] - order[b.reviewState]
    if (d) return d
    const [at, al] = anchor(a); const [bt, bl] = anchor(b)
    return Math.abs(at - bt) > 1.5 ? at - bt : al - bl
  })
})
// Numbers tie a story's boxes on the page to its row in the list (dropped stories get none).
const storyNumber = computed(() => {
  const out = {}
  let n = 0
  for (const s of sortedStories.value) if (s.reviewState !== 'dropped') out[s.documentId] = ++n
  return out
})
const visibleStories = computed(() => (state.value?.stories || []).filter(s =>
  s.documentId !== draft.storyDocumentId && s.reviewState !== 'dropped' && (show.stories || s.documentId === selectedId.value)))
const snapshot = () => JSON.stringify({ t: draft.title, c: draft.columns, h: draft.headline })
const dirty = computed(() => mode.value !== 'browse' && snapshot() !== savedSnapshot.value)
const nudgeBody = computed(() => mode.value !== 'browse' && draft.title && !draft.columns.length && tool.value !== 'body')

const hint = computed(() => {
  if (tool.value === 'title') return draft.title ? 'Drag again to replace the title box.' : 'Drag over the headline (and kicker, if any).'
  if (tool.value === 'body') return draft.columns.length ? `Drag over column ${draft.columns.length + 1}, or save.` : 'Drag over the first column of the story, then the next, in reading order.'
  if (mode.value === 'create') return draft.title ? 'Title set. Press Body to select the columns.' : 'Press Title to start.'
  return 'Choose Title to redraw the headline box, or Body to add columns. Drag boxes to move them; drag a corner to resize.'
})
const canvasCursor = computed(() => (tool.value ? 'cursor-crosshair' : ''))

const ledgerChip = computed(() => {
  const l = state.value?.ledger
  if (!l) return { text: '', cls: '' }
  if (l.status === 'complete') return { text: 'All text is in a story', cls: 'bg-green-50 text-green-800' }
  if (l.status === 'skipped') return { text: 'Section skipped', cls: 'bg-neutral-100 text-neutral-600' }
  const parts = []
  if (l.buckets?.unassigned) parts.push(`${l.buckets.unassigned} words in no story`)
  if (l.duplicates) parts.push(`${l.duplicates} words in two stories`)
  return { text: parts.join(', ') || 'Needs review', cls: 'bg-red-50 text-red-700' }
})

// ---------- loading & navigation ----------
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    state.value = await $fetch(apiBase.value)
    if (selectedId.value && !state.value.stories.some(s => s.documentId === selectedId.value)) selectedId.value = null
  } catch (err) {
    state.value = null
    loadError.value = err?.statusMessage || err?.data?.statusMessage || 'This page could not be loaded.'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(apiBase, () => { resetDraft(); mode.value = 'browse'; selectedId.value = null; load() })

function confirmDiscard() {
  return !dirty.value || window.confirm('Discard the changes to this story?')
}
function goPage(n) {
  jumpTo.value = ''
  if (!Number.isInteger(n) || n < 1 || n === pageNumber.value || !confirmDiscard()) return
  router.push(`/story-editor/${editionId.value}/${n}`)
}
onBeforeRouteLeave(() => { if (dirty.value && !window.confirm('Discard the changes to this story?')) return false })

// ---------- modes ----------
function resetDraft() {
  draft.storyDocumentId = null
  draft.title = null
  draft.columns = []
  draft.headline = ''
  history.value = []
  preview.value = null
  actionError.value = ''
  tool.value = null
}
function select(id) {
  selectedId.value = id
  nextTick(() => rowEls[id]?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }))
}
function startNew() {
  if (!confirmDiscard()) return
  resetDraft()
  notice.value = ''
  mode.value = 'create'
  savedSnapshot.value = snapshot()
}
function startEdit(s) {
  if (!confirmDiscard()) return
  resetDraft()
  notice.value = ''
  selectedId.value = s.documentId
  draft.storyDocumentId = s.documentId
  const regions = [...(s.layout || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const pick = r => ({ left: r.left, top: r.top, width: r.width, height: r.height })
  draft.title = regions.find(r => r.role === 'title') ? pick(regions.find(r => r.role === 'title')) : null
  draft.columns = regions.filter(r => r.role !== 'title').map(pick)
  mode.value = 'edit'
  savedSnapshot.value = snapshot()
  compileSoon(0)
}
function cancelEdit() {
  if (!confirmDiscard()) return
  resetDraft()
  mode.value = 'browse'
}
function setTool(t) { tool.value = tool.value === t ? null : t }

// ---------- draft edits (with undo) ----------
function remember() {
  history.value.push(snapshot())
  if (history.value.length > 50) history.value.shift()
}
function undo() {
  const last = history.value.pop()
  if (!last) return
  const s = JSON.parse(last)
  draft.title = s.t
  draft.columns = s.c
  draft.headline = s.h
}
function removeTitle() { remember(); draft.title = null }
function removeColumn(i) { remember(); draft.columns.splice(i, 1) }
function clearColumns() { remember(); draft.columns = []; tool.value = 'body' }
function moveColumn(i, dir) {
  remember()
  const [c] = draft.columns.splice(i, 1)
  draft.columns.splice(i + dir, 0, c)
}

// ---------- pointer: draw / move / resize (all coordinates in % of page) ----------
const canvasEl = ref(null)
const rubber = ref(null)
let drag = null
const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))
const round = v => Math.round(v * 100) / 100
function pointPct(e) {
  const r = canvasEl.value.getBoundingClientRect()
  return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) }
}
function targetBox(kind, index) { return kind === 'title' ? draft.title : draft.columns[index] }

function onPointerDown(e) {
  if (e.button !== 0 || mode.value === 'browse') {
    if (mode.value === 'browse' && !e.target.closest('[data-story]')) selectedId.value = null
    return
  }
  const p = pointPct(e)
  const boxEl = e.target.closest('[data-kind]')
  if (boxEl && !tool.value) {
    const kind = boxEl.dataset.kind
    const index = Number(boxEl.dataset.index || 0)
    const box = targetBox(kind, index)
    remember()
    drag = { type: e.target.dataset.handle ? 'resize' : 'move', kind, index, start: p, orig: { ...box } }
  } else if (tool.value) {
    drag = { type: 'draw', start: p }
    rubber.value = { left: p.x, top: p.y, width: 0, height: 0 }
  } else {
    return
  }
  canvasEl.value.setPointerCapture(e.pointerId)
  e.preventDefault()
}
function onPointerMove(e) {
  if (!drag) return
  const p = pointPct(e)
  if (drag.type === 'draw') {
    rubber.value = rectFrom(drag.start, p)
    return
  }
  const box = targetBox(drag.kind, drag.index)
  const dx = p.x - drag.start.x
  const dy = p.y - drag.start.y
  if (drag.type === 'move') {
    box.left = round(clamp(drag.orig.left + dx, 0, 100 - box.width))
    box.top = round(clamp(drag.orig.top + dy, 0, 100 - box.height))
  } else {
    box.width = round(clamp(drag.orig.width + dx, 0.5, 100 - box.left))
    box.height = round(clamp(drag.orig.height + dy, 0.3, 100 - box.top))
  }
}
function onPointerUp() {
  if (!drag) return
  if (drag.type === 'draw') {
    const r = rubber.value
    rubber.value = null
    if (r && r.width >= 0.5 && r.height >= 0.3) {
      remember()
      if (tool.value === 'title') draft.title = r
      else draft.columns.push(r)
    }
    drag = null
    return
  }
  drag = null
  compileSoon()
}
function rectFrom(a, b) {
  return { left: round(Math.min(a.x, b.x)), top: round(Math.min(a.y, b.y)), width: round(Math.abs(b.x - a.x)), height: round(Math.abs(b.y - a.y)) }
}
const boxStyle = r => ({ left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` })

// ---------- live preview ----------
const layoutPayload = () => [
  ...(draft.title ? [{ role: 'title', order: 0, ...draft.title }] : []),
  ...draft.columns.map((c, i) => ({ role: 'column', order: i + 1, ...c }))
]
let compileTimer = null
let compileSeq = 0
function compileSoon(delay = 450) {
  clearTimeout(compileTimer)
  if (mode.value === 'browse' || !draft.columns.length) { preview.value = null; return }
  compileTimer = setTimeout(async () => {
    const seq = ++compileSeq
    compiling.value = true
    try {
      const res = await $fetch(`${apiBase.value}/compile`, { method: 'POST', body: { layout: layoutPayload() } })
      if (seq === compileSeq) { preview.value = res; actionError.value = '' }
    } catch (err) {
      if (seq === compileSeq) actionError.value = err?.statusMessage || 'Could not build the preview.'
    } finally {
      if (seq === compileSeq) compiling.value = false
    }
  }, delay)
}
// Recompile after any change, except mid-drag (onPointerUp compiles once the drag ends).
watch(() => [draft.title, draft.columns], () => { if (!drag) compileSoon() }, { deep: true })

// ---------- actions ----------
async function run(fn) {
  busy.value = true
  actionError.value = ''
  try { await fn() } catch (err) {
    actionError.value = err?.statusMessage || err?.data?.statusMessage || 'That did not work. Try again.'
  } finally { busy.value = false }
}
function save() {
  if (!draft.columns.length) { actionError.value = 'Add at least one body column.'; return }
  if (!draft.title && !draft.headline.trim()) { actionError.value = 'Draw a title box or type a headline.'; return }
  return run(async () => {
    const res = await $fetch(`${apiBase.value}/stories`, {
      method: 'POST',
      body: { storyDocumentId: draft.storyDocumentId, layout: layoutPayload(), headline: draft.headline.trim() || undefined }
    })
    const { savedDocumentId, ...next } = res
    state.value = next
    const replaced = next.stories.filter(s => s.supersededBy === savedDocumentId && s.reviewState === 'drop_pending').length
    const wasNew = mode.value === 'create'
    resetDraft()
    mode.value = 'browse'
    select(savedDocumentId)
    notice.value = `${wasNew ? 'Story created' : 'Story saved'}.${replaced ? ` ${replaced} older ${replaced === 1 ? 'story overlaps it' : 'stories overlap it'}: drop or keep ${replaced === 1 ? 'it' : 'them'} below.` : ''}`
  })
}
function setState(s, action) {
  return run(async () => {
    state.value = await $fetch(`${apiBase.value}/stories/${encodeURIComponent(s.documentId)}`, { method: 'PATCH', body: { action } })
    notice.value = { drop: 'Story dropped. Readers no longer see it.', keep: 'Story kept.', restore: 'Story restored.' }[action]
  })
}

// ---------- keyboard ----------
function onKey(e) {
  if (e.target.closest?.('input, textarea, select')) return
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 'z' && mode.value !== 'browse') { e.preventDefault(); undo(); return }
  if (mod && e.key.toLowerCase() === 's' && mode.value !== 'browse') { e.preventDefault(); save(); return }
  if (mode.value === 'browse') return
  if (e.key === 't' || e.key === 'T') setTool('title')
  if (e.key === 'b' || e.key === 'B') setTool('body')
  if (e.key === 'Escape') { if (drag) { drag = null; rubber.value = null } else tool.value = null }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => { window.removeEventListener('keydown', onKey); clearTimeout(compileTimer) })

// ---------- labels ----------
function savedBoxClass(s) {
  if (s.documentId === selectedId.value) return 'border-2 border-blue-600 bg-blue-500/20'
  if (s.documentId === hoveredId.value && mode.value === 'browse') return 'border-2 border-teal-600 bg-teal-500/15'
  if (s.reviewState === 'drop_pending') return 'border-2 border-dashed border-red-500 bg-red-500/5'
  return mode.value === 'browse' ? 'border border-teal-600/60 hover:bg-teal-500/10' : 'border border-neutral-500/30'
}
function numberTagClass(s) {
  if (s.documentId === selectedId.value) return 'bg-blue-600 text-white'
  if (s.reviewState === 'drop_pending') return 'bg-red-600 text-white'
  return 'bg-teal-700 text-white'
}
function badge(s) {
  if (s.reviewState === 'drop_pending') return { text: 'Replaced', cls: 'bg-red-100 text-red-800' }
  if (s.reviewState === 'dropped') return { text: 'Dropped', cls: 'bg-neutral-100 text-neutral-500' }
  return s.origin === 'manual' ? { text: 'Drawn', cls: 'bg-blue-100 text-blue-800' } : { text: 'Auto', cls: 'bg-teal-100 text-teal-800' }
}
</script>

<style scoped>
.btn { white-space: nowrap; display: inline-flex; align-items: center; gap: .375rem; height: 2.25rem; padding: 0 .75rem; border-radius: .5rem; font-size: .875rem; font-weight: 500; background: #f5f5f5; }
.btn:hover:not(:disabled) { background: #e5e5e5; }
.btn-primary { white-space: nowrap; display: inline-flex; align-items: center; height: 2.25rem; padding: 0 .875rem; border-radius: .5rem; font-size: .875rem; font-weight: 500; background: #171717; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #404040; }
.btn-sm, .btn-sm-primary { padding: .25rem .625rem; border-radius: .375rem; font-size: .75rem; font-weight: 500; background: #f5f5f5; }
.btn-sm:hover:not(:disabled) { background: #e5e5e5; }
.btn-sm-primary { background: #171717; color: #fff; }
.btn:disabled, .btn-primary:disabled, .btn-sm:disabled { opacity: .4; cursor: not-allowed; }
.tool { display: inline-flex; align-items: center; gap: .4rem; height: 2rem; padding: 0 .75rem; border-radius: .4rem; font-size: .875rem; font-weight: 500; color: #404040; }
.tool kbd { font-size: .65rem; color: #a3a3a3; border: 1px solid #e5e5e5; border-radius: .25rem; padding: 0 .25rem; background: #fff; }
.tool-on-title { background: #fffbeb; color: #92400e; box-shadow: inset 0 0 0 1.5px #f59e0b; }
.tool-on-body { background: #eff6ff; color: #1e40af; box-shadow: inset 0 0 0 1.5px #2563eb; }
.zoom { height: 1.75rem; padding: 0 .5rem; border-radius: .375rem; font-size: .75rem; }
.zoom:hover { background: #f5f5f5; }
.icon-btn { width: 1.5rem; height: 1.5rem; border-radius: .25rem; }
.icon-btn:hover:not(:disabled) { background: #f5f5f5; }
.icon-btn:disabled { opacity: .3; }
.step { width: 1.5rem; height: 1.5rem; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 600; }
.badge { position: absolute; top: 0; left: 0; color: #fff; font-size: 11px; line-height: 1; padding: .25rem .375rem; pointer-events: none; }
.box-x { position: absolute; top: -.6rem; right: -.6rem; width: 1.25rem; height: 1.25rem; border-radius: 9999px; background: #fff; color: #b91c1c; font-size: .875rem; line-height: 1; box-shadow: 0 0 0 1px #e5e5e5; opacity: 0; transition: opacity .12s; z-index: 2; }
[data-kind]:hover > .box-x, .box-x:focus-visible { opacity: 1; }
.handle { position: absolute; right: -5px; bottom: -5px; width: 10px; height: 10px; background: #fff; border-width: 2px; border-style: solid; cursor: nwse-resize; }
button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
</style>
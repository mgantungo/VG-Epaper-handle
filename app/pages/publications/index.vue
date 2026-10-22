<!--
  File:      /var/www/VGEpaper/handle/app/pages/publications/index.vue
  Repo path: apps/handle/app/pages/publications/index.vue        NEW FILE (Phase 0)
  URL:       /publications            (?tab=publications|plans&plan=<key>)

  Publications and the standard prices readers pay, managed here instead
  of in code (agreed 23 Oct 2026):
    - Publications: each paper sold on its own (NV, NVW, BK, BKW, …), its
      frequency and how many days one edition covers (a weekend edition
      dated Saturday covers Saturday–Sunday).
    - Plans and prices: what readers can buy. A plan includes any mix of
      publications; it is a period (N days/weeks/months/years) or a single
      issue. A price change is saved as a new version from a start date, so
      past sales keep their price. Bundles carry a revenue split (suggested
      from each publication's own price, editable).
  Organisations are priced by hand per contract, under Organisations.
  Needs the canManageOrganizations right.
-->
<template>
  <div class="orgdesk">
    <header class="hero">
      <div class="hero-inner">
        <div class="min-w-0">
          <h1 class="display text-[26px] leading-tight">Publications and plans</h1>
          <p class="text-[13px] muted mt-1 max-w-2xl">Standard prices individuals pay — no negotiation. Organisations are priced by hand per contract under Organisations.</p>
        </div>
        <nav class="seg" role="tablist" aria-label="Section">
          <button role="tab" class="seg-btn" :class="tab === 'publications' ? 'seg-on' : ''" :aria-selected="tab === 'publications'" @click="setTab('publications')">Publications <span class="seg-n">{{ publications.length }}</span></button>
          <button role="tab" class="seg-btn" :class="tab === 'plans' ? 'seg-on' : ''" :aria-selected="tab === 'plans'" @click="setTab('plans')">Plans and prices <span class="seg-n">{{ plans.length }}</span></button>
        </nav>
      </div>
    </header>

    <div class="wrap">
      <p v-if="flash.text" class="notice mb-4" :class="flash.ok ? 'notice-ok' : 'notice-err'" role="status">{{ flash.text }}</p>

      <!-- ============ Publications ============ -->
      <template v-if="tab === 'publications'">
        <section class="panel p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="display text-[17px]">Publications</h2>
            <button class="btn-ink" @click="editPublication(null)">New publication</button>
          </div>
          <div class="table-scroll mt-3">
            <table v-if="publications.length" class="otable">
              <thead>
                <tr><th>Code</th><th>Title</th><th>Edition</th><th>Language</th><th>Frequency</th><th>One edition covers</th><th>Latest edition</th><th class="text-right">Plans on sale</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                <tr v-for="p in publications" :key="p.id" :class="pubForm?.id === p.id ? 'row-on' : ''">
                  <td><span class="chip" :style="chipStyle(p.colour)">{{ p.code }}</span></td>
                  <td class="font-semibold">{{ p.title }}</td>
                  <td>{{ p.editionLabel || p.name }}</td>
                  <td>{{ p.language || '—' }}</td>
                  <td>{{ frequencyLabel(p.frequency) }}<span v-if="p.scheduleNote" class="text-[12px] muted"> · {{ p.scheduleNote }}</span></td>
                  <td>{{ p.coverDays > 1 ? `${p.coverDays} days from its date` : 'its date' }}</td>
                  <td class="mono text-[12px]">{{ p.latestEdition ? coverText(p.latestEdition) : '—' }}</td>
                  <td class="mono text-right">{{ p.planCount }}</td>
                  <td><span class="chip" :class="p.active ? 'chip-green' : 'chip-grey'"><span class="dot" />{{ p.active ? 'active' : 'hidden' }}</span></td>
                  <td class="text-right"><button class="btn-soft" @click="editPublication(p)">Edit</button></td>
                </tr>
              </tbody>
            </table>
            <p v-else-if="!loading" class="text-sm muted py-4">No publications yet. Existing editions get one automatically when the CMS starts; add any others here.</p>
          </div>
        </section>

        <section v-if="pubForm" class="panel p-4 mt-4" aria-labelledby="pf-h">
          <h2 id="pf-h" class="display text-[17px]">{{ pubForm.id ? `Edit ${pubForm.code}` : 'New publication' }}</h2>
          <form class="grid gap-4 md:grid-cols-4 mt-3" @submit.prevent="savePublication">
            <div>
              <label class="label" for="pf-code">Code *</label>
              <input id="pf-code" v-model.trim="pubForm.code" class="field mono uppercase" :disabled="Boolean(pubForm.id)" required maxlength="12" pattern="[A-Za-z0-9]{1,12}" placeholder="NV, BKW…">
              <p class="hint">{{ pubForm.id ? 'Fixed: links, editions and sales use it.' : 'Used in reader links (/nv/2026/10/23). Cannot be changed later.' }}</p>
            </div>
            <div>
              <label class="label" for="pf-title">Title readers know *</label>
              <input id="pf-title" v-model.trim="pubForm.title" class="field" required placeholder="New Vision">
              <p class="hint">Publications with the same title share one card on the landing page.</p>
            </div>
            <div>
              <label class="label" for="pf-name">Full name *</label>
              <input id="pf-name" v-model.trim="pubForm.name" class="field" required placeholder="New Vision weekend">
            </div>
            <div>
              <label class="label" for="pf-label">Edition label</label>
              <input id="pf-label" v-model.trim="pubForm.editionLabel" class="field" placeholder="Daily, Weekend…">
            </div>
            <div>
              <label class="label" for="pf-freq">Frequency</label>
              <select id="pf-freq" v-model="pubForm.frequency" class="field" @change="onFrequency">
                <option v-for="f in FREQUENCIES" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>
            <div>
              <label class="label" for="pf-cover">One edition covers (days)</label>
              <input id="pf-cover" v-model="pubForm.coverDays" type="number" min="1" max="366" class="field mono">
              <p class="hint">Weekend = 2 (Sat–Sun). No set release date = 1.</p>
            </div>
            <div>
              <label class="label" for="pf-sched">Schedule shown to readers</label>
              <input id="pf-sched" v-model.trim="pubForm.scheduleNote" class="field" placeholder="Mon–Fri, Sat–Sun, or empty">
            </div>
            <div>
              <label class="label" for="pf-lang">Language</label>
              <input id="pf-lang" v-model.trim="pubForm.language" class="field" placeholder="English, Luganda…">
            </div>
            <div>
              <label class="label" for="pf-colour">Colour</label>
              <div class="flex gap-2">
                <input id="pf-colour" v-model="pubForm.colour" type="color" class="h-10 w-12 rounded-lg border" style="border-color: rgba(15,27,45,.16)">
                <input v-model.trim="pubForm.colour" class="field mono" aria-label="Colour hex" pattern="#[0-9a-fA-F]{6}">
              </div>
            </div>
            <div>
              <label class="label" for="pf-sort">Order on landing page</label>
              <input id="pf-sort" v-model="pubForm.sortOrder" type="number" class="field mono">
            </div>
            <div class="md:col-span-2">
              <label class="label" for="pf-desc">Description</label>
              <input id="pf-desc" v-model.trim="pubForm.description" class="field">
            </div>
            <label class="flex items-center gap-2 text-[13px] md:col-span-4">
              <input v-model="pubForm.active" type="checkbox"> Shown to readers (hiding it keeps existing access working)
            </label>
            <p v-if="pubForm.id && Number(pubForm.coverDays) !== pubForm.originalCoverDays" class="notice notice-err md:col-span-4">
              Changing the days covered re-dates every existing {{ pubForm.code }} edition. Readers' access follows the new dates.
            </p>
            <div class="md:col-span-4 flex justify-end gap-2">
              <button type="button" class="btn-ghost" @click="pubForm = null">Cancel</button>
              <button class="btn-ink" :disabled="busy">{{ busy ? 'Saving…' : pubForm.id ? 'Save publication' : 'Create publication' }}</button>
            </div>
          </form>
        </section>
      </template>

      <!-- ============ Plans and prices ============ -->
      <div v-else class="flex flex-wrap gap-4 items-start">
        <section class="panel p-4" style="flex: 1 1 380px; min-width: 0" aria-labelledby="pl-h">
          <div class="flex items-center justify-between gap-3">
            <h2 id="pl-h" class="display text-[17px]">Plans</h2>
            <button class="btn-ink" @click="startNewPlan">New plan</button>
          </div>
          <div class="seg seg-light mt-3" role="group" aria-label="Filter plans">
            <button v-for="f in planFilters" :key="f.value" class="seg-btn" :class="planFilter === f.value ? 'seg-on' : ''" @click="planFilter = f.value">{{ f.label }}</button>
          </div>
          <ul class="mt-3 space-y-1">
            <li v-for="g in visiblePlans" :key="g.key">
              <button class="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3" :class="selectedKey === g.key ? 'plan-on' : 'hover:bg-black/[.03]'" @click="selectPlan(g.key)">
                <span class="min-w-0">
                  <span class="block font-semibold text-[14px] truncate">{{ g.label }}</span>
                  <span class="block mono text-[11px] muted">{{ g.publications.join(' + ') }} · {{ termText(g) }}</span>
                </span>
                <span class="text-right shrink-0">
                  <span class="block mono text-[13px]">{{ g.current ? money(g.current.price, g.current.currency) : '—' }}</span>
                  <span class="chip mt-1" :class="g.onSale ? 'chip-green' : g.upcoming.length ? 'chip-blue' : 'chip-grey'">{{ g.onSale ? 'on sale' : g.upcoming.length ? 'starts later' : 'stopped' }}</span>
                </span>
              </button>
            </li>
            <li v-if="!visiblePlans.length && !loading" class="text-sm muted px-3 py-3">No plans {{ planFilter === 'all' ? 'yet' : 'here' }}.</li>
          </ul>
        </section>

        <!-- new plan -->
        <section v-if="mode === 'new'" class="panel p-5" style="flex: 1.6 1 560px; min-width: 0" aria-labelledby="np-h">
          <h2 id="np-h" class="display text-[19px]">New plan</h2>
          <form class="space-y-4 mt-4" @submit.prevent="createPlan">
            <div class="grid gap-4 md:grid-cols-2">
              <div><label class="label" for="np-label">Name readers see *</label><input id="np-label" v-model.trim="np.label" class="field" required placeholder="New Vision · 3 months"></div>
              <div>
                <label class="label" for="np-key">Plan key *</label>
                <input id="np-key" v-model.trim="np.key" class="field mono" required pattern="[a-z0-9][a-z0-9_]{1,39}" placeholder="nv_3m">
                <p class="hint">Lower case, digits and _. Stays the same across price changes.</p>
              </div>
              <div>
                <label class="label" for="np-kind">Kind</label>
                <select id="np-kind" v-model="np.kind" class="field">
                  <option value="period">Period — every edition for a length of time</option>
                  <option value="single_issue">Single issue — one edition (today's or from the archive)</option>
                </select>
              </div>
              <div v-if="np.kind === 'period'" class="grid grid-cols-2 gap-3">
                <div><label class="label" for="np-count">Length</label><input id="np-count" v-model="np.durationCount" type="number" min="1" max="120" class="field mono"></div>
                <div>
                  <label class="label" for="np-unit">Unit</label>
                  <select id="np-unit" v-model="np.durationUnit" class="field"><option value="day">days</option><option value="week">weeks</option><option value="month">months</option><option value="year">years</option></select>
                </div>
              </div>
            </div>

            <div>
              <span class="label">Publications included {{ np.kind === 'single_issue' ? '(exactly one)' : '' }}</span>
              <div class="flex flex-wrap gap-2">
                <label v-for="p in activePublications" :key="p.code" class="pub-opt" :class="np.publications.includes(p.code) ? 'pub-opt-on' : ''">
                  <input :type="np.kind === 'single_issue' ? 'radio' : 'checkbox'" name="np-pubs" :checked="np.publications.includes(p.code)" @change="toggleNewPub(p.code, $event.target.checked)">
                  <span class="mono">{{ p.code }}</span> <span class="muted">{{ p.name }}</span>
                </label>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div><label class="label" for="np-price">Price (UGX) *</label><input id="np-price" v-model="np.price" type="number" min="0" step="1" class="field mono" required></div>
              <div><label class="label">Works out per month</label><p class="field mono flex items-center bg-black/[.02]">{{ perMonth(np) }}</p></div>
              <div><label class="label" for="np-from">On sale from</label><input id="np-from" v-model="np.validFrom" type="date" class="field mono" :min="today"></div>
            </div>

            <SplitEditor v-if="np.publications.length > 1" v-model="np.revenueSplit" :codes="np.publications" :busy="busy" @suggest="suggestFor(np)" />

            <div class="grid gap-4 md:grid-cols-3 items-end">
              <div class="md:col-span-2"><label class="label" for="np-desc">Short description</label><input id="np-desc" v-model.trim="np.description" class="field" placeholder="Every New Vision daily edition for 3 months"></div>
              <div><label class="label" for="np-sort">Order</label><input id="np-sort" v-model="np.sortOrder" type="number" class="field mono"></div>
            </div>
            <label class="flex items-center gap-2 text-[13px]"><input v-model="np.featured" type="checkbox"> Show on the landing page</label>

            <p v-if="formError" class="notice notice-err">{{ formError }}</p>
            <div class="flex justify-end gap-2">
              <button type="button" class="btn-ghost" @click="mode = null">Cancel</button>
              <button class="btn-ink" :disabled="busy">{{ busy ? 'Creating…' : 'Create plan' }}</button>
            </div>
          </form>
        </section>

        <!-- existing plan -->
        <section v-else-if="selected" class="panel p-5 space-y-5" style="flex: 1.6 1 560px; min-width: 0" aria-labelledby="ep-h">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="ep-h" class="display text-[19px]">{{ selected.label }}</h2>
              <p class="mono text-[12px] muted mt-1">{{ selected.key }} · {{ selected.publications.join(' + ') }} · {{ termText(selected) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="chip" :class="selected.onSale ? 'chip-green' : 'chip-grey'">{{ selected.onSale ? `on sale · version ${selected.current?.version}` : 'not on sale' }}</span>
              <button v-if="selected.onSale" class="btn-ghost" :disabled="busy" @click="askStop">Stop selling</button>
              <button v-else class="btn-ghost" :disabled="busy" @click="resume">Resume selling</button>
            </div>
          </div>

          <form class="grid gap-4 md:grid-cols-3 items-end" @submit.prevent="saveDisplay">
            <div class="md:col-span-2"><label class="label" for="ep-label">Name readers see</label><input id="ep-label" v-model.trim="display.label" class="field" required></div>
            <div><label class="label" for="ep-sort">Order</label><input id="ep-sort" v-model="display.sortOrder" type="number" class="field mono"></div>
            <div class="md:col-span-2"><label class="label" for="ep-desc">Short description</label><input id="ep-desc" v-model.trim="display.description" class="field"></div>
            <label class="flex items-center gap-2 text-[13px] h-10"><input v-model="display.featured" type="checkbox"> Show on the landing page</label>
            <div class="md:col-span-3 flex justify-end"><button class="btn-ghost" :disabled="busy">Save name and display</button></div>
          </form>

          <form class="p-4 rounded-xl space-y-4" style="background:#f5f7ff; box-shadow: inset 0 0 0 1px rgba(47,85,228,.25)" @submit.prevent="saveVersion">
            <p class="display text-[15px]">Change the price</p>
            <div class="grid gap-4 md:grid-cols-3">
              <div><label class="label" for="nv-price">New price (UGX)</label><input id="nv-price" v-model="version.price" type="number" min="0" step="1" class="field mono" required></div>
              <div><label class="label">Works out per month</label><p class="field mono flex items-center bg-white/60">{{ perMonth({ ...selected, price: version.price }) }}</p></div>
              <div><label class="label" for="nv-from">Applies from</label><input id="nv-from" v-model="version.validFrom" type="date" class="field mono" :min="today" required></div>
            </div>
            <SplitEditor v-if="selected.publications.length > 1" v-model="version.revenueSplit" :codes="selected.publications" :busy="busy" @suggest="suggestFor(version, selected.publications)" />
            <p class="text-[12px] muted">Saved as version {{ nextVersion }}. People who already paid keep what they bought; past revenue never changes.</p>
            <p v-if="formError" class="notice notice-err">{{ formError }}</p>
            <div class="flex justify-end"><button class="btn-ink" :disabled="busy">{{ busy ? 'Saving…' : `Save as version ${nextVersion}` }}</button></div>
          </form>

          <div>
            <p class="display text-[15px] mb-2">Price history</p>
            <div class="table-scroll">
              <table class="otable">
                <thead><tr><th>Version</th><th>From</th><th>To</th><th class="text-right">Price</th><th>Revenue split</th><th>State</th></tr></thead>
                <tbody>
                  <tr v-for="v in selected.versions" :key="v.id">
                    <td class="mono">{{ v.version }}</td>
                    <td class="mono">{{ fmtDate(v.validFrom) }}</td>
                    <td class="mono">{{ v.validTo ? fmtDate(v.validTo) : '—' }}</td>
                    <td class="mono text-right">{{ money(v.price, v.currency) }}</td>
                    <td class="mono text-[12px]">{{ v.revenueSplit ? Object.entries(v.revenueSplit).map(([c, p]) => `${c} ${p}%`).join(' · ') : '—' }}</td>
                    <td><span class="chip" :class="versionChip(v).cls">{{ versionChip(v).text }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-else class="panel p-10 text-center text-sm muted" style="flex: 1.6 1 560px; min-width: 0">
          Choose a plan to change its price, or create a new one.
        </section>
      </div>
    </div>

    <!-- confirm dialog -->
    <div v-if="dialog" class="overlay" role="dialog" aria-modal="true" aria-labelledby="dlg-h" @click.self="dialog = null">
      <div class="dialog">
        <h2 id="dlg-h" class="display text-[18px]">{{ dialog.title }}</h2>
        <p class="text-[13px] muted mt-2">{{ dialog.text }}</p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="dialog = null">Cancel</button>
          <button type="button" class="btn-danger" :disabled="busy" @click="dialog.run()">{{ dialog.confirm }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import '~/assets/css/org-desk.css'
import SplitEditor from '~/components/SplitEditor.vue'

definePageMeta({ middleware: 'org-rights' })
useHead({
  title: 'Publications and plans — E-Paper Admin',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
  ]
})

const route = useRoute()
const router = useRouter()
const { catalogue } = useHandleApi()
const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10) // Kampala

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', cover: 1 },
  { value: 'weekend', label: 'Weekend', cover: 2 },
  { value: 'weekly', label: 'Weekly', cover: 7 },
  { value: 'monthly', label: 'About monthly', cover: 1 },
  { value: 'quarterly', label: 'About quarterly', cover: 1 },
  { value: 'yearly', label: 'About yearly', cover: 1 },
  { value: 'irregular', label: 'No set schedule', cover: 1 }
]
const frequencyLabel = (f) => FREQUENCIES.find((x) => x.value === f)?.label || f

const loading = ref(true)
const busy = ref(false)
const publications = ref([])
const plans = ref([])
const flash = reactive({ text: '', ok: true })
let flashTimer = null
function say(text, ok = true) {
  flash.text = text
  flash.ok = ok
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.text = ''), 6000)
}
const errMsg = (e, fallback) => e?.data?.statusMessage || e?.statusMessage || fallback

const tab = ref(route.query.tab === 'plans' ? 'plans' : 'publications')
function setTab(t) {
  tab.value = t
  router.replace({ query: { ...route.query, tab: t } })
}

async function loadAll() {
  loading.value = true
  try {
    const [p, pl] = await Promise.all([catalogue.publications(), catalogue.plans()])
    publications.value = p.publications || []
    plans.value = pl.plans || []
  } catch (e) {
    say(errMsg(e, 'Could not load publications and plans.'), false)
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  await loadAll()
  if (route.query.plan) selectPlan(String(route.query.plan))
})
onUnmounted(() => clearTimeout(flashTimer))

const activePublications = computed(() => publications.value.filter((p) => p.active))

// ---------------- publications ----------------
const pubForm = ref(null)
function editPublication(p) {
  pubForm.value = p
    ? { ...p, originalCoverDays: p.coverDays, colour: p.colour || '#2f55e4', description: p.description || '', scheduleNote: p.scheduleNote || '', editionLabel: p.editionLabel || '', language: p.language || '' }
    : { id: null, code: '', title: '', name: '', editionLabel: '', language: 'English', frequency: 'daily', coverDays: 1, scheduleNote: '', colour: '#2f55e4', description: '', active: true, sortOrder: publications.value.length }
}
function onFrequency() {
  const f = FREQUENCIES.find((x) => x.value === pubForm.value.frequency)
  if (f && !pubForm.value.id) pubForm.value.coverDays = f.cover
}
async function savePublication() {
  const f = pubForm.value
  const body = {
    title: f.title, name: f.name, editionLabel: f.editionLabel || null, language: f.language || null,
    frequency: f.frequency, coverDays: Number(f.coverDays) || 1, scheduleNote: f.scheduleNote || null,
    colour: f.colour || null, description: f.description || null, active: Boolean(f.active), sortOrder: Number(f.sortOrder) || 0
  }
  busy.value = true
  try {
    if (f.id) await catalogue.updatePublication(f.id, body)
    else await catalogue.createPublication({ ...body, code: String(f.code).toUpperCase() })
    say(f.id ? `${f.code} saved.` : `${String(f.code).toUpperCase()} created.`)
    pubForm.value = null
    await loadAll()
  } catch (e) {
    say(errMsg(e, 'That did not save.'), false)
  } finally {
    busy.value = false
  }
}

// ---------------- plans ----------------
const planFilters = [{ value: 'onsale', label: 'On sale' }, { value: 'stopped', label: 'Stopped' }, { value: 'all', label: 'All' }]
const planFilter = ref('onsale')
const visiblePlans = computed(() => plans.value.filter((g) =>
  planFilter.value === 'all' ? true : planFilter.value === 'onsale' ? (g.onSale || g.upcoming.length) : (!g.onSale && !g.upcoming.length)))

const mode = ref(null) // 'new' | 'edit' | null
const selectedKey = ref(null)
const selected = computed(() => (mode.value === 'edit' ? plans.value.find((g) => g.key === selectedKey.value) || null : null))
const formError = ref('')

const display = reactive({ label: '', description: '', featured: true, sortOrder: 0 })
const version = reactive({ price: '', validFrom: today, revenueSplit: {} })
const nextVersion = computed(() => (selected.value ? Math.max(...selected.value.versions.map((v) => v.version)) + 1 : 1))

function selectPlan(key) {
  const g = plans.value.find((x) => x.key === key)
  if (!g) return
  mode.value = 'edit'
  selectedKey.value = key
  formError.value = ''
  const cur = g.current || g.versions[0]
  Object.assign(display, { label: g.label, description: cur?.description || '', featured: g.featured, sortOrder: g.sortOrder })
  Object.assign(version, { price: cur?.price ?? '', validFrom: today, revenueSplit: { ...(cur?.revenueSplit || {}) } })
  router.replace({ query: { ...route.query, tab: 'plans', plan: key } })
}

const blankPlan = () => ({ key: '', label: '', kind: 'period', durationUnit: 'month', durationCount: 1, publications: [], price: '', validFrom: today, revenueSplit: {}, description: '', featured: true, sortOrder: plans.value.length })
const np = reactive(blankPlan())
function startNewPlan() {
  Object.assign(np, blankPlan())
  mode.value = 'new'
  selectedKey.value = null
  formError.value = ''
}
function toggleNewPub(code, on) {
  if (np.kind === 'single_issue') np.publications = on ? [code] : []
  else np.publications = on ? [...new Set([...np.publications, code])] : np.publications.filter((c) => c !== code)
  if (np.publications.length > 1) suggestFor(np)
}
watch(() => np.kind, (k) => { if (k === 'single_issue' && np.publications.length > 1) np.publications = np.publications.slice(0, 1) })

// Option A: proportional to each publication's own price, editable.
async function suggestFor(target, codes) {
  try {
    const res = await catalogue.suggestSplit(codes || target.publications)
    target.revenueSplit = res.revenueSplit || {}
  } catch (e) {
    say(errMsg(e, 'Could not suggest a split.'), false)
  }
}

function splitProblem(codes, split) {
  if (codes.length < 2) return ''
  const total = codes.reduce((s, c) => s + (Number(split?.[c]) || 0), 0)
  return total === 100 ? '' : `The revenue split must total 100% (it totals ${total}%).`
}

async function createPlan() {
  formError.value = ''
  if (!np.publications.length) { formError.value = 'Choose at least one publication.'; return }
  const problem = splitProblem(np.publications, np.revenueSplit)
  if (problem) { formError.value = problem; return }
  busy.value = true
  try {
    const res = await catalogue.createPlan({
      key: np.key, label: np.label, kind: np.kind,
      durationUnit: np.kind === 'period' ? np.durationUnit : undefined,
      durationCount: np.kind === 'period' ? Number(np.durationCount) : undefined,
      publications: np.publications, price: Number(np.price),
      revenueSplit: np.publications.length > 1 ? cleanSplit(np.revenueSplit, np.publications) : undefined,
      validFrom: np.validFrom, description: np.description || null, featured: np.featured, sortOrder: Number(np.sortOrder) || 0
    })
    say(`${res.plan.label} created.`)
    await loadAll()
    selectPlan(res.plan.key)
  } catch (e) {
    formError.value = errMsg(e, 'The plan was not created.')
  } finally {
    busy.value = false
  }
}

async function saveDisplay() {
  busy.value = true
  try {
    await catalogue.updatePlan(selected.value.key, { label: display.label, description: display.description || null, featured: display.featured, sortOrder: Number(display.sortOrder) || 0 })
    say('Saved.')
    await loadAll()
  } catch (e) {
    say(errMsg(e, 'That did not save.'), false)
  } finally {
    busy.value = false
  }
}

async function saveVersion() {
  formError.value = ''
  const g = selected.value
  const problem = splitProblem(g.publications, version.revenueSplit)
  if (problem) { formError.value = problem; return }
  busy.value = true
  try {
    await catalogue.newPlanVersion(g.key, {
      price: Number(version.price),
      validFrom: version.validFrom,
      ...(g.publications.length > 1 ? { revenueSplit: cleanSplit(version.revenueSplit, g.publications) } : {})
    })
    say(`Version ${nextVersion.value} saved — on sale from ${fmtDate(version.validFrom)}.`)
    await loadAll()
    selectPlan(g.key)
  } catch (e) {
    formError.value = errMsg(e, 'The new price was not saved.')
  } finally {
    busy.value = false
  }
}

const dialog = ref(null)
function askStop() {
  const g = selected.value
  dialog.value = {
    title: 'Stop selling this plan',
    text: `${g.label} disappears from the landing page and paywall. People who already paid keep their access until it ends. You can resume selling later.`,
    confirm: 'Stop selling',
    run: async () => {
      busy.value = true
      try {
        await catalogue.stopPlan(g.key)
        dialog.value = null
        say(`${g.label} is no longer on sale.`)
        await loadAll()
        selectPlan(g.key)
      } catch (e) {
        say(errMsg(e, 'That did not work.'), false)
      } finally {
        busy.value = false
      }
    }
  }
}
async function resume() {
  busy.value = true
  try {
    await catalogue.resumePlan(selected.value.key)
    say(`${selected.value.label} is on sale again.`)
    await loadAll()
    selectPlan(selectedKey.value)
  } catch (e) {
    say(errMsg(e, 'That did not work.'), false)
  } finally {
    busy.value = false
  }
}

// ---------------- formatting ----------------
const cleanSplit = (split, codes) => Object.fromEntries(codes.map((c) => [c, Number(split?.[c]) || 0]))
function money(v, cur = 'UGX') {
  if (v === null || v === undefined || v === '') return '—'
  return `${cur} ${Number(v).toLocaleString()}`
}
function termText(g) {
  if (g.kind === 'single_issue') return 'one edition'
  const n = g.durationCount || 1
  return `${n} ${g.durationUnit}${n === 1 ? '' : 's'}`
}
function perMonth(p) {
  if (p.kind === 'single_issue' || !p.price) return '—'
  const n = Number(p.durationCount) || 1
  const days = p.durationUnit === 'day' ? n : p.durationUnit === 'week' ? 7 * n : p.durationUnit === 'year' ? 365 * n : 30 * n
  return `UGX ${Math.round(Number(p.price) / days * 30).toLocaleString()} / month`
}
function versionChip(v) {
  if (!v.active) return { text: 'withdrawn', cls: 'chip-grey' }
  if (v.validFrom && v.validFrom > today) return { text: 'upcoming', cls: 'chip-blue' }
  if (v.validTo && v.validTo < today) return { text: 'ended', cls: 'chip-grey' }
  return { text: 'on sale', cls: 'chip-green' }
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function coverText(e) {
  return e.coversTo && e.coversTo !== e.coversFrom ? `${fmtDate(e.coversFrom)} – ${fmtDate(e.coversTo)}` : fmtDate(e.date)
}
function chipStyle(c) {
  const colour = c || '#2f55e4'
  return { background: `${colour}1f`, color: colour }
}
</script>

<style scoped>
.row-on { background: #eef2ff; }
.plan-on { background: #eef2ff; box-shadow: inset 0 0 0 1px #c7d2fe; }
.pub-opt { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 9px; border: 1px solid rgba(15,27,45,.12); font-size: 13px; cursor: pointer; background: #fff; }
.pub-opt-on { background: #eef2ff; border-color: #c7d2fe; }
</style>

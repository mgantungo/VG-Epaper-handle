<!--
  File:      /var/www/VGEpaper/handle/app/pages/organisations/index.vue
  Repo path: apps/handle/app/pages/organisations/index.vue        NEW FILE
  URL:       /organisations

  Organisations list: search, status filter, seats and paid period at a
  glance, and a "New organisation" form (optionally with its first paid
  period and first Org Admin). Needs the canManageOrganizations right
  (middleware/org-rights.ts); the server checks it again on every call.
-->
<template>
  <div class="orgdesk">
    <header class="hero">
      <div class="hero-inner">
        <div>
          <h1 class="display text-[26px] leading-none">Organisations</h1>
          <p class="mono text-[11px] muted mt-2">Master accounts with named member seats</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="seg" role="group" aria-label="Filter by status">
            <button v-for="f in statusFilters" :key="f.value" class="seg-btn" :class="status === f.value ? 'seg-on' : ''" :aria-pressed="status === f.value" @click="status = f.value">{{ f.label }}</button>
          </div>
          <button class="btn-ink" @click="openCreate">New organisation</button>
        </div>
      </div>
    </header>

    <div class="wrap">
      <!-- Create form -->
      <section v-if="creating" class="panel p-5 mb-5" aria-labelledby="create-h">
        <div class="flex items-baseline justify-between gap-3">
          <h2 id="create-h" class="display text-[18px]">New organisation</h2>
          <button class="btn-soft" @click="creating = false">Cancel</button>
        </div>
        <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="submitCreate">
          <div class="md:col-span-2">
            <label class="label" for="c-name">Name *</label>
            <input id="c-name" v-model.trim="form.name" class="field" required placeholder="e.g. Parliament of Uganda">
          </div>
          <div>
            <label class="label" for="c-seats">Seat limit</label>
            <input id="c-seats" v-model="form.seatLimit" class="field" type="number" min="0" step="1" placeholder="Leave empty for no limit">
          </div>
          <div>
            <label class="label" for="c-cname">Contact person</label>
            <input id="c-cname" v-model.trim="form.contactName" class="field">
          </div>
          <div>
            <label class="label" for="c-cemail">Contact email</label>
            <input id="c-cemail" v-model.trim="form.contactEmail" class="field" type="email">
          </div>
          <div>
            <label class="label" for="c-cphone">Contact phone</label>
            <input id="c-cphone" v-model.trim="form.contactPhone" class="field">
          </div>

          <fieldset class="md:col-span-2 grid gap-4 md:grid-cols-4 p-4 rounded-xl" style="background:#f5f7ff; box-shadow: inset 0 0 0 1px rgba(47,85,228,.25)">
            <legend class="mono text-[11px] accent px-1">First paid period (optional)</legend>
            <div>
              <label class="label" for="c-start">Start</label>
              <input id="c-start" v-model="form.contractStart" class="field" type="date">
            </div>
            <div>
              <label class="label" for="c-end">End</label>
              <input id="c-end" v-model="form.contractEnd" class="field" type="date">
            </div>
            <div>
              <label class="label" for="c-amount">Amount paid (UGX)</label>
              <input id="c-amount" v-model="form.amountPaid" class="field" type="number" min="0" step="1">
            </div>
            <div>
              <label class="label" for="c-note">Reference / note</label>
              <input id="c-note" v-model.trim="form.contractNote" class="field" placeholder="Invoice no., LPO…">
            </div>
          </fieldset>

          <div class="md:col-span-2">
            <label class="label" for="c-admin">First Org Admin's email (optional)</label>
            <input id="c-admin" v-model.trim="form.adminEmail" class="field" type="email" placeholder="They must already have a reader account">
            <p class="hint">The Org Admin manages members from the e-paper site. If a paid period is set above, they get access for that whole period.</p>
          </div>
          <div class="md:col-span-2">
            <label class="label" for="c-notes">Internal notes</label>
            <textarea id="c-notes" v-model="form.notes" class="field" rows="2" />
          </div>

          <p v-if="createError" class="md:col-span-2 notice notice-err">{{ createError }}</p>
          <div class="md:col-span-2 flex justify-end gap-2">
            <button type="button" class="btn-ghost" @click="creating = false">Cancel</button>
            <button type="submit" class="btn-ink" :disabled="saving">{{ saving ? 'Creating…' : 'Create organisation' }}</button>
          </div>
        </form>
      </section>

      <!-- List -->
      <section class="panel">
        <div class="flex flex-wrap items-center gap-3 p-4">
          <label for="q" class="sr-only">Search organisations</label>
          <input id="q" v-model="search" type="search" class="field max-w-sm" placeholder="Search by name">
          <span class="mono text-[11px] faint ml-auto">{{ pagination?.total ?? 0 }} organisations</span>
        </div>

        <p v-if="loadError" class="px-4 pb-4 text-sm text-red-700">{{ loadError }} <button class="underline" @click="load">Try again</button></p>
        <div v-else-if="loading && !rows.length" class="px-4 pb-6 space-y-2">
          <div v-for="n in 5" :key="n" class="h-10 rounded-lg animate-pulse" style="background:rgba(15,27,45,.05)" />
        </div>
        <div v-else-if="!rows.length" class="px-4 pb-10 pt-4 text-center">
          <p class="display text-xl">{{ search || status ? 'No organisations match' : 'No organisations yet' }}</p>
          <p class="text-sm muted mt-1">{{ search || status ? 'Try a different search or filter.' : 'Create one to give a company or institution named member seats.' }}</p>
        </div>
        <div v-else class="table-scroll">
          <table class="otable">
            <thead>
              <tr><th>Organisation</th><th>Status</th><th>Seats</th><th>Paid period</th><th>Primary admin</th><th>Created</th></tr>
            </thead>
            <tbody>
              <tr v-for="o in rows" :key="o.id" class="clickable" @click="navigateTo(`/organisations/${o.id}`)">
                <td>
                  <NuxtLink :to="`/organisations/${o.id}`" class="font-semibold hover:underline" @click.stop>{{ o.name }}</NuxtLink>
                </td>
                <td><span class="chip" :class="statusChip(o.status)"><span class="dot" />{{ o.status }}</span></td>
                <td class="mono">{{ o.seatsInUse }}<span class="faint"> / {{ o.seatLimit ?? '∞' }}</span></td>
                <td>
                  <span v-if="o.contract?.current" class="mono text-[12px]">until {{ fmtDate(o.contract.current.coverageEnd) }}</span>
                  <span v-else-if="o.contract?.latestEnd && o.contract.latestEnd >= today" class="chip chip-blue">starts later</span>
                  <span v-else-if="o.contract?.latestEnd" class="chip chip-amber">ended {{ fmtDate(o.contract.latestEnd) }}</span>
                  <span v-else class="chip chip-grey">none</span>
                </td>
                <td class="text-[12px]">{{ o.owner?.email || '—' }}</td>
                <td class="mono text-[12px] muted">{{ fmtDate(o.createdAt?.slice(0, 10)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav v-if="pagination && pagination.pageCount > 1" class="flex items-center justify-between gap-2 p-4 border-t" style="border-color: var(--line)" aria-label="Pages">
          <button class="btn-soft" :disabled="page <= 1" @click="page--">‹ Previous</button>
          <span class="mono text-[12px] muted">Page {{ page }} of {{ pagination.pageCount }}</span>
          <button class="btn-soft" :disabled="page >= pagination.pageCount" @click="page++">Next ›</button>
        </nav>
      </section>
    </div>
  </div>
</template>

<script setup>
import '~/assets/css/org-desk.css'

definePageMeta({ middleware: 'org-rights' })
useHead({
  title: 'Organisations — E-Paper Admin',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
  ]
})

const { orgs } = useHandleApi()
const today = new Date().toISOString().slice(0, 10)

const statusFilters = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' }
]
const status = ref('')
const search = ref('')
const page = ref(1)
const rows = ref([])
const pagination = ref(null)
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await orgs.list({ page: page.value, pageSize: 25, ...(search.value.trim() ? { search: search.value.trim() } : {}), ...(status.value ? { status: status.value } : {}) })
    rows.value = res.organisations || []
    pagination.value = res.pagination || null
  } catch (e) {
    loadError.value = errMsg(e, 'Organisations could not be loaded.')
  } finally {
    loading.value = false
  }
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})
watch(status, () => { page.value = 1; load() })
watch(page, load)
onMounted(load)
onUnmounted(() => clearTimeout(searchTimer))

// ---- create ----
const creating = ref(false)
const saving = ref(false)
const createError = ref('')
const blank = () => ({ name: '', seatLimit: '', contactName: '', contactEmail: '', contactPhone: '', notes: '', contractStart: '', contractEnd: '', amountPaid: '', contractNote: '', adminEmail: '' })
const form = reactive(blank())

function openCreate() {
  Object.assign(form, blank())
  createError.value = ''
  creating.value = true
}

async function submitCreate() {
  createError.value = ''
  const hasStart = Boolean(form.contractStart)
  const hasEnd = Boolean(form.contractEnd)
  if (hasStart !== hasEnd) { createError.value = 'Give both a start and an end date for the paid period, or neither.'; return }
  if (hasStart && form.contractStart > form.contractEnd) { createError.value = 'The paid period must end on or after its start.'; return }

  const body = {
    name: form.name,
    seatLimit: form.seatLimit === '' ? null : Number(form.seatLimit),
    contactName: form.contactName || null,
    contactEmail: form.contactEmail || null,
    contactPhone: form.contactPhone || null,
    notes: form.notes || null,
    ...(form.adminEmail ? { adminEmail: form.adminEmail } : {}),
    ...(hasStart ? {
      contract: {
        coverageStart: form.contractStart,
        coverageEnd: form.contractEnd,
        amountPaid: form.amountPaid === '' ? null : Number(form.amountPaid),
        currency: 'UGX',
        note: form.contractNote || null
      }
    } : {})
  }

  saving.value = true
  try {
    const res = await orgs.create(body)
    creating.value = false
    await navigateTo(`/organisations/${res.organisation.id}`)
  } catch (e) {
    createError.value = errMsg(e, 'The organisation could not be created.')
  } finally {
    saving.value = false
  }
}

// ---- formatting ----
function statusChip(s) {
  return s === 'active' ? 'chip-green' : s === 'suspended' ? 'chip-amber' : 'chip-grey'
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function errMsg(e, fallback) {
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || fallback
}
</script>

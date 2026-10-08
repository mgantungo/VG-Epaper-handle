<!--
  File:      /var/www/VGEpaper/handle/app/components/OrgImportPanel.vue
  Repo path: apps/handle/app/components/OrgImportPanel.vue        NEW FILE

  Members spreadsheet for one organisation, used on the "Spreadsheet" tab of
  pages/organisations/[id].vue. Same flow and rules as the Org Admin's own
  upload on the e-paper site:
    1. download the members spreadsheet (current members pre-filled, or a
       guided empty sheet if there are none yet), fill it in
    2. upload it: every row is previewed (new account, added, extended,
       unchanged, skipped) and nothing is written yet
    3. apply: one transaction; invite emails go out afterwards
  Rendered inside .orgdesk, so it uses org-desk.css classes.
-->
<template>
  <div>
    <p v-if="error" class="notice notice-err mb-3" role="alert">{{ error }}</p>

    <!-- step 1 -->
    <div v-if="step === 1" class="grid gap-4 lg:grid-cols-2">
      <section class="p-4 rounded-xl" style="background:#f5f7ff; box-shadow: inset 0 0 0 1px rgba(47,85,228,.25)">
        <h3 class="display text-[16px]">1. Download, fill in</h3>
        <p class="text-[13px] muted mt-2">
          The spreadsheet lists this organisation's current members. If there are none yet, it's an empty sheet with
          headings, help notes on each heading, and a "How to fill this in" tab. Add one person per row; only Email is required.
        </p>
        <ul class="text-[13px] muted mt-2 list-disc pl-5 space-y-1">
          <li>Existing members are only changed if you give them dates or months.</li>
          <li>New people get an account and an email to set their password.</li>
          <li>Nobody is duplicated. Nothing changes until you confirm the preview.</li>
        </ul>
        <a :href="orgs.templateUrl(orgId)" class="btn-ink mt-4" download>Download members spreadsheet</a>
      </section>

      <section class="p-4 rounded-xl" style="background:#fff; box-shadow: 0 0 0 1px var(--line)">
        <h3 class="display text-[16px]">2. Upload it</h3>
        <label class="label mt-3" for="imp-file">File (.xlsx or .csv, up to 5,000 rows)</label>
        <input id="imp-file" type="file" accept=".xlsx,.csv" class="block w-full text-[13px]" @change="onFile">

        <fieldset class="mt-4">
          <legend class="label">Access for NEW people without their own dates</legend>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] mt-1">
            <label class="flex items-center gap-2"><input v-model="mode" type="radio" value="paid"> Rest of the paid period<span v-if="paidUntil" class="muted">(until {{ fmt(paidUntil) }})</span></label>
            <label class="flex items-center gap-2">
              <input v-model="mode" type="radio" value="months"> For
              <select v-model.number="months" class="field !h-8 !w-28" @focus="mode = 'months'">
                <option v-for="n in [1, 2, 3, 6, 9, 12, 18, 24]" :key="n" :value="n">{{ n }} {{ n === 1 ? 'month' : 'months' }}</option>
              </select>
            </label>
            <label class="flex items-center gap-2"><input v-model="mode" type="radio" value="custom"> Specific dates</label>
          </div>
          <div v-if="mode === 'custom'" class="grid grid-cols-2 gap-3 mt-3">
            <div><label class="label" for="imp-s">Start</label><input id="imp-s" v-model="start" type="date" class="field"></div>
            <div><label class="label" for="imp-e">End</label><input id="imp-e" v-model="end" type="date" class="field" :min="start || undefined"></div>
          </div>
        </fieldset>

        <button class="btn-ink w-full mt-5" :disabled="busy || !file" @click="check">{{ busy ? 'Checking…' : 'Check file' }}</button>
      </section>
    </div>

    <!-- step 2: preview -->
    <div v-else-if="step === 2 && preview">
      <div class="grid gap-3 grid-cols-2 md:grid-cols-6">
        <div v-for="c in cards" :key="c.label" class="stat" :class="c.edge">
          <p class="mono text-[11px] muted">{{ c.label }}</p>
          <p class="display text-[22px] mt-1">{{ c.value }}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3 mt-4">
        <div class="seg seg-light" role="group" aria-label="Filter rows">
          <button v-for="f in filters" :key="f.value" class="seg-btn" :class="rowFilter === f.value ? 'seg-on' : ''" @click="rowFilter = f.value">{{ f.label }} <span class="seg-n">{{ f.n }}</span></button>
        </div>
        <button v-if="preview.summary.errors" class="btn-soft ml-auto" @click="downloadProblems">Download skipped rows</button>
      </div>
      <div class="table-scroll mt-3">
        <table class="otable">
          <thead><tr><th>Row</th><th>Email</th><th>Name</th><th>What happens</th><th>Access</th><th>Notes</th></tr></thead>
          <tbody>
            <tr v-for="r in shownRows.slice(0, 500)" :key="r.row">
              <td class="mono text-[12px] muted">{{ r.row }}</td>
              <td class="break-all">{{ r.email || '—' }}</td>
              <td>{{ r.displayName || '—' }}</td>
              <td><span class="chip" :class="ACTION[r.action]?.cls">{{ ACTION[r.action]?.label || r.action }}</span></td>
              <td class="mono text-[12px] whitespace-nowrap">{{ r.start ? `${fmt(r.start)} – ${fmt(r.end)}` : '—' }}</td>
              <td class="text-[12px]" :class="r.error ? 'text-red-700' : 'muted'">{{ r.error || r.notes?.join(' · ') || '' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="shownRows.length > 500" class="text-[12px] muted mt-2">Showing the first 500 of {{ shownRows.length }} rows. All of them will be applied.</p>
      </div>
      <div class="flex flex-wrap justify-end gap-2 mt-4">
        <button class="btn-ghost" :disabled="busy" @click="restart">Choose another file</button>
        <button class="btn-ink" :disabled="busy || !actionable" @click="apply">{{ busy ? 'Applying…' : actionable ? `Apply ${actionable} ${actionable === 1 ? 'change' : 'changes'}` : 'Nothing to apply' }}</button>
      </div>
      <p class="text-[11px] muted text-right mt-2">Skipped and unchanged rows are left as they are. This preview is valid for 24 hours.</p>
    </div>

    <!-- step 3: done -->
    <div v-else-if="step === 3 && result" class="max-w-xl">
      <h3 class="display text-[18px]">Spreadsheet applied</h3>
      <ul class="mt-3 text-[13px] space-y-1">
        <li><strong>{{ result.result.created }}</strong> new accounts created</li>
        <li><strong>{{ result.result.added }}</strong> existing readers added</li>
        <li><strong>{{ result.result.extended }}</strong> members' access extended<template v-if="result.result.unchanged"> ({{ result.result.unchanged }} already had it)</template></li>
        <li><strong>{{ result.result.kept ?? 0 }}</strong> members left unchanged</li>
        <li><strong>{{ result.result.skipped }}</strong> rows skipped</li>
      </ul>
      <p v-if="result.invitesQueued" class="text-[13px] muted mt-3">{{ result.invitesQueued }} invite {{ result.invitesQueued === 1 ? 'email is' : 'emails are' }} being sent.</p>
      <div class="flex flex-wrap gap-2 mt-4">
        <button class="btn-ink" @click="restart">Upload another file</button>
        <button v-if="result.result.skipped" class="btn-soft" @click="downloadProblems">Download skipped rows</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  orgId: { type: [String, Number], required: true },
  paidUntil: { type: String, default: null }
})
const emit = defineEmits(['applied'])
const { orgs } = useHandleApi()

const step = ref(1)
const file = ref(null)
const mode = ref('paid')
const months = ref(12)
const start = ref('')
const end = ref('')
const busy = ref(false)
const error = ref('')
const preview = ref(null)
const result = ref(null)
const rowFilter = ref('all')

const ACTION = {
  new_user: { label: 'New account + invite', cls: 'chip-blue' },
  add_existing: { label: 'Add (has account)', cls: 'chip-green' },
  extend: { label: 'Extend access', cls: 'chip-accent' },
  keep: { label: 'No change', cls: 'chip-grey' },
  error: { label: 'Skipped', cls: 'chip-red' }
}

function onFile(e) {
  file.value = e.target.files?.[0] || null
  error.value = ''
}

function defaults() {
  if (mode.value === 'months') return { months: months.value }
  if (mode.value === 'custom') return { coverageStart: start.value || undefined, coverageEnd: end.value || undefined }
  return {}
}

async function check() {
  if (!file.value) return
  error.value = ''
  busy.value = true
  try {
    const fd = new FormData()
    fd.append('file', file.value, file.value.name)
    fd.append('defaults', JSON.stringify(defaults()))
    preview.value = await orgs.previewImport(props.orgId, fd)
    rowFilter.value = preview.value.summary.errors ? 'error' : 'all'
    step.value = 2
  } catch (e) {
    error.value = errMsg(e, 'The file could not be checked.')
  } finally {
    busy.value = false
  }
}

const actionable = computed(() => {
  const s = preview.value?.summary
  return s ? s.newUsers + s.addExisting + s.extend : 0
})
const cards = computed(() => {
  const s = preview.value?.summary || {}
  return [
    { label: 'New accounts', value: s.newUsers, edge: 'edge-green' },
    { label: 'Added (have account)', value: s.addExisting, edge: 'edge-green' },
    { label: 'Access extended', value: s.extend, edge: '' },
    { label: 'No change', value: s.keep ?? 0, edge: 'edge-grey' },
    { label: 'Shortened to paid period', value: s.clipped, edge: s.clipped ? 'edge-amber' : 'edge-grey' },
    { label: 'Skipped', value: s.errors, edge: s.errors ? 'edge-red' : 'edge-grey' }
  ]
})
const filters = computed(() => {
  const s = preview.value?.summary || {}
  return [
    { value: 'all', label: 'All', n: s.total },
    { value: 'new_user', label: 'New', n: s.newUsers },
    { value: 'add_existing', label: 'Added', n: s.addExisting },
    { value: 'extend', label: 'Extended', n: s.extend },
    { value: 'keep', label: 'No change', n: s.keep ?? 0 },
    { value: 'error', label: 'Skipped', n: s.errors }
  ]
})
const shownRows = computed(() => {
  const rows = preview.value?.rows || []
  return rowFilter.value === 'all' ? rows : rows.filter(r => r.action === rowFilter.value)
})

async function apply() {
  busy.value = true
  error.value = ''
  try {
    result.value = await orgs.commitImport(props.orgId, preview.value.importId)
    step.value = 3
    emit('applied', result.value)
  } catch (e) {
    error.value = errMsg(e, 'The changes could not be applied. Nothing was changed.')
  } finally {
    busy.value = false
  }
}

function restart() {
  step.value = 1
  file.value = null
  preview.value = null
  result.value = null
  error.value = ''
}

function downloadProblems() {
  const rows = (result.value?.rows || preview.value?.rows || []).filter(r => r.action === 'error')
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = ['Row,Email,Name,Phone,Problem', ...rows.map(r => [r.row, r.email, r.displayName, r.phone, r.error].map(esc).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'members-not-imported.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fmt(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function errMsg(e, fallback) {
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || fallback
}
</script>

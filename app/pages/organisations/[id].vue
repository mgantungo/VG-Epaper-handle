<!--
  File:      /var/www/VGEpaper/handle/app/pages/organisations/[id].vue
  Repo path: apps/handle/app/pages/organisations/[id].vue          NEW FILE
  URL:       /organisations/:id   (?tab=periods|members|admins|activity|details)

  One organisation: status actions (suspend / reactivate / archive, each
  with a reason), seat and paid-period summary, and tabs for paid periods
  (add, extend, revoke), Org Admins (assign, demote), members (read-only
  list with force suspend / reactivate), activity log and editable details.
-->
<template>
  <div class="orgdesk">
    <header class="hero">
      <div class="hero-inner">
        <div class="min-w-0">
          <NuxtLink to="/organisations" class="mono text-[11px] muted hover:underline">← Organisations</NuxtLink>
          <h1 class="display text-[26px] leading-tight mt-1 truncate">{{ org?.name || (loadError ? 'Organisation' : 'Loading…') }}</h1>
          <p v-if="org" class="mt-2 flex flex-wrap items-center gap-2">
            <span class="chip" :class="statusChip(org.status)"><span class="dot" />{{ org.status }}</span>
            <span v-if="org.status !== 'active' && org.suspendedReason" class="text-[12px] muted">{{ org.suspendedReason }} · since {{ fmtDateTime(org.suspendedAt) }}</span>
          </p>
        </div>
        <div v-if="org" class="flex flex-wrap gap-2">
          <button v-if="org.status !== 'active'" class="btn-ink" @click="askStatus('active')">Reactivate</button>
          <button v-if="org.status === 'active'" class="btn-ghost" @click="askStatus('suspended')">Suspend</button>
          <button v-if="org.status !== 'archived'" class="btn-ghost" @click="askStatus('archived')">Archive</button>
        </div>
      </div>
    </header>

    <div class="wrap">
      <p v-if="loadError" class="panel p-8 text-center text-sm text-red-700">{{ loadError }} <button class="underline" @click="load">Try again</button></p>

      <template v-else-if="detail">
        <p v-if="flash.text" class="notice mb-4" :class="flash.ok ? 'notice-ok' : 'notice-err'" role="status">{{ flash.text }}</p>

        <!-- stats -->
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="stat" :class="seatTone">
            <p class="mono text-[11px] muted">Seats in use</p>
            <p class="display text-[26px] mt-1">{{ detail.seats.inUse }}<span class="faint text-[18px]"> / {{ detail.seats.limit ?? '∞' }}</span></p>
            <p class="text-[12px] muted mt-1">{{ detail.seats.suspended }} suspended (not counted)</p>
          </div>
          <div class="stat" :class="summary.current ? 'edge-green' : 'edge-amber'">
            <p class="mono text-[11px] muted">Paid period</p>
            <p class="display text-[18px] mt-2">{{ summary.current ? `Until ${fmtDate(summary.current.coverageEnd)}` : 'None active' }}</p>
            <p class="text-[12px] muted mt-1">{{ summary.upcomingCount ? `${summary.upcomingCount} upcoming` : summary.latestEnd && !summary.current ? `Last ended ${fmtDate(summary.latestEnd)}` : 'Members read only within paid periods' }}</p>
          </div>
          <div class="stat">
            <p class="mono text-[11px] muted">Org Admins</p>
            <p class="display text-[26px] mt-1">{{ detail.admins.length }}</p>
            <p class="text-[12px] muted mt-1 truncate">{{ org.owner?.email || 'No primary admin' }}</p>
          </div>
          <div class="stat edge-grey">
            <p class="mono text-[11px] muted">Contact</p>
            <p class="text-[13px] font-semibold mt-2 truncate">{{ org.contactName || '—' }}</p>
            <p class="text-[12px] muted truncate">{{ [org.contactEmail, org.contactPhone].filter(Boolean).join(' · ') || 'No contact details' }}</p>
          </div>
        </div>

        <!-- tabs -->
        <section class="panel mt-5">
          <nav class="tabs px-3" role="tablist">
            <button v-for="t in tabs" :key="t.key" role="tab" class="tab" :class="tab === t.key ? 'tab-on' : ''" :aria-selected="tab === t.key" @click="setTab(t.key)">
              {{ t.label }}<span v-if="t.count !== undefined" class="mono text-[11px] accent ml-1">{{ t.count }}</span>
            </button>
          </nav>

          <!-- Paid periods -->
          <div v-if="tab === 'periods'" class="p-4">
            <p class="text-[13px] muted max-w-3xl">Members can only read editions dated inside a paid period, and only within the access their Org Admin gives them. Revoking a period cuts access for those dates immediately.</p>
            <div class="table-scroll mt-3">
              <table v-if="detail.contracts.length" class="otable">
                <thead><tr><th>From</th><th>Until</th><th>Amount</th><th>Reference</th><th>State</th><th class="text-right">Actions</th></tr></thead>
                <tbody>
                  <tr v-for="c in detail.contracts" :key="c.id">
                    <td class="mono">{{ fmtDate(c.coverageStart) }}</td>
                    <td class="mono">
                      <template v-if="editingContract === c.id">
                        <input v-model="contractEndDraft" type="date" class="field !h-8 !w-40" :min="c.coverageStart" aria-label="New end date">
                      </template>
                      <template v-else>{{ fmtDate(c.coverageEnd) }}</template>
                    </td>
                    <td class="mono">{{ c.amountPaid != null ? `${Number(c.amountPaid).toLocaleString()} ${c.currency || ''}` : '—' }}</td>
                    <td class="text-[12px]">{{ c.note || c.plan?.label || '—' }}</td>
                    <td><span class="chip" :class="periodChip(c).cls"><span class="dot" />{{ periodChip(c).text }}</span></td>
                    <td class="text-right whitespace-nowrap">
                      <template v-if="editingContract === c.id">
                        <button class="btn-soft" :disabled="busy" @click="saveContractEnd(c)">Save</button>
                        <button class="btn-soft ml-1" @click="editingContract = null">Cancel</button>
                      </template>
                      <template v-else>
                        <button class="btn-soft" @click="editingContract = c.id; contractEndDraft = c.coverageEnd">Change end</button>
                        <button class="btn-soft btn-soft-danger ml-1" @click="askRevoke(c)">Revoke</button>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="text-sm muted py-3">No paid periods yet. Add one so members can read.</p>
            </div>

            <form class="mt-4 grid gap-3 md:grid-cols-5 items-end p-4 rounded-xl" style="background:#f5f7ff; box-shadow: inset 0 0 0 1px rgba(47,85,228,.25)" @submit.prevent="addContract">
              <div><label class="label" for="p-start">Start *</label><input id="p-start" v-model="contractForm.coverageStart" type="date" class="field" required></div>
              <div><label class="label" for="p-end">End *</label><input id="p-end" v-model="contractForm.coverageEnd" type="date" class="field" required :min="contractForm.coverageStart"></div>
              <div><label class="label" for="p-amt">Amount (UGX)</label><input id="p-amt" v-model="contractForm.amountPaid" type="number" min="0" class="field"></div>
              <div><label class="label" for="p-note">Reference</label><input id="p-note" v-model.trim="contractForm.note" class="field" placeholder="Invoice, LPO…"></div>
              <button class="btn-ink" :disabled="busy">Add paid period</button>
            </form>
          </div>

          <!-- Admins -->
          <div v-else-if="tab === 'admins'" class="p-4">
            <p class="text-[13px] muted max-w-3xl">Org Admins sign in on the e-paper site and manage this organisation's members there: add people, upload spreadsheets, extend access, suspend and remove.</p>
            <ul class="mt-3 divide-y" style="border-color: var(--line)">
              <li v-for="a in detail.admins" :key="a.seatId" class="flex flex-wrap items-center gap-3 py-3">
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-[14px] truncate">{{ a.user?.displayName || a.user?.email }}</p>
                  <p class="text-[12px] muted truncate">{{ a.user?.email }}<template v-if="a.user?.phone"> · {{ a.user.phone }}</template></p>
                </div>
                <span v-if="org.owner?.id === a.user?.id" class="chip chip-accent">primary</span>
                <span class="chip" :class="a.status === 'active' ? 'chip-green' : 'chip-amber'"><span class="dot" />{{ a.status }}</span>
                <button class="btn-soft" :disabled="busy" @click="askDemote(a)">Remove admin role</button>
              </li>
              <li v-if="!detail.admins.length" class="py-3 text-sm muted">No Org Admin yet. Assign one so the organisation can manage its own members.</li>
            </ul>
            <form class="mt-4 flex flex-wrap items-end gap-3 p-4 rounded-xl" style="background:#f5f7ff; box-shadow: inset 0 0 0 1px rgba(47,85,228,.25)" @submit.prevent="assignAdmin">
              <div class="flex-1 min-w-[240px]">
                <label class="label" for="a-email">Reader account email</label>
                <input id="a-email" v-model.trim="adminEmail" type="email" class="field" required placeholder="They must already have a reader account">
              </div>
              <label class="flex items-center gap-2 text-[13px] h-10">
                <input v-model="adminGrantAccess" type="checkbox"> Give them reading access for the current paid period
              </label>
              <button class="btn-ink" :disabled="busy">Assign Org Admin</button>
            </form>
          </div>

          <!-- Members -->
          <div v-else-if="tab === 'members'" class="p-4">
            <div class="flex flex-wrap items-center gap-3">
              <input v-model="memberSearch" type="search" class="field max-w-xs" placeholder="Search name or email" aria-label="Search members">
              <div class="seg seg-light" role="group" aria-label="Member status">
                <button v-for="f in memberFilters" :key="f.value" class="seg-btn" :class="memberStatus === f.value ? 'seg-on' : ''" @click="memberStatus = f.value">{{ f.label }}</button>
              </div>
              <span class="mono text-[11px] faint ml-auto">{{ memberPagination?.total ?? 0 }} members</span>
            </div>
            <p class="text-[12px] muted mt-2">Members are managed by the Org Admin. You can force-suspend or reactivate anyone here.</p>
            <div class="table-scroll mt-3">
              <table v-if="members.length" class="otable">
                <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Access</th><th>Added</th><th class="text-right">Actions</th></tr></thead>
                <tbody>
                  <tr v-for="m in members" :key="m.seatId">
                    <td>
                      <p class="font-semibold truncate max-w-[260px]">{{ m.user?.displayName || m.user?.email }}</p>
                      <p class="text-[12px] muted truncate max-w-[260px]">{{ m.user?.email }}</p>
                    </td>
                    <td><span class="chip" :class="m.role === 'admin' ? 'chip-accent' : 'chip-grey'">{{ m.role }}</span></td>
                    <td>
                      <span class="chip" :class="m.status === 'active' ? 'chip-green' : 'chip-amber'"><span class="dot" />{{ m.status }}</span>
                      <span v-if="m.invitePending" class="chip chip-blue ml-1">invite pending</span>
                    </td>
                    <td class="mono text-[12px]">
                      <template v-if="m.access.contractWide">whole paid period</template>
                      <template v-else-if="m.access.current">until {{ fmtDate(m.access.current.end) }}</template>
                      <template v-else-if="m.access.latestEnd && m.access.latestEnd >= today">from later date</template>
                      <span v-else class="faint">{{ m.access.latestEnd ? `ended ${fmtDate(m.access.latestEnd)}` : 'none' }}</span>
                    </td>
                    <td class="mono text-[12px] muted">{{ fmtDate(m.assignedAt?.slice(0, 10)) }}<br><span class="faint">{{ m.source || '' }}</span></td>
                    <td class="text-right">
                      <button v-if="m.status === 'active'" class="btn-soft btn-soft-danger" :disabled="busy" @click="askMemberStatus(m, 'suspended')">Suspend</button>
                      <button v-else class="btn-soft" :disabled="busy" @click="askMemberStatus(m, 'active')">Reactivate</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else-if="!membersLoading" class="text-sm muted py-4">{{ memberSearch || memberStatus ? 'No members match.' : 'No members yet.' }}</p>
            </div>
            <nav v-if="memberPagination && memberPagination.pageCount > 1" class="flex items-center justify-between mt-3">
              <button class="btn-soft" :disabled="memberPage <= 1" @click="memberPage--">‹ Previous</button>
              <span class="mono text-[12px] muted">Page {{ memberPage }} of {{ memberPagination.pageCount }}</span>
              <button class="btn-soft" :disabled="memberPage >= memberPagination.pageCount" @click="memberPage++">Next ›</button>
            </nav>
          </div>

          <!-- Activity -->
          <div v-else-if="tab === 'activity'" class="p-4">
            <ul class="divide-y" style="border-color: var(--line)">
              <li v-for="e in auditEntries" :key="e.id" class="py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <span class="mono text-[12px] muted w-40 shrink-0">{{ fmtDateTime(e.at) }}</span>
                <span class="flex-1 min-w-[220px]">
                  <span class="font-semibold">{{ actionLabel(e.action) }}</span>
                  <template v-if="e.target"> · {{ e.target.email }}</template>
                  <span v-if="metaText(e)" class="muted"> · {{ metaText(e) }}</span>
                </span>
                <span class="text-[12px] muted">
                  {{ e.actor ? `${e.actor.displayName || e.actor.email}` : 'system' }}
                  <span class="chip ml-1" :class="e.actor?.kind === 'handle' ? 'chip-accent' : 'chip-grey'">{{ e.actor?.kind === 'handle' ? 'New Vision' : 'org admin' }}</span>
                </span>
              </li>
              <li v-if="!auditEntries.length && !auditLoading" class="py-3 text-sm muted">No activity yet.</li>
            </ul>
            <button v-if="auditHasMore" class="btn-ghost w-full mt-3" :disabled="auditLoading" @click="loadAudit(true)">{{ auditLoading ? 'Loading…' : 'Load older' }}</button>
          </div>

          <!-- Details -->
          <div v-else-if="tab === 'details'" class="p-4">
            <form class="grid gap-4 md:grid-cols-2 max-w-3xl" @submit.prevent="saveDetails">
              <div class="md:col-span-2"><label class="label" for="d-name">Name</label><input id="d-name" v-model.trim="details.name" class="field" required></div>
              <div>
                <label class="label" for="d-seats">Seat limit</label>
                <input id="d-seats" v-model="details.seatLimit" type="number" min="0" class="field" placeholder="No limit">
                <p class="hint">Can't go below the {{ detail.seats.inUse }} seats in use.</p>
              </div>
              <div><label class="label" for="d-cname">Contact person</label><input id="d-cname" v-model.trim="details.contactName" class="field"></div>
              <div><label class="label" for="d-cemail">Contact email</label><input id="d-cemail" v-model.trim="details.contactEmail" type="email" class="field"></div>
              <div><label class="label" for="d-cphone">Contact phone</label><input id="d-cphone" v-model.trim="details.contactPhone" class="field"></div>
              <div class="md:col-span-2"><label class="label" for="d-notes">Internal notes</label><textarea id="d-notes" v-model="details.notes" rows="3" class="field" /></div>
              <div class="md:col-span-2 flex justify-end"><button class="btn-ink" :disabled="busy">Save details</button></div>
            </form>
          </div>
        </section>
      </template>

      <div v-else class="panel p-10 text-center text-sm muted">Loading…</div>
    </div>

    <!-- confirm dialog -->
    <div v-if="dialog" class="overlay" role="dialog" aria-modal="true" aria-labelledby="dlg-h" @click.self="dialog = null">
      <form class="dialog" @submit.prevent="runDialog">
        <h2 id="dlg-h" class="display text-[18px]">{{ dialog.title }}</h2>
        <p class="text-[13px] muted mt-2">{{ dialog.text }}</p>
        <div v-if="dialog.reason !== undefined" class="mt-4">
          <label class="label" for="dlg-reason">Reason{{ dialog.reasonRequired ? ' *' : '' }}</label>
          <textarea id="dlg-reason" v-model="dialog.reason" rows="3" class="field" :required="dialog.reasonRequired" />
        </div>
        <p v-if="dialog.error" class="notice notice-err mt-3">{{ dialog.error }}</p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="btn-ghost" @click="dialog = null">Cancel</button>
          <button type="submit" :class="dialog.danger ? 'btn-danger' : 'btn-ink'" :disabled="busy">{{ busy ? 'Working…' : dialog.confirm }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import '~/assets/css/org-desk.css'

definePageMeta({ middleware: 'org-rights' })
useHead({
  title: 'Organisation — E-Paper Admin',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
  ]
})

const route = useRoute()
const router = useRouter()
const { orgs } = useHandleApi()
const id = computed(() => String(route.params.id))
const today = new Date().toISOString().slice(0, 10)

const detail = ref(null)
const loadError = ref('')
const busy = ref(false)
const flash = reactive({ text: '', ok: true })
let flashTimer = null
function say(text, ok = true) {
  flash.text = text
  flash.ok = ok
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.text = ''), 6000)
}

const org = computed(() => detail.value?.organisation || null)
const summary = computed(() => detail.value?.contractSummary || {})
const seatTone = computed(() => {
  const s = detail.value?.seats
  if (!s || s.limit == null) return ''
  return s.inUse >= s.limit ? 'edge-red' : s.inUse >= s.limit * 0.9 ? 'edge-amber' : 'edge-green'
})

async function load() {
  loadError.value = ''
  try {
    detail.value = await orgs.get(id.value)
    syncDetails()
  } catch (e) {
    loadError.value = errMsg(e, 'This organisation could not be loaded.')
  }
}

// mutations return the refreshed organisation; this applies it and reports
async function act(fn, okText) {
  busy.value = true
  try {
    const res = await fn()
    if (res?.organisation) { detail.value = res; syncDetails() }
    if (okText) say(okText)
    return true
  } catch (e) {
    say(errMsg(e, 'That did not work.'), false)
    return false
  } finally {
    busy.value = false
  }
}

// ---- tabs ----
const tab = ref(['periods', 'admins', 'members', 'activity', 'details'].includes(route.query.tab) ? route.query.tab : 'periods')
const tabs = computed(() => [
  { key: 'periods', label: 'Paid periods', count: detail.value?.contracts.length },
  { key: 'admins', label: 'Org Admins', count: detail.value?.admins.length },
  { key: 'members', label: 'Members', count: detail.value ? detail.value.seats.inUse + detail.value.seats.suspended : undefined },
  { key: 'activity', label: 'Activity' },
  { key: 'details', label: 'Details' }
])
function setTab(k) {
  tab.value = k
  router.replace({ query: { ...route.query, tab: k } })
}
watch(tab, (k) => {
  if (k === 'members' && !membersLoaded) loadMembers()
  if (k === 'activity') loadAudit()
})

// ---- status ----
const dialog = ref(null)
function askStatus(status) {
  const name = org.value.name
  const copy = {
    active: { title: 'Reactivate organisation', text: `Members of ${name} can read again (within their access and the paid periods), and its Org Admins can manage members again.`, confirm: 'Reactivate' },
    suspended: { title: 'Suspend organisation', text: `Every member of ${name} loses reading access immediately, and its Org Admins are locked out of member management. Nothing is deleted; reactivating restores everything.`, confirm: 'Suspend', danger: true },
    archived: { title: 'Archive organisation', text: `Use this when ${name} is no longer a customer. Access stops like a suspension, and it is filed as archived. It can still be reactivated later.`, confirm: 'Archive', danger: true }
  }[status]
  dialog.value = {
    ...copy,
    reason: status === 'active' ? undefined : '',
    reasonRequired: status !== 'active',
    run: (d) => orgs.setStatus(id.value, status, d.reason),
    ok: status === 'active' ? 'Organisation reactivated.' : status === 'suspended' ? 'Organisation suspended.' : 'Organisation archived.'
  }
}

async function runDialog() {
  const d = dialog.value
  if (!d) return
  d.error = ''
  busy.value = true
  try {
    const res = await d.run(d)
    if (res?.organisation) { detail.value = res; syncDetails() }
    dialog.value = null
    say(d.ok)
    if (d.after) await d.after()
  } catch (e) {
    d.error = errMsg(e, 'That did not work.')
  } finally {
    busy.value = false
  }
}

// ---- paid periods ----
const contractForm = reactive({ coverageStart: '', coverageEnd: '', amountPaid: '', note: '' })
const editingContract = ref(null)
const contractEndDraft = ref('')

function periodChip(c) {
  if (c.coverageEnd < today) return { text: 'ended', cls: 'chip-grey' }
  if (c.coverageStart > today) return { text: 'upcoming', cls: 'chip-blue' }
  return { text: 'current', cls: 'chip-green' }
}
async function addContract() {
  if (contractForm.coverageStart > contractForm.coverageEnd) { say('The paid period must end on or after its start.', false); return }
  const ok = await act(() => orgs.addContract(id.value, {
    coverageStart: contractForm.coverageStart,
    coverageEnd: contractForm.coverageEnd,
    amountPaid: contractForm.amountPaid === '' ? null : Number(contractForm.amountPaid),
    currency: 'UGX',
    note: contractForm.note || null
  }), 'Paid period added.')
  if (ok) Object.assign(contractForm, { coverageStart: '', coverageEnd: '', amountPaid: '', note: '' })
}
async function saveContractEnd(c) {
  if (!contractEndDraft.value || contractEndDraft.value < c.coverageStart) { say('Choose an end date on or after the start.', false); return }
  const ok = await act(() => orgs.updateContract(id.value, c.id, { coverageEnd: contractEndDraft.value }), 'Paid period updated.')
  if (ok) editingContract.value = null
}
function askRevoke(c) {
  dialog.value = {
    title: 'Revoke paid period',
    text: `${fmtDate(c.coverageStart)} – ${fmtDate(c.coverageEnd)}. Members lose access to editions in these dates unless another paid period covers them. Use this for refunds or mistakes; it stays in the activity log.`,
    confirm: 'Revoke', danger: true, reason: '', reasonRequired: true,
    run: (d) => orgs.revokeContract(id.value, c.id, d.reason),
    ok: 'Paid period revoked.'
  }
}

// ---- admins ----
const adminEmail = ref('')
const adminGrantAccess = ref(true)
async function assignAdmin() {
  const ok = await act(() => orgs.assignAdmin(id.value, adminEmail.value, adminGrantAccess.value), `${adminEmail.value} is now an Org Admin.`)
  if (ok) adminEmail.value = ''
}
function askDemote(a) {
  dialog.value = {
    title: 'Remove admin role',
    text: `${a.user?.email} stays a member with their current access, but can no longer manage members.`,
    confirm: 'Remove admin role',
    run: () => orgs.removeAdmin(id.value, a.seatId),
    ok: 'Admin role removed.'
  }
}

// ---- members ----
const members = ref([])
const memberPagination = ref(null)
const memberPage = ref(1)
const memberSearch = ref('')
const memberStatus = ref('')
const membersLoading = ref(false)
let membersLoaded = false
const memberFilters = [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]

async function loadMembers() {
  membersLoading.value = true
  try {
    const res = await orgs.members(id.value, {
      page: memberPage.value, pageSize: 25,
      ...(memberSearch.value.trim() ? { search: memberSearch.value.trim() } : {}),
      ...(memberStatus.value ? { status: memberStatus.value } : {})
    })
    members.value = res.members || []
    memberPagination.value = res.pagination
    membersLoaded = true
  } catch (e) {
    say(errMsg(e, 'Members could not be loaded.'), false)
  } finally {
    membersLoading.value = false
  }
}
let memberTimer = null
watch(memberSearch, () => { clearTimeout(memberTimer); memberTimer = setTimeout(() => { memberPage.value = 1; loadMembers() }, 300) })
watch(memberStatus, () => { memberPage.value = 1; loadMembers() })
watch(memberPage, loadMembers)

function askMemberStatus(m, status) {
  const who = m.user?.email
  dialog.value = status === 'suspended'
    ? { title: 'Suspend member', text: `${who} loses reading access immediately. Their Org Admin can see this and reactivate them.`, confirm: 'Suspend', danger: true, reason: '', reasonRequired: true }
    : { title: 'Reactivate member', text: `${who} can read again within their access. This takes a seat.`, confirm: 'Reactivate' }
  Object.assign(dialog.value, {
    run: (d) => orgs.setMemberStatus(id.value, m.seatId, status, d.reason),
    ok: status === 'suspended' ? 'Member suspended.' : 'Member reactivated.',
    after: async () => { await Promise.all([loadMembers(), load()]) }
  })
}

// ---- activity ----
const auditEntries = ref([])
const auditPage = ref(0)
const auditHasMore = ref(false)
const auditLoading = ref(false)
async function loadAudit(more = false) {
  auditLoading.value = true
  try {
    const next = more ? auditPage.value + 1 : 1
    const res = await orgs.audit(id.value, { page: next, pageSize: 30 })
    auditEntries.value = more ? [...auditEntries.value, ...(res.entries || [])] : (res.entries || [])
    auditPage.value = next
    auditHasMore.value = res.pagination ? next < res.pagination.pageCount : false
  } catch (e) {
    say(errMsg(e, 'Activity could not be loaded.'), false)
  } finally {
    auditLoading.value = false
  }
}

const ACTION_LABELS = {
  'org.create': 'Organisation created', 'org.update': 'Details changed', 'org.suspend': 'Organisation suspended',
  'org.reactivate': 'Organisation reactivated', 'org.archive': 'Organisation archived',
  'contract.create': 'Paid period added', 'contract.extend': 'Paid period changed', 'contract.revoke': 'Paid period revoked',
  'member.add': 'Member added', 'member.invite': 'Invite sent', 'member.suspend': 'Member suspended',
  'member.reactivate': 'Member reactivated', 'member.remove': 'Member removed', 'member.role': 'Role changed',
  'access.create': 'Access granted', 'access.extend': 'Access extended', 'access.revoke': 'Access revoked',
  'import.preview': 'Spreadsheet checked', 'import.commit': 'Spreadsheet applied', 'import.fail': 'Spreadsheet failed'
}
const actionLabel = (a) => ACTION_LABELS[a] || a
function metaText(e) {
  const m = e.meta || {}
  if (m.reason) return m.reason
  if (e.action === 'member.role') return `${m.from} → ${m.to}`
  if (e.action === 'access.create' && m.start) return `${fmtDate(m.start)} – ${fmtDate(m.end)}`
  if (e.action === 'access.extend' && m.to) return `now until ${fmtDate(m.to.end)}`
  if (e.action === 'contract.create' && m.coverageStart) return `${fmtDate(m.coverageStart)} – ${fmtDate(m.coverageEnd)}`
  if (e.action === 'contract.extend' && m.to) return `now ${fmtDate(m.to.start)} – ${fmtDate(m.to.end)}`
  if (e.action === 'import.commit') return `${m.created ?? 0} new, ${m.added ?? 0} added, ${m.extended ?? 0} extended, ${m.skipped ?? 0} skipped`
  if (e.action === 'import.preview') return m.filename || ''
  if (e.action === 'org.update') return Object.keys(m).join(', ')
  return ''
}

// ---- details ----
const details = reactive({ name: '', seatLimit: '', contactName: '', contactEmail: '', contactPhone: '', notes: '' })
function syncDetails() {
  const o = detail.value?.organisation
  if (!o) return
  Object.assign(details, {
    name: o.name, seatLimit: o.seatLimit ?? '', contactName: o.contactName || '',
    contactEmail: o.contactEmail || '', contactPhone: o.contactPhone || '', notes: o.notes || ''
  })
}
async function saveDetails() {
  await act(() => orgs.update(id.value, {
    name: details.name,
    seatLimit: details.seatLimit === '' ? null : Number(details.seatLimit),
    contactName: details.contactName, contactEmail: details.contactEmail,
    contactPhone: details.contactPhone, notes: details.notes
  }), 'Details saved.')
}

onMounted(async () => {
  await load()
  if (tab.value === 'members') loadMembers()
  if (tab.value === 'activity') loadAudit()
})
onUnmounted(() => { clearTimeout(flashTimer); clearTimeout(memberTimer) })

// ---- formatting ----
function statusChip(s) {
  return s === 'active' ? 'chip-green' : s === 'suspended' ? 'chip-amber' : 'chip-grey'
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? String(v) : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function errMsg(e, fallback) {
  return e?.data?.statusMessage || e?.statusMessage || e?.data?.message || fallback
}
</script>

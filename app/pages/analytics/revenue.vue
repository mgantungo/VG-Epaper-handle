<!--
  File:      /var/www/VGEpaper/handle/app/pages/analytics/revenue.vue
  Repo path: apps/handle/app/pages/analytics/revenue.vue        NEW FILE (Phases 1–4)
  URL:       /analytics/revenue?from=&to=

  Revenue by publication: totals and share per paper, by day or month, by
  plan, the paywall-to-paid funnel, and organisation contracts with their
  seat use. Single-publication plans are exact; bundle revenue is credited
  to each paper by the plan's revenue split, frozen at the time of sale.
  Organisation contracts count on the day they were entered in handle.
-->
<script setup>
definePageMeta({ middleware: 'org-rights' })
useHead({ title: 'Revenue — Analytics — handle' })

const { analytics } = useHandleApi()
const range = useAnaRange('month')
const data = ref(null)
const error = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await analytics.revenue(range.value)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Revenue could not be loaded.'
  } finally {
    loading.value = false
  }
}
watch(range, load, { immediate: true })

const pubs = computed(() => data.value?.publications || [])
const colours = computed(() => seriesColours(pubs.value))
const pubName = (code) => pubs.value.find((p) => p.code === code)?.name || code
const cur = computed(() => data.value?.currency || 'UGX')
const money = (v) => fmtMoney(v, cur.value)
const earning = computed(() => (data.value?.byPublication || []).filter((p) => p.amount || p.previous))

const chart = computed(() => {
  const d = data.value
  if (!d) return null
  const month = d.chart.unit === 'month'
  return {
    title: month ? 'Revenue by month' : 'Revenue by day',
    labels: d.chart.buckets,
    xFormat: month ? (m, full) => fmtMonth(m, full) : (iso, full) => fmtDay(iso, { weekday: full }),
    series: earning.value.map((p) => ({ key: p.code, name: pubName(p.code), colour: colours.value[p.code], values: d.chart.series[p.code] || [] }))
  }
})
const funnels = computed(() => (data.value?.funnel || []).filter((f) => f.steps[0].n || f.steps[2].n))
const failureText = computed(() => {
  const f = data.value?.failures || {}
  const list = Object.entries(f).sort((a, b) => b[1] - a[1])
  if (!list.length) return ''
  return list.map(([k, n]) => `${n} ${k}`).join(' · ')
})
function exportCsv() {
  const d = data.value
  downloadCsv(`revenue-${d.range.from}-${d.range.to}.csv`, [
    ['Paper', 'Plan', 'Bought by', 'Payments', 'Organisations', `Amount (${cur.value})`, 'Share %'],
    ...d.byPlan.map((p) => [p.publication, p.plan, p.boughtBy, p.payments, p.organisations || '', p.amount, p.sharePct]),
    [],
    ['Paper', `Amount (${cur.value})`, 'Personal', 'Organisation', 'Previous period'],
    ...d.byPublication.map((p) => [p.code, p.amount, p.personal, p.organisation, p.previous])
  ])
}
</script>

<template>
  <AnalyticsShell title="Revenue by publication" :sub="data ? `${fmtRange(data.range)} · compared with ${fmtRange(data.previous)}` : ''">
    <template #controls>
      <AnaRangePicker v-model="range" />
      <div class="flex items-center gap-3">
        <span v-if="loading" class="mono text-[12px] muted">Loading…</span>
        <button v-if="data" class="btn-ghost" @click="exportCsv">Download (CSV)</button>
      </div>
    </template>

    <p v-if="error" class="notice notice-err">{{ error }}</p>

    <template v-if="data">
      <div class="flex flex-wrap gap-3">
        <AnaStat label="Revenue in the range" :value="money(data.kpis.total)" :change="delta(data.kpis.total, data.kpis.previousTotal)" :note="data.kpis.previousTotal ? `previous period ${money(data.kpis.previousTotal)}` : ''" />
        <AnaStat v-for="p in earning" :key="p.code" :label="pubName(p.code)" :value="money(p.amount)" :note="`${p.sharePct}% of revenue`" :change="delta(p.amount, p.previous)" :edge="colours[p.code]" />
        <AnaStat label="Revenue per paying reader" :value="money(data.kpis.perPayingReader)" :note="`${fmtNum(data.kpis.payingReaders)} readers paid personally`" edge="#22b389" />
        <AnaStat label="Organisation contracts" :value="`${data.kpis.organisationPct}%`" :note="`of revenue · ${data.kpis.organisations} organisation${data.kpis.organisations === 1 ? '' : 's'}`" edge="rgba(15,27,45,.2)" />
      </div>

      <section class="panel p-5" aria-labelledby="rev-h">
        <h2 id="rev-h" class="text-[17px] font-bold">{{ chart.title }}</h2>
        <p class="text-[12px] muted">By payment date, Kampala time; stacked by publication</p>
        <AnaBarChart v-if="chart.series.length" class="mt-3" :labels="chart.labels" :series="chart.series" :x-format="chart.xFormat" :y-format="fmtShort" :height="260" aria-label="Revenue" />
        <p v-else class="text-[13px] muted mt-3">No revenue in this range.</p>
      </section>

      <section class="panel p-5" aria-labelledby="plan-h">
        <h2 id="plan-h" class="text-[17px] font-bold">By plan</h2>
        <div class="table-scroll mt-2">
          <table class="otable">
            <thead><tr><th>Paper</th><th>Plan</th><th>Bought by</th><th class="text-right">Payments</th><th class="text-right">{{ cur }}</th><th class="text-right">Share</th></tr></thead>
            <tbody>
              <tr v-for="p in data.byPlan" :key="`${p.publication}-${p.plan}-${p.boughtBy}`">
                <td class="mono">{{ p.publication }}</td>
                <td>{{ p.plan }}<span v-if="p.bundle" class="chip chip-grey ml-1">bundle · split</span></td>
                <td>{{ p.boughtBy === 'organisation' ? `${p.organisations} organisation${p.organisations === 1 ? '' : 's'}` : 'Personal' }}</td>
                <td class="text-right mono">{{ fmtNum(p.payments) }}</td>
                <td class="text-right mono">{{ fmtNum(p.amount) }}</td>
                <td class="text-right mono">{{ p.sharePct }}%</td>
              </tr>
              <tr v-if="!data.byPlan.length"><td colspan="6" class="muted">No sales in this range.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid xl:grid-cols-2 gap-4">
        <section class="panel p-5" aria-labelledby="fun-h">
          <h2 id="fun-h" class="text-[17px] font-bold">From paywall to paid</h2>
          <p class="text-[12px] muted">Readers who saw the paywall and started checkout, and readers who paid, per paper · bar width against paywall views. "Paid" counts every reader who paid for the paper in the range, including some who never met the paywall.</p>
          <div v-for="f in funnels" :key="f.code" class="mt-4">
            <p class="text-[13px] font-semibold">{{ pubName(f.code) }}</p>
            <div v-for="s in f.steps" :key="s.key" class="grid grid-cols-[130px_1fr_90px] items-center gap-3 mt-1.5 text-[12px]">
              <span class="muted">{{ s.label }}</span>
              <span class="h-3 rounded" :style="{ width: `${Math.max(1, Math.min(100, s.pct))}%`, background: colours[f.code], opacity: s.key === 'paywall' ? 0.35 : s.key === 'checkout' ? 0.65 : 1 }" />
              <span class="mono text-right">{{ fmtNum(s.n) }}<template v-if="s.key !== 'paywall'"> · {{ s.pct }}%</template></span>
            </div>
            <p v-if="f.checkoutLossPct > 0" class="text-[12px] muted mt-1">{{ f.checkoutLossPct }}% of checkouts did not end in a payment.</p>
          </div>
          <p v-if="!funnels.length" class="text-[13px] muted mt-3">No paywall views in this range.</p>
          <p v-if="failureText" class="notice notice-warn mt-4">Unpaid payment requests in the range (payment service status): {{ failureText }}.</p>
        </section>

        <section class="panel p-5" aria-labelledby="con-h">
          <h2 id="con-h" class="text-[17px] font-bold">Organisation contracts, per paper</h2>
          <p class="text-[12px] muted">Contracts running in the range; seat use = seats that opened their paper in the range</p>
          <div class="table-scroll mt-2">
            <table class="otable">
              <thead><tr><th>Organisation</th><th>Paper</th><th>Period</th><th class="text-right">Seats</th><th class="text-right">Seat use</th><th class="text-right">{{ cur }}</th><th>Renewal</th></tr></thead>
              <tbody>
                <tr v-for="c in data.contracts" :key="`${c.orgId}-${c.publication}-${c.start}`" class="clickable" @click="navigateTo(`/organisations/${c.orgId}?tab=usage`)">
                  <td class="font-semibold">{{ c.orgName }}</td>
                  <td class="mono">{{ c.publication }}</td>
                  <td class="mono whitespace-nowrap">{{ fmtDay(c.start) }} – {{ fmtDay(c.end, { year: true }) }}</td>
                  <td class="text-right mono">{{ c.seats || '—' }}</td>
                  <td class="text-right mono" :style="{ color: c.usePct < 40 ? '#b3261e' : undefined }">{{ c.usePct }}%</td>
                  <td class="text-right mono">{{ c.amount === null ? '—' : fmtNum(c.amount) }}</td>
                  <td class="whitespace-nowrap">
                    <template v-if="c.daysToRenewal === null">Ended</template>
                    <span v-else-if="c.daysToRenewal <= 14" class="chip chip-amber">Due in {{ c.daysToRenewal }} days{{ c.usePct < 40 ? ' · low use' : '' }}</span>
                    <template v-else>Due {{ fmtDay(c.end) }}</template>
                  </td>
                </tr>
                <tr v-if="!data.contracts.length"><td colspan="7" class="muted">No organisation contracts in this range.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p class="text-[12px] faint">Source: paid personal subscriptions and single editions (successful payments) and organisation contracts entered in handle. Bundle revenue is credited to each paper by the plan's revenue split, frozen at the time of sale.</p>
    </template>
  </AnalyticsShell>
</template>

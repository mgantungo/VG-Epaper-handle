/**
 * File:      /var/www/VGEpaper/handle/app/utils/analytics.js
 * Repo path: apps/handle/app/utils/analytics.js                NEW FILE (Phases 1–4)
 *
 * Formatting and colour helpers for the Analytics pages (auto-imported).
 *
 * Series colours: each publication keeps its own colour from handle >
 * Publications, unless an earlier publication (in handle's order) already
 * uses it — e.g. New Vision daily and weekend are both blue — in which case
 * it takes the next free colour from a fixed, colour-blind-checked set
 * (publications in code order). Colours are worked out from the FULL
 * publication list, so a filter never repaints a paper.
 */
const FALLBACK = ['#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#2a78d6', '#eb6834']

export function seriesColours(publications = []) {
  const used = new Set()
  const out = {}
  let next = 0
  // by code, so every page (whatever order its list comes in) gives the same colours
  const ordered = [...publications].sort((a, b) => String(a.code).localeCompare(String(b.code)))
  for (const p of ordered) {
    const own = (p.colour || '').toLowerCase()
    if (own && !used.has(own)) {
      out[p.code] = p.colour
      used.add(own)
      continue
    }
    while (next < FALLBACK.length && used.has(FALLBACK[next])) next += 1
    const c = FALLBACK[next % FALLBACK.length]
    next += 1
    used.add(c)
    out[p.code] = c
  }
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function kampalaToday() {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)
}
export function addDaysIso(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function fmtDay(iso, opts = {}) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${opts.weekday ? `${wd} ` : ''}${d} ${MONTHS[m - 1]}${opts.year ? ` ${y}` : ''}`
}
export function fmtMonth(ym, year = false) {
  const [y, m] = String(ym).split('-').map(Number)
  return `${MONTHS[m - 1]}${year ? ` ${y}` : ''}`
}
export function fmtRange(r) {
  if (!r) return ''
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4)
  return `${fmtDay(r.from, { year: !sameYear })} – ${fmtDay(r.to, { year: true })}`
}
export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-GB')
}
export function fmtMoney(n, currency = 'UGX') {
  return `${currency} ${Math.round(Number(n || 0)).toLocaleString('en-GB')}`
}
/** 1 234 567 -> "1.2m", 45 300 -> "45k" (axis labels) */
export function fmtShort(n) {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1e6) return `${Math.round(v / 1e5) / 10}m`
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e3)}k`
  return fmtNum(v)
}
export function fmtMinutes(min) {
  const m = Math.round(Number(min || 0))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} m`
}
export function fmtSeconds(sec) {
  const s = Math.round(Number(sec || 0))
  if (s < 60) return `${s} s`
  return `${Math.floor(s / 60)} m ${String(s % 60).padStart(2, '0')} s`
}
/** { text, dir: 'up'|'down'|'flat' } or null when there's no previous figure */
export function delta(now, before, { unit = '%', points = false } = {}) {
  if (before === null || before === undefined || (!before && !points)) return null
  if (points) {
    const d = Math.round((now - before) * 10) / 10
    return { text: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} pts`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' }
  }
  const d = Math.round(((now - before) / before) * 1000) / 10
  return { text: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}${unit}`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' }
}

/** Range presets for RangePicker (Kampala days). */
export function rangePreset(key, today = kampalaToday()) {
  const monthStart = `${today.slice(0, 7)}-01`
  switch (key) {
    case '7d': return { from: addDaysIso(today, -6), to: today }
    case '30d': return { from: addDaysIso(today, -29), to: today }
    case 'month': return { from: monthStart, to: today }
    case 'lastMonth': {
      const end = addDaysIso(monthStart, -1)
      return { from: `${end.slice(0, 7)}-01`, to: end }
    }
    case '12m': return { from: `${addDaysIso(monthStart, -330).slice(0, 7)}-01`, to: today }
    default: return { from: monthStart, to: today }
  }
}

/** CSV download from rows (first row = header). */
export function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }))
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

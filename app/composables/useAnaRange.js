/**
 * File:      /var/www/VGEpaper/handle/app/composables/useAnaRange.js
 * Repo path: apps/handle/app/composables/useAnaRange.js        NEW FILE (Phases 1–4)
 *
 * The date range of an Analytics page, kept in the URL (?from=&to=) so a
 * view can be bookmarked or sent to a colleague. Default: this month.
 */
const ISO = /^\d{4}-\d{2}-\d{2}$/

export function useAnaRange(defaultPreset = 'month') {
  const route = useRoute()
  const router = useRouter()
  const range = computed({
    get() {
      const { from, to } = route.query
      if (ISO.test(String(from || '')) && ISO.test(String(to || ''))) return { from: String(from), to: String(to) }
      return rangePreset(defaultPreset)
    },
    set(r) {
      router.replace({ query: { ...route.query, from: r.from, to: r.to } })
    }
  })
  return range
}

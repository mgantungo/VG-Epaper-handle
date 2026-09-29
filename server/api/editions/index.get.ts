/**
 * File:      /var/www/VGEpaper/handle/server/api/editions/index.get.ts
 * Repo path: apps/handle/server/api/editions/index.get.ts
 * System:    apps/handle (Nuxt 4)          REPLACE
 *
 * GET /api/editions?page=&pageSize= -> middleware GET /api/admin/editions.
 * Forwards page and pageSize (max 100) so the dashboard can load a full
 * month of editions at once and page back through older ones.
 * Returns { editions, pagination } unchanged.
 */
export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25))

  try {
    return await $fetch(`${config.middlewareUrl}/api/admin/editions`, {
      headers: { Authorization: `Bearer ${admin.rawToken}` },
      query: { page, pageSize }
    })
  } catch (err) {
    throw createError({
      statusCode: err?.response?.status || 502,
      statusMessage: err?.data?.error || 'Editions could not be loaded'
    })
  }
})
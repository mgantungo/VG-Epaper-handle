/**
 * File:      /var/www/VGEpaper/handle/server/utils/analyticsProxy.ts
 * Repo path: apps/handle/server/utils/analyticsProxy.ts        NEW FILE (Phases 1–4)
 *
 * Forwards /api/analytics/<path>?<query> to middleware's
 * /api/admin/analytics/<path>, like catalogueProxy.ts: the session cookie is
 * verified here, then middleware is called with the session JWT as a Bearer
 * token. Middleware checks canManageOrganizations on every request.
 * Read-only apart from POST rebuild. Auto-imported by Nitro.
 */
const ALLOWED = new Set(['GET', 'POST'])

export async function analyticsProxy(event) {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const method = event.method
  if (!ALLOWED.has(method)) throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })

  const path = String(getRouterParam(event, 'path') || '')
  if (!path || !/^[A-Za-z0-9/_-]+$/.test(path) || path.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }
  if (method === 'POST' && path !== 'rebuild') throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/analytics/${path}`, {
    method,
    query: getQuery(event),
    headers: { Authorization: `Bearer ${admin.rawToken}` },
    body: method === 'GET' ? undefined : await readBody(event).catch(() => ({})),
    ignoreResponseError: true
  })
  if (res.status >= 400) {
    throw createError({
      statusCode: res.status,
      statusMessage: res._data?.error || `Analytics request failed (HTTP ${res.status})`
    })
  }
  return res._data
}

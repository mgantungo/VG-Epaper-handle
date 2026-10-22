/**
 * File:      /var/www/VGEpaper/handle/server/utils/catalogueProxy.ts
 * Repo path: apps/handle/server/utils/catalogueProxy.ts        NEW FILE (Phase 0)
 *
 * Forwards /api/catalogue/<path> to middleware's /api/admin/catalogue/<path>
 * (publications, plans and prices), the same way orgProxy.ts does for
 * organisations: verify the session cookie here, then call middleware with
 * the session JWT as a Bearer token. Middleware re-checks the JWT and the
 * canManageOrganizations right itself on every change.
 * Auto-imported by Nitro.
 */
const ALLOWED = new Set(['GET', 'POST', 'PATCH'])

export async function catalogueProxy(event) {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const method = event.method
  if (!ALLOWED.has(method)) throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })

  const path = String(getRouterParam(event, 'path') || '')
  if (!path || !/^[A-Za-z0-9/_-]+$/.test(path) || path.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/catalogue/${path}`, {
    method,
    headers: { Authorization: `Bearer ${admin.rawToken}` },
    body: method === 'GET' ? undefined : await readBody(event).catch(() => ({})),
    ignoreResponseError: true
  })
  if (res.status >= 400) {
    throw createError({
      statusCode: res.status,
      statusMessage: res._data?.error || `Catalogue request failed (HTTP ${res.status})`
    })
  }
  return res._data
}

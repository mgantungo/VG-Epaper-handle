/**
 * File:      /var/www/VGEpaper/handle/server/utils/orgProxy.ts
 * Repo path: apps/handle/server/utils/orgProxy.ts             NEW FILE
 *
 * Forwards /api/organisations/<path> to middleware's
 * /api/admin/organisations/<path>, the same way editorProxy.ts does for the
 * story editor: verify the session cookie (requireAdmin), then call
 * middleware with the session JWT as a Bearer token. Middleware re-checks
 * the JWT and the canManageOrganizations right itself.
 *
 * "index" maps to the collection root (/api/admin/organisations), because
 * the catch-all route that calls this can't match the bare path.
 * Auto-imported by Nitro.
 */
const ALLOWED = new Set(['GET', 'POST', 'PATCH', 'DELETE'])

export async function orgProxy(event) {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const method = event.method

  if (!ALLOWED.has(method)) throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })

  const raw = String(getRouterParam(event, 'path') || '')
  const path = raw === 'index' ? '' : raw
  if (!/^[A-Za-z0-9/_-]*$/.test(path) || path.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const body = method === 'POST' || method === 'PATCH' ? await readBody(event).catch(() => ({})) : undefined

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/organisations${path ? `/${path}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${admin.rawToken}` },
    query: getQuery(event),
    body,
    ignoreResponseError: true
  })

  if (res.status >= 400) {
    throw createError({
      statusCode: res.status,
      statusMessage: res._data?.error || `Organisations request failed (HTTP ${res.status})`
    })
  }
  return res._data
}

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
 * UPDATED: also carries the members spreadsheet: GET .../import/template
 * comes back as the .xlsx file, and multipart uploads (.../import/preview)
 * are passed through byte for byte.
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

  const target = `${config.middlewareUrl}/api/admin/organisations${path ? `/${path}` : ''}`
  const auth = { Authorization: `Bearer ${admin.rawToken}` }

  // The members spreadsheet: stream the .xlsx bytes back as a download.
  if (method === 'GET' && /(^|\/)import\/template$/.test(path)) {
    const upstream = await fetch(target, { headers: auth })
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}))
      throw createError({ statusCode: upstream.status, statusMessage: err?.error || `Download failed (HTTP ${upstream.status})` })
    }
    const buf = Buffer.from(await upstream.arrayBuffer())
    setResponseHeaders(event, {
      'content-type': upstream.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': upstream.headers.get('content-disposition') || 'attachment; filename="members.xlsx"',
      'content-length': String(buf.length),
      'cache-control': 'no-store'
    })
    return buf
  }

  // Spreadsheet upload: pass the multipart body through untouched.
  const contentType = getRequestHeader(event, 'content-type') || ''
  if (method === 'POST' && contentType.startsWith('multipart/form-data')) {
    const raw = await readRawBody(event, false)
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { ...auth, 'content-type': contentType },
      body: raw
    })
    const data = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      throw createError({ statusCode: upstream.status, statusMessage: data?.error || `Upload failed (HTTP ${upstream.status})` })
    }
    return data
  }

  const body = method === 'POST' || method === 'PATCH' ? await readBody(event).catch(() => ({})) : undefined

  const res = await $fetch.raw(target, {
    method,
    headers: auth,
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

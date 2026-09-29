/**
 * File:      /var/www/VGEpaper/apps/handle/server/utils/editorProxy.ts
 * Repo path: apps/handle/server/utils/editorProxy.ts
 * System:    apps/handle (Nuxt 4, port 3872, https://handle.epapers.visiongroup.co.ug)   NEW FILE
 *
 * Shared forwarder for the story editor routes: verifies the admin cookie
 * (requireAdmin), then calls middleware's /api/admin/editor/* with the
 * session JWT as a Bearer token. Auto-imported by Nitro.
 */
export async function editorProxy(event, method, suffix = '') {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const editionId = encodeURIComponent(getRouterParam(event, 'editionId'))
  const pageNumber = encodeURIComponent(getRouterParam(event, 'pageNumber'))
  const body = method === 'GET' ? undefined : await readBody(event)

  try {
    return await $fetch(`${config.middlewareUrl}/api/admin/editor/editions/${editionId}/pages/${pageNumber}${suffix}`, {
      method,
      headers: { Authorization: `Bearer ${admin.rawToken}` },
      body
    })
  } catch (err) {
    throw createError({
      statusCode: err?.response?.status || 502,
      statusMessage: err?.data?.error || err?.data?.message || `Story editor request failed (HTTP ${err?.response?.status || 'no response'})`
    })
  }
}

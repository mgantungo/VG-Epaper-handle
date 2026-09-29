/**
 * server/api/editions/[id]/pages/[pageNumber].get.ts
 * GET -> one page image. Same-origin so the <img> tag carries the session
 * cookie; verified here, then forwarded to middleware as a Bearer token.
 * Open /api/editions/<id>/pages/<n> directly in the browser to see the
 * exact failure if an image doesn't show.
 */
export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const pageNumber = Number(getRouterParam(event, 'pageNumber'))

  if (!id || !Number.isInteger(pageNumber) || pageNumber < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid edition or page number' })
  }

  const upstream = await fetch(
    `${config.middlewareUrl}/api/admin/editions/${encodeURIComponent(id)}/pages/${pageNumber}/image`,
    { headers: { Authorization: `Bearer ${admin.rawToken}` } }
  )

  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => '')).slice(0, 300)
    console.error(`[handle] page image ${id}/${pageNumber}: middleware ${upstream.status} ${detail}`)
    throw createError({
      statusCode: upstream.status === 404 ? 404 : 502,
      statusMessage: `Page image unavailable (middleware ${upstream.status}) ${detail}`
    })
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  setResponseHeaders(event, {
    'content-type': upstream.headers.get('content-type') || 'image/jpeg',
    'content-length': String(buf.length),
    'cache-control': 'private, max-age=3600'
  })
  return buf
})
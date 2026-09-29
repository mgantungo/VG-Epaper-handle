/**
 * server/api/editions/[id]/index.get.ts
 * GET -> proxies to middleware's protected GET /api/admin/editions/:id
 * (not Strapi directly — see auth/login.post.ts's comment for why).
 */
export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/editions/${id}`, {
    headers: { Authorization: `Bearer ${admin.rawToken}` },
    ignoreResponseError: true
  })

  if (res.status >= 400) {
    throw createError({ statusCode: res.status, statusMessage: res._data?.error || 'Could not load this edition' })
  }
  return res._data
})

/**
 * server/api/auth/login.post.ts
 * POST { email, password } -> proxies to middleware's own
 * POST /api/admin/auth/login (which in turn proxies to Strapi's
 * handle-admin login) — NOT Strapi directly. Middleware is the only
 * thing guaranteed reachable from wherever this app is actually
 * deployed; Strapi itself may only be reachable via localhost from the
 * server middleware happens to run on, which this app can't assume it
 * shares.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { email: body?.email, password: body?.password },
    ignoreResponseError: true
  })

  if (res.status >= 400) {
    throw createError({ statusCode: res.status, statusMessage: res._data?.error || 'Login failed' })
  }
  return res._data
})

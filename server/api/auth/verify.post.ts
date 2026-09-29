/**
 * server/api/auth/verify.post.ts
 * POST { email, token } -> proxies to middleware's own
 * POST /api/admin/auth/verify-token (not Strapi directly — see
 * login.post.ts's comment for why). On success, the JWT middleware
 * relays back from Strapi becomes this app's own session cookie,
 * httpOnly so client-side JS can never read or exfiltrate it.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/auth/verify-token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { email: body?.email, token: body?.token },
    ignoreResponseError: true
  })

  if (res.status >= 400) {
    throw createError({ statusCode: res.status, statusMessage: res._data?.error || 'Verification failed' })
  }

  const data = res._data
  setCookie(event, 'handle_admin_session', data.jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60 // matches the 12h SESSION_TTL the CMS signs the JWT with
  })

  return { admin: data.admin }
})

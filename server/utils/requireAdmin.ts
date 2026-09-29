import jwt from 'jsonwebtoken'

/**
 * server/utils/requireAdmin.ts
 *
 * Verifies the handle_admin_session cookie against
 * HANDLE_ADMIN_JWT_SECRET — the SAME secret Strapi's
 * handle-admin.verifyToken action signs with (apps/cms's
 * HANDLE_ADMIN_JWT_SECRET must match this app's, or every session looks
 * invalid here even with a real token). Throws a 401 H3Error on failure,
 * which every other server/api/ route below calls this to guard —
 * Strapi is never reached for a request that fails this check.
 *
 * Now also returns rawToken (the cookie's actual JWT string) alongside
 * the decoded payload — needed since edition routes now proxy through
 * apps/middleware's new /api/admin/* routes rather than calling Strapi
 * directly (see the "wire through middleware, not localhost" change),
 * and middleware's own requireHandleAdmin there verifies this same JWT
 * again as a Bearer header. Verifying it twice (once here, once in
 * middleware) is intentional, not redundant — middleware is reachable
 * from anywhere, so it enforces its own check rather than trusting a
 * caller who already checked once.
 *
 * Auto-imported by Nitro (files under server/utils/ don't need an
 * explicit import) — server/api/editions/*.ts call this directly as
 * `requireAdmin(event)`.
 */
export function requireAdmin(event) {
  const token = getCookie(event, 'handle_admin_session')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  }

  const config = useRuntimeConfig()
  try {
    const payload = jwt.verify(token, config.handleAdminJwtSecret)
    if (payload.type !== 'handle-admin') {
      throw new Error('wrong token type')
    }
    return { ...payload, rawToken: token } // { sub, email, tokenVersion, type, rawToken }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Session expired or invalid' })
  }
}

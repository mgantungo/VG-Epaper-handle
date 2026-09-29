/**
 * middleware/auth.global.ts
 * Runs on every route. /login is the only page reachable without a
 * session — everything else redirects there if restoreSession() finds
 * no valid cookie. Session check happens once per navigation via the
 * store, not a fresh network call every time, but restoreSession()
 * itself always asks the server (via /api/auth/me), never trusts a
 * client-only flag — the server is the actual source of truth since the
 * JWT lives in an httpOnly cookie the client can't inspect anyway.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const admin = useAdminStore()

  if (!admin.admin && !admin.pendingEmail) {
    await admin.restoreSession()
  }

  if (to.path !== '/login' && !admin.loggedIn) {
    return navigateTo('/login')
  }
  if (to.path === '/login' && admin.loggedIn) {
    return navigateTo('/')
  }
})

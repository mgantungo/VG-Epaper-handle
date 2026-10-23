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
  // UPDATED (Phases 1–4): browser only. During server rendering $fetch
  // doesn't carry the browser's session cookie, so /api/auth/me always
  // failed there and every directly opened or bookmarked page (e.g.
  // /analytics?from=…) was sent to /login and then on to the Editions
  // desk. The check now runs once the page loads in the browser.
  if (import.meta.server) return
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

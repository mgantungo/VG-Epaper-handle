/**
 * server/api/auth/me.get.ts
 * Returns the current admin's identity if the session cookie is valid —
 * called once on app load by stores/admin.ts to restore session state
 * without needing the browser to hold or re-check the JWT itself.
 */
export default defineEventHandler((event) => {
  const payload = requireAdmin(event)
  return { admin: { id: payload.sub, email: payload.email } }
})

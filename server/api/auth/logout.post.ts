/**
 * server/api/auth/logout.post.ts
 * Clears the session cookie. Purely local — there's no server-side
 * session store to invalidate (the JWT is stateless), so this just
 * removes the cookie the browser would otherwise keep sending. A
 * compromised token would still be valid until it naturally expires
 * (12h) — if that's ever a real concern, tokenVersion on the Admin
 * record (already in the schema) could be bumped to invalidate it
 * server-side, but no route calls that yet.
 */
export default defineEventHandler(async (event) => {
  deleteCookie(event, 'handle_admin_session', { path: '/' })
  return { success: true }
})

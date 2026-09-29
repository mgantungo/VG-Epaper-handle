/**
 * composables/useHandleApi.ts
 * Thin wrapper around this app's own server/api/ routes — never calls
 * Strapi directly from client code. $fetch is same-origin here, so no
 * base URL or auth header needed; the session cookie rides along
 * automatically (httpOnly, set by server/api/auth/verify.post.ts).
 */
export function useHandleApi() {
  async function login(email, password) {
    return $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
  }

  async function verifyToken(email, token) {
    return $fetch('/api/auth/verify', { method: 'POST', body: { email, token } })
  }

  async function logout() {
    return $fetch('/api/auth/logout', { method: 'POST' })
  }

  async function me() {
    return $fetch('/api/auth/me')
  }

  async function listEditions(page = 1, pageSize = 25) {
    return $fetch('/api/editions', { query: { page, pageSize } })
  }

  async function createEdition(formData) {
    // formData: a FormData instance built by the caller (pages/editions/new.vue) —
    // built there, not here, since constructing it needs the actual File
    // object from a <input type="file">, which this composable has no
    // reason to know about.
    return $fetch('/api/editions', { method: 'POST', body: formData })
  }

  async function getEdition(documentId) {
    return $fetch(`/api/editions/${documentId}`)
  }

  return { login, verifyToken, logout, me, listEditions, createEdition, getEdition }
}

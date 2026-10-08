/**
 * composables/useHandleApi.ts
 * Thin wrapper around this app's own server/api/ routes — never calls
 * Strapi directly from client code. $fetch is same-origin here, so no
 * base URL or auth header needed; the session cookie rides along
 * automatically (httpOnly, set by server/api/auth/verify.post.ts).
 *
 * UPDATED (organisations): orgRights() plus `orgs`, a small client for
 * /api/organisations/* (server/api/organisations/[...path].ts). "index"
 * stands for the collection root, since a catch-all route can't match the
 * bare /api/organisations path.
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

  async function orgRights() {
    return $fetch('/api/organisations/rights')
  }

  const org = (path, opts = {}) => $fetch(`/api/organisations/${path}`, opts)
  const orgs = {
    list: (query = {}) => org('index', { query }),
    create: (body) => org('index', { method: 'POST', body }),
    get: (id) => org(`${id}`),
    update: (id, body) => org(`${id}`, { method: 'PATCH', body }),
    setStatus: (id, status, reason) => org(`${id}/status`, { method: 'POST', body: { status, reason } }),
    addContract: (id, body) => org(`${id}/contracts`, { method: 'POST', body }),
    updateContract: (id, cid, body) => org(`${id}/contracts/${cid}`, { method: 'PATCH', body }),
    revokeContract: (id, cid, reason) => org(`${id}/contracts/${cid}/revoke`, { method: 'POST', body: { reason } }),
    assignAdmin: (id, email, grantAccess = true) => org(`${id}/admins`, { method: 'POST', body: { email, grantAccess } }),
    removeAdmin: (id, seatId) => org(`${id}/admins/${seatId}`, { method: 'DELETE' }),
    members: (id, query = {}) => org(`${id}/members`, { query }),
    setMemberStatus: (id, seatId, status, reason) => org(`${id}/members/${seatId}/status`, { method: 'POST', body: { status, reason } }),
    audit: (id, query = {}) => org(`${id}/audit`, { query })
  }

  return { login, verifyToken, logout, me, listEditions, createEdition, getEdition, orgRights, orgs }
}

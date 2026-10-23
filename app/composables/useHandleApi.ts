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
 *
 * UPDATED (Phase 0): `catalogue`, a client for /api/catalogue/*
 * (publications, plans and prices), and orgs.setMemberPublications.
 *
 * UPDATED (Phases 1–4): `analytics`, a client for /api/analytics/*.
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
    setMemberPublications: (id, seatId, publications) => org(`${id}/members/${seatId}/publications`, { method: 'POST', body: { publications } }),
    audit: (id, query = {}) => org(`${id}/audit`, { query }),
    // members spreadsheet: a plain link downloads it (same-origin, cookie rides along)
    templateUrl: (id) => `/api/organisations/${id}/import/template`,
    previewImport: (id, formData) => org(`${id}/import/preview`, { method: 'POST', body: formData }),
    commitImport: (id, importId) => org(`${id}/import/${importId}/commit`, { method: 'POST' })
  }

  const cat = (path, opts = {}) => $fetch(`/api/catalogue/${path}`, opts)
  const catalogue = {
    publications: () => cat('publications'),
    createPublication: (body) => cat('publications', { method: 'POST', body }),
    updatePublication: (id, body) => cat(`publications/${id}`, { method: 'PATCH', body }),
    plans: () => cat('plans'),
    createPlan: (body) => cat('plans', { method: 'POST', body }),
    updatePlan: (key, body) => cat(`plans/${key}`, { method: 'PATCH', body }),
    newPlanVersion: (key, body) => cat(`plans/${key}/versions`, { method: 'POST', body }),
    stopPlan: (key) => cat(`plans/${key}/stop`, { method: 'POST' }),
    resumePlan: (key) => cat(`plans/${key}/resume`, { method: 'POST' }),
    suggestSplit: (publications) => cat('plans/split-suggestion', { method: 'POST', body: { publications } })
  }

  // Phases 1–4: reader analytics (server/api/analytics/[...path].ts).
  // range = { from, to } as YYYY-MM-DD (Kampala days).
  const ana = (path, query = {}) => $fetch(`/api/analytics/${path}`, { query })
  const analytics = {
    overview: (range) => ana('overview', range),
    curve: (editions) => ana('curve', editions ? { editions } : {}),
    sections: (query) => ana('sections', query),
    readers: (query) => ana('readers', query),
    reader: (userId, range) => ana(`readers/${userId}`, range),
    revenue: (range) => ana('revenue', range),
    orgUsage: (orgId, month) => ana(`orgs/${orgId}/usage`, month ? { month } : {}),
    rebuild: (range) => $fetch('/api/analytics/rebuild', { method: 'POST', body: range })
  }

  return { login, verifyToken, logout, me, listEditions, createEdition, getEdition, orgRights, orgs, catalogue, analytics }
}

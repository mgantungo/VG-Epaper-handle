import { defineStore } from 'pinia'

/**
 * stores/admin.ts
 * Two-step login state: pendingEmail tracks an in-progress login (password
 * verified, waiting on the emailed code) — admin stays null until
 * verifyToken() actually succeeds. Session identity itself lives in the
 * httpOnly cookie, not here; this store just reflects what the server
 * told us via /api/auth/me or a successful verify.
 *
 * UPDATED (organisations): also holds `rights` ({ canManageEditions,
 * canManageOrganizations, isSuperAdmin }), loaded from the server after
 * every successful session restore or sign-in. It drives whether the
 * Organisations link shows. The server re-checks rights on every
 * organisations request regardless, so this is a display hint only.
 * rights stays null if the organisations feature is switched off.
 */
export const useAdminStore = defineStore('admin', {
  state: () => ({
    admin: null, // { id, email, displayName? }
    pendingEmail: null, // set after a successful password check, cleared on verify success or a fresh login attempt
    rights: null, // { canManageEditions, canManageOrganizations, isSuperAdmin } | null
    loading: false,
    error: null
  }),

  getters: {
    loggedIn: (state) => Boolean(state.admin),
    awaitingCode: (state) => Boolean(state.pendingEmail) && !state.admin,
    canManageOrganizations: (state) => Boolean(state.rights?.canManageOrganizations)
  },

  actions: {
    async restoreSession() {
      const api = useHandleApi()
      try {
        const res = await api.me()
        this.admin = res.admin
      } catch {
        this.admin = null
      }
      if (this.admin) await this.loadRights()
      else this.rights = null
    },

    async loadRights() {
      const api = useHandleApi()
      try {
        const res = await api.orgRights()
        this.rights = res?.rights || null
      } catch {
        this.rights = null // feature off, or rights lookup failed: just hide the link
      }
    },

    async login(email, password) {
      const api = useHandleApi()
      this.loading = true
      this.error = null
      try {
        await api.login(email, password)
        this.pendingEmail = email
      } catch (e) {
        this.error = e?.data?.statusMessage || e?.statusMessage || 'Login failed'
        throw e
      } finally {
        this.loading = false
      }
    },

    async verifyToken(token) {
      const api = useHandleApi()
      this.loading = true
      this.error = null
      try {
        const res = await api.verifyToken(this.pendingEmail, token)
        this.admin = res.admin
        this.pendingEmail = null
        await this.loadRights()
      } catch (e) {
        this.error = e?.data?.statusMessage || e?.statusMessage || 'Invalid or expired code'
        throw e
      } finally {
        this.loading = false
      }
    },

    async logout() {
      const api = useHandleApi()
      await api.logout().catch(() => {}) // clear local state regardless of whether the network call succeeds
      this.admin = null
      this.pendingEmail = null
      this.rights = null
    },

    cancelPendingLogin() {
      this.pendingEmail = null
      this.error = null
    }
  }
})

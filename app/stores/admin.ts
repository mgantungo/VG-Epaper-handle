import { defineStore } from 'pinia'

/**
 * stores/admin.ts
 * Two-step login state: pendingEmail tracks an in-progress login (password
 * verified, waiting on the emailed code) — admin stays null until
 * verifyToken() actually succeeds. Session identity itself lives in the
 * httpOnly cookie, not here; this store just reflects what the server
 * told us via /api/auth/me or a successful verify.
 */
export const useAdminStore = defineStore('admin', {
  state: () => ({
    admin: null, // { id, email, displayName? }
    pendingEmail: null, // set after a successful password check, cleared on verify success or a fresh login attempt
    loading: false,
    error: null
  }),

  getters: {
    loggedIn: (state) => Boolean(state.admin),
    awaitingCode: (state) => Boolean(state.pendingEmail) && !state.admin
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
    },

    cancelPendingLogin() {
      this.pendingEmail = null
      this.error = null
    }
  }
})

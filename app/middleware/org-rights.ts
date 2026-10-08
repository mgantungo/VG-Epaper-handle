/**
 * File:      /var/www/VGEpaper/handle/app/middleware/org-rights.ts
 * Repo path: apps/handle/app/middleware/org-rights.ts         NEW FILE
 *
 * Named route middleware for /organisations pages
 * (definePageMeta({ middleware: 'org-rights' })). Runs after
 * auth.global.ts, so the admin is already signed in here. Sends admins
 * without the organisations right back to the Editions desk. The server
 * enforces the same right on every request; this only avoids showing a
 * page that would fail to load.
 *
 * Client-only: during SSR the store's $fetch calls don't carry the
 * browser's session cookie, so rights can't be known there.
 */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const admin = useAdminStore()
  if (!admin.loggedIn) return navigateTo('/login')
  if (admin.rights === null) await admin.loadRights()
  if (!admin.canManageOrganizations) return navigateTo('/')
})

/**
 * File:      /var/www/VGEpaper/handle/server/api/analytics/[...path].ts
 * Repo path: apps/handle/server/api/analytics/[...path].ts     NEW FILE (Phases 1–4)
 *
 * Every /api/analytics/* call from the Analytics pages and the organisation
 * Usage tab, forwarded by server/utils/analyticsProxy.ts.
 */
export default defineEventHandler((event) => analyticsProxy(event))

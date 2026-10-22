/**
 * File:      /var/www/VGEpaper/handle/server/api/catalogue/[...path].ts
 * Repo path: apps/handle/server/api/catalogue/[...path].ts     NEW FILE (Phase 0)
 *
 * Every /api/catalogue/* call from the Publications page and the edition
 * form, forwarded by server/utils/catalogueProxy.ts.
 */
export default defineEventHandler((event) => catalogueProxy(event))

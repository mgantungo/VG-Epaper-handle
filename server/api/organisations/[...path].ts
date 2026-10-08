/**
 * File:      /var/www/VGEpaper/handle/server/api/organisations/[...path].ts
 * Repo path: apps/handle/server/api/organisations/[...path].ts   NEW FILE
 *
 * Every /api/organisations/* call from the Organisations pages, all
 * methods, forwarded by server/utils/orgProxy.ts. One catch-all instead of
 * a file per endpoint, since they're all identical pass-throughs.
 */
export default defineEventHandler((event) => orgProxy(event))

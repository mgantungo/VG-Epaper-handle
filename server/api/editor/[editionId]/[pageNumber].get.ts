/**
 * File:      /var/www/VGEpaper/apps/handle/server/api/editor/[editionId]/[pageNumber].get.ts
 * Repo path: apps/handle/server/api/editor/[editionId]/[pageNumber].get.ts
 * System:    apps/handle   NEW FILE
 * GET -> page, its stories, completeness ledger and exclusion overlays.
 */
export default defineEventHandler(event => editorProxy(event, 'GET'))

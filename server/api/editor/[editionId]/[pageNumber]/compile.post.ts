/**
 * File:      /var/www/VGEpaper/apps/handle/server/api/editor/[editionId]/[pageNumber]/compile.post.ts
 * Repo path: apps/handle/server/api/editor/[editionId]/[pageNumber]/compile.post.ts
 * System:    apps/handle   NEW FILE
 * POST { layout } -> compiled headline/kicker/byline/body preview. Nothing is saved.
 */
export default defineEventHandler(event => editorProxy(event, 'POST', '/compile'))
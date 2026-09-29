/**
 * File:      /var/www/VGEpaper/apps/handle/server/api/editor/[editionId]/[pageNumber]/stories.post.ts
 * Repo path: apps/handle/server/api/editor/[editionId]/[pageNumber]/stories.post.ts
 * System:    apps/handle   NEW FILE
 * POST { storyDocumentId?, layout, headline? } -> create or update a manual story.
 */
export default defineEventHandler(event => editorProxy(event, 'POST', '/stories'))
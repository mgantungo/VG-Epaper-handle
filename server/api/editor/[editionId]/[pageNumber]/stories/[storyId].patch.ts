/**
 * File:      /var/www/VGEpaper/apps/handle/server/api/editor/[editionId]/[pageNumber]/stories/[storyId].patch.ts
 * Repo path: apps/handle/server/api/editor/[editionId]/[pageNumber]/stories/[storyId].patch.ts
 * System:    apps/handle   NEW FILE
 * PATCH { action: keep | drop | restore }
 */
export default defineEventHandler(event =>
  editorProxy(event, 'PATCH', `/stories/${encodeURIComponent(getRouterParam(event, 'storyId'))}`)
)

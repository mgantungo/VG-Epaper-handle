/**
 * server/api/editions/index.post.ts
 * POST multipart/form-data: date, publicationCode, volume, issueNumber,
 * sourcePdf (file) -> proxies to middleware's protected
 * POST /api/admin/editions (not Strapi directly — see auth/login.post.ts's
 * comment for why). Middleware does the actual two-step upload-then-
 * create against Strapi itself, since it's the thing actually reachable
 * from Strapi's own machine.
 */
export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)
  const config = useRuntimeConfig()

  const parts = await readMultipartFormData(event)
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart/form-data' })
  }

  const forwardForm = new FormData()
  for (const part of parts) {
    if (!part.name) continue
    if (part.name === 'sourcePdf' && part.filename) {
      forwardForm.append('sourcePdf', new Blob([part.data]), part.filename)
    } else {
      forwardForm.append(part.name, part.data.toString('utf-8'))
    }
  }

  const res = await $fetch.raw(`${config.middlewareUrl}/api/admin/editions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.rawToken}` },
    body: forwardForm,
    ignoreResponseError: true
  })

  if (res.status >= 400) {
    throw createError({ statusCode: res.status, statusMessage: res._data?.error || 'Could not create edition' })
  }
  return res._data
})

import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  modules: ['@pinia/nuxt'],

  devServer: {
    port: Number(process.env.PORT) || 3872
  },

  // Tailwind v4 via its Vite plugin — no tailwind.config.js or postcss
  // config needed in v4. Every component in this app is styled with
  // Tailwind utility classes; without this plugin and the CSS entry
  // below, those classes are inert strings and nothing renders styled.
  // '~' aliases to app/ in Nuxt 4, so this resolves to
  // app/assets/css/main.css.
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },

  // No srcDir override here — Nuxt 4's new default (app/ holding pages,
  // components, composables, middleware, stores, app.vue; server/
  // staying at root) is auto-detected from this project's actual folder
  // layout, not configured explicitly.
  //
  // Talks to the CMS through apps/middleware, NOT Strapi directly —
  // localhost:1397 only resolves to Strapi from the machine middleware
  // itself happens to run on, which this app can't assume it shares.
  // Middleware is already the thing built to be reachable from anywhere
  // (see apps/web's entire read path) — this app's server/api/ routes
  // now proxy through middleware's own new /api/admin/* routes instead
  // of duplicating a second direct-to-Strapi path. No Strapi token lives
  // here at all anymore — middleware holds that itself and never returns
  // it; this app only ever forwards its own handle-admin session JWT.
  runtimeConfig: {
    middlewareUrl: process.env.MIDDLEWARE_URL || 'http://localhost:4161',
    handleAdminJwtSecret: process.env.HANDLE_ADMIN_JWT_SECRET,
    public: {
      // Nothing sensitive needed client-side — every real API call is
      // same-origin, proxied through this app's own /api/ routes.
    }
  },

  nitro: {
    // Cookies set by server/api/auth/verify.post.ts need to survive a
    // production reverse-proxy (Apache/nginx in front, matching how every
    // other service in this project is deployed) — no special config
    // needed here beyond the httpOnly/secure flags set where the cookie
    // is actually created, but noting it since it's easy to silently
    // break behind a proxy that doesn't forward things as expected.
  }
})

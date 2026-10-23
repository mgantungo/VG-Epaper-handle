<!--
  File:      /var/www/VGEpaper/handle/app/components/AnalyticsShell.vue
  Repo path: apps/handle/app/components/AnalyticsShell.vue      NEW FILE (Phases 1–4)

  Frame for every Analytics page: the Organisations-desk look (org-desk.css),
  a hero with the title, the Analytics section tabs, a controls slot (date
  range, paper) and the page body.
-->
<template>
  <div class="orgdesk">
    <div class="hero">
      <div class="hero-inner" style="align-items: stretch; flex-direction: column; gap: 12px; padding-bottom: 0">
        <div>
          <p v-if="crumb" class="mono text-[12px] muted"><slot name="crumb">{{ crumb }}</slot></p>
          <h1 class="display text-[28px] leading-tight">{{ title }}</h1>
          <p v-if="sub" class="text-[14px] muted mt-1">{{ sub }}</p>
          <slot name="hero" />
        </div>
        <nav class="tabs" style="border-bottom: 0" aria-label="Analytics">
          <NuxtLink v-for="t in TABS" :key="t.to" :to="t.to" class="tab" :class="isOn(t) ? 'tab-on' : ''">{{ t.label }}</NuxtLink>
        </nav>
      </div>
    </div>
    <div class="wrap flex flex-col gap-4">
      <div v-if="$slots.controls" class="flex flex-wrap gap-3 items-center justify-between">
        <slot name="controls" />
      </div>
      <slot />
      <p class="text-[12px] faint">Reading figures start the day reading capture went live. Dates are Kampala days. A page counts as read after 3 seconds on screen.</p>
    </div>
  </div>
</template>

<script setup>
import '~/assets/css/org-desk.css'

defineProps({
  title: { type: String, required: true },
  sub: { type: String, default: '' },
  crumb: { type: String, default: '' }
})
const route = useRoute()
const TABS = [
  { to: '/analytics', label: 'Overview', exact: true },
  { to: '/analytics/curve', label: 'Reader curve' },
  { to: '/analytics/sections', label: 'Sections and stories' },
  { to: '/analytics/readers', label: 'Readers' },
  { to: '/analytics/revenue', label: 'Revenue' }
]
const isOn = (t) => (t.exact ? route.path === t.to || route.path === `${t.to}/` : route.path.startsWith(t.to))
</script>

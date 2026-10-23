<!--
  File:      /var/www/VGEpaper/handle/app/components/AppHeader.vue
  Repo path: apps/handle/app/components/AppHeader.vue          MODIFIED
  Change: Editions / Organisations navigation. Organisations only shows for
  admins with the canManageOrganizations right (or super admins).
  Phase 0: Publications (publications, plans and prices), same right.
  Phases 1–4: Analytics (reader analytics dashboards), same right.
-->
<template>
  <header class="bg-neutral-900 text-white px-6 py-3 flex items-center justify-between gap-6">
    <div class="flex items-center gap-6 min-w-0">
      <NuxtLink to="/" class="font-serif font-bold text-lg whitespace-nowrap">Vision Group E-Papers — Admin</NuxtLink>
      <nav class="flex items-center gap-1 text-sm" aria-label="Sections">
        <NuxtLink to="/" class="px-3 py-1.5 rounded-md hover:bg-white/10" :class="isEditions ? 'bg-white/15 text-white' : 'text-neutral-300'">Editions</NuxtLink>
        <NuxtLink v-if="admin.canManageOrganizations" to="/publications" class="px-3 py-1.5 rounded-md hover:bg-white/10" :class="isPubs ? 'bg-white/15 text-white' : 'text-neutral-300'">Publications</NuxtLink>
        <NuxtLink v-if="admin.canManageOrganizations" to="/organisations" class="px-3 py-1.5 rounded-md hover:bg-white/10" :class="isOrgs ? 'bg-white/15 text-white' : 'text-neutral-300'">Organisations</NuxtLink>
        <NuxtLink v-if="admin.canManageOrganizations" to="/analytics" class="px-3 py-1.5 rounded-md hover:bg-white/10" :class="isAnalytics ? 'bg-white/15 text-white' : 'text-neutral-300'">Analytics</NuxtLink>
      </nav>
    </div>
    <div class="flex items-center gap-4 text-sm">
      <span class="text-neutral-400 hidden sm:inline">{{ admin.admin?.email }}</span>
      <button class="text-neutral-300 hover:text-white" @click="handleLogout">Sign out</button>
    </div>
  </header>
</template>

<script setup>
const admin = useAdminStore()
const router = useRouter()
const route = useRoute()

const isOrgs = computed(() => route.path.startsWith('/organisations'))
const isPubs = computed(() => route.path.startsWith('/publications'))
const isAnalytics = computed(() => route.path.startsWith('/analytics'))
const isEditions = computed(() => !isOrgs.value && !isPubs.value && !isAnalytics.value)

async function handleLogout() {
  await admin.logout()
  router.push('/login')
}
</script>

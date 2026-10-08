<!--
  File:      /var/www/VGEpaper/handle/app/components/AppHeader.vue
  Repo path: apps/handle/app/components/AppHeader.vue          MODIFIED
  Change: Editions / Organisations navigation. Organisations only shows for
  admins with the canManageOrganizations right (or super admins).
-->
<template>
  <header class="bg-neutral-900 text-white px-6 py-3 flex items-center justify-between gap-6">
    <div class="flex items-center gap-6 min-w-0">
      <NuxtLink to="/" class="font-serif font-bold text-lg whitespace-nowrap">New Vision E-Paper — Admin</NuxtLink>
      <nav class="flex items-center gap-1 text-sm" aria-label="Sections">
        <NuxtLink to="/" class="px-3 py-1.5 rounded-md hover:bg-white/10" :class="isEditions ? 'bg-white/15 text-white' : 'text-neutral-300'">Editions</NuxtLink>
        <NuxtLink v-if="admin.canManageOrganizations" to="/organisations" class="px-3 py-1.5 rounded-md hover:bg-white/10" :class="isOrgs ? 'bg-white/15 text-white' : 'text-neutral-300'">Organisations</NuxtLink>
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
const isEditions = computed(() => !isOrgs.value)

async function handleLogout() {
  await admin.logout()
  router.push('/login')
}
</script>

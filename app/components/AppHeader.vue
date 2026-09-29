<template>
  <header class="bg-neutral-900 text-white px-6 py-3 flex items-center justify-between">
    <NuxtLink to="/" class="font-serif font-bold text-lg">New Vision E-Paper — Admin</NuxtLink>
    <div class="flex items-center gap-4 text-sm">
      <span class="text-neutral-400">{{ admin.admin?.email }}</span>
      <button class="text-neutral-300 hover:text-white" @click="handleLogout">Sign out</button>
    </div>
  </header>
</template>

<script setup>
const admin = useAdminStore()
const router = useRouter()

async function handleLogout() {
  await admin.logout()
  router.push('/login')
}
</script>

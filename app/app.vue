<template>
  <div class="min-h-screen bg-neutral-100 text-neutral-900">
    <AppHeader v-if="admin.loggedIn" />
    <NuxtPage />
  </div>
</template>

<script setup>
const admin = useAdminStore()
</script>

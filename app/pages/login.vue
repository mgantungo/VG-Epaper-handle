<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
      <h1 class="font-serif font-extrabold text-2xl mb-1">E-Paper Admin</h1>
      <p class="text-sm text-neutral-500 mb-6">
        {{ admin.awaitingCode ? 'Enter the code sent to your email.' : 'Sign in with your @newvision.co.ug account.' }}
      </p>

      <!-- Step 1: email + password -->
      <form v-if="!admin.awaitingCode" class="space-y-4" @submit.prevent="handlePassword">
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Email</span>
          <input
            v-model="email" type="email" required autocomplete="email" placeholder="you@newvision.co.ug"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Password</span>
          <input
            v-model="password" type="password" required autocomplete="current-password"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>
        <button
          type="submit" :disabled="admin.loading"
          class="w-full bg-neutral-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >{{ admin.loading ? 'Checking…' : 'Continue' }}</button>
      </form>

      <!-- Step 2: emailed code -->
      <form v-else class="space-y-4" @submit.prevent="handleVerify">
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Login code</span>
          <input
            v-model="token" required autocomplete="one-time-code" placeholder="8-character code" maxlength="8"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm tracking-widest uppercase focus:outline-none focus:border-neutral-900"
          >
        </label>
        <button
          type="submit" :disabled="admin.loading"
          class="w-full bg-neutral-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >{{ admin.loading ? 'Verifying…' : 'Sign in' }}</button>
        <button type="button" class="w-full text-xs text-neutral-500 hover:text-neutral-900" @click="admin.cancelPendingLogin()">
          ← Use a different account
        </button>
      </form>

      <p v-if="admin.error" class="text-red-600 text-xs mt-4">{{ admin.error }}</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const admin = useAdminStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const token = ref('')

async function handlePassword() {
  try {
    await admin.login(email.value.trim(), password.value)
  } catch {
    // error already set on the store; nothing else to do here
  }
}

async function handleVerify() {
  try {
    await admin.verifyToken(token.value.trim())
    router.push('/')
  } catch {
    // error already set on the store
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto p-6">
    <NuxtLink to="/" class="text-sm text-neutral-500 hover:text-neutral-900">← Editions</NuxtLink>
    <h1 class="font-serif font-bold text-2xl mt-2 mb-6">New edition</h1>

    <form class="bg-white rounded-xl shadow-sm p-6 space-y-4" @submit.prevent="handleSubmit">
      <label class="block">
        <span class="text-xs font-mono text-neutral-600">Date</span>
        <input
          v-model="date" type="date" required
          class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
        >
      </label>

      <label class="block">
        <span class="text-xs font-mono text-neutral-600">Publication</span>
        <!-- Phase 0: chosen from the Publications list (handle > Publications),
             so an edition can't be filed under a code readers can't buy. -->
        <select
          v-model="publicationCode" required
          class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-neutral-900"
        >
          <option value="" disabled>{{ pubsLoading ? 'Loading…' : 'Choose a publication' }}</option>
          <option v-for="p in publications" :key="p.code" :value="p.code">{{ p.code }} — {{ p.name }}</option>
        </select>
        <span v-if="selectedPub" class="block mt-1 text-[11px] text-neutral-500">
          {{ selectedPub.coverDays > 1 ? `One edition covers ${selectedPub.coverDays} days from its date (e.g. a weekend edition dated Saturday covers Saturday–Sunday).` : 'One edition covers its own date.' }}
          <template v-if="selectedPub.latestEdition"> Latest: {{ selectedPub.latestEdition.date }}.</template>
        </span>
        <span v-if="pubsError" class="block mt-1 text-[11px] text-red-600">{{ pubsError }}</span>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Volume</span>
          <input
            v-model="volume" placeholder="e.g. 44"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>
        <label class="block">
          <span class="text-xs font-mono text-neutral-600">Issue number</span>
          <input
            v-model="issueNumber" placeholder="e.g. 186"
            class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
          >
        </label>
      </div>

      <label class="block">
        <span class="text-xs font-mono text-neutral-600">Source PDF</span>
        <input
          type="file" accept="application/pdf" required
          class="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-2 file:text-xs"
          @change="onFileChange"
        >
      </label>

      <button
        type="submit" :disabled="submitting"
        class="w-full bg-neutral-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
      >{{ submitting ? 'Uploading…' : 'Create edition' }}</button>

      <p v-if="error" class="text-red-600 text-xs">{{ error }}</p>
      <p class="text-[11px] text-neutral-400">
        Saving triggers ingest automatically — the CMS watches for a new sourcePdf and notifies the ingest service, same as uploading through Strapi's own admin panel.
      </p>
    </form>
  </div>
</template>

<script setup>
const router = useRouter()
const api = useHandleApi()

const date = ref('')
const publicationCode = ref('')
const publications = ref([])
const pubsLoading = ref(true)
const pubsError = ref('')
const selectedPub = computed(() => publications.value.find((p) => p.code === publicationCode.value) || null)

onMounted(async () => {
  try {
    const res = await api.catalogue.publications()
    publications.value = (res.publications || []).filter((p) => p.active)
    if (publications.value.length === 1) publicationCode.value = publications.value[0].code
  } catch (e) {
    pubsError.value = e?.data?.statusMessage || 'Publications could not be loaded.'
  } finally {
    pubsLoading.value = false
  }
})
const volume = ref('')
const issueNumber = ref('')
const file = ref(null)
const submitting = ref(false)
const error = ref(null)

function onFileChange(e) {
  file.value = e.target.files?.[0] || null
}

async function handleSubmit() {
  if (!file.value) {
    error.value = 'Choose a PDF file.'
    return
  }
  submitting.value = true
  error.value = null
  try {
    const formData = new FormData()
    formData.append('date', date.value)
    formData.append('publicationCode', publicationCode.value.trim())
    if (volume.value) formData.append('volume', volume.value)
    if (issueNumber.value) formData.append('issueNumber', issueNumber.value)
    formData.append('sourcePdf', file.value)

    const res = await api.createEdition(formData)
    router.push(`/editions/${res.edition.documentId}`)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Could not create edition.'
  } finally {
    submitting.value = false
  }
}
</script>

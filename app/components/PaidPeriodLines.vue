<!--
  File:      /var/www/VGEpaper/handle/app/components/PaidPeriodLines.vue
  Repo path: apps/handle/app/components/PaidPeriodLines.vue     NEW FILE (Phase 0)

  The publication lines of one organisation paid period, priced by hand:
  tick each publication the organisation is paying for, then its seats
  and amount. Used when creating an organisation and when adding a paid
  period. v-model is an array of { code, seats, amount } for the ticked
  lines only; the parent sends it as `lines` (publicationCode, seats, amount).

  Props:
    publications   active publications from the catalogue
    defaultSeats   seats pre-filled when a line is ticked
-->
<template>
  <div class="table-scroll">
    <table class="otable">
      <thead>
        <tr>
          <th class="w-8"><span class="sr-only">Include</span></th>
          <th>Publication</th>
          <th class="w-32">Seats</th>
          <th class="w-48">Amount (UGX)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in publications" :key="p.code" :class="row(p.code) ? '' : 'opacity-70'">
          <td><input type="checkbox" :checked="Boolean(row(p.code))" :aria-label="`Include ${p.name}`" @change="toggle(p, $event.target.checked)"></td>
          <td>
            <span class="chip" :style="chipStyle(p)">{{ p.code }}</span>
            <span class="ml-2 text-[13px]">{{ p.name }}</span>
          </td>
          <td>
            <input v-if="row(p.code)" :value="row(p.code).seats" type="number" min="1" step="1" class="field !h-9" :aria-label="`${p.code} seats`" @input="set(p.code, 'seats', $event.target.value)">
          </td>
          <td>
            <input v-if="row(p.code)" :value="row(p.code).amount" type="number" min="0" step="1" class="field !h-9 mono" :aria-label="`${p.code} amount`" placeholder="Agreed price" @input="set(p.code, 'amount', $event.target.value)">
          </td>
        </tr>
        <tr v-if="!publications.length"><td colspan="4" class="text-sm muted py-3">No publications yet. Add them under Publications first.</td></tr>
      </tbody>
      <tfoot v-if="modelValue.length">
        <tr>
          <td />
          <td class="font-semibold">Total · {{ modelValue.length }} publication{{ modelValue.length === 1 ? '' : 's' }}</td>
          <td class="mono">{{ totalSeats }} seats</td>
          <td class="mono font-semibold">UGX {{ total.toLocaleString() }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  publications: { type: Array, default: () => [] },
  defaultSeats: { type: [Number, String], default: '' }
})
const emit = defineEmits(['update:modelValue'])

const row = (code) => props.modelValue.find((l) => l.code === code)

function toggle(p, on) {
  const rest = props.modelValue.filter((l) => l.code !== p.code)
  emit('update:modelValue', on ? [...rest, { code: p.code, seats: props.defaultSeats || 1, amount: '' }] : rest)
}

function set(code, field, value) {
  emit('update:modelValue', props.modelValue.map((l) => (l.code === code ? { ...l, [field]: value } : l)))
}

const total = computed(() => props.modelValue.reduce((s, l) => s + (Number(l.amount) || 0), 0))
const totalSeats = computed(() => props.modelValue.reduce((s, l) => s + (Number(l.seats) || 0), 0))

function chipStyle(p) {
  const c = p.colour || '#2f55e4'
  return { background: `${c}1f`, color: c }
}
</script>

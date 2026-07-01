<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIncomeStore, type IncomeFrequency, type IncomeRecord } from '@/stores/income'

const incomeStore = useIncomeStore()

// Form state
const source = ref('')
const amount = ref<string>('')
const frequency = ref<IncomeFrequency>('monthly')
const date = ref<string>(new Date().toISOString().split('T')[0])
const notes = ref('')

// Inline note editing
const activeEditNoteId = ref<string | null>(null)
const inlineNoteText = ref('')
const openNotesIds = ref<Record<string, boolean>>({})

// Notepad
const notepadContent = ref('')
const isSaving = ref(false)
const saveSuccess = ref(false)
const lastSavedTimestamp = ref<string>('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await incomeStore.fetchIncome()
  await incomeStore.fetchGeneralNote()
  if (incomeStore.generalNote) {
    notepadContent.value = incomeStore.generalNote.content
    lastSavedTimestamp.value = formatTime(incomeStore.generalNote.updated_at)
  }
})

// Real-time monthly preview
const currentCalculatedMonthly = computed(() => {
  const n = parseFloat(amount.value)
  if (isNaN(n) || n <= 0) return 0
  return incomeStore.calculateMonthlyEquivalent(n, frequency.value)
})

const isFormValid = computed(() => {
  const n = parseFloat(amount.value)
  return source.value.trim().length > 0 && !isNaN(n) && n > 0 && date.value !== ''
})

const handleAddIncome = async () => {
  if (!isFormValid.value) return
  try {
    await incomeStore.addIncome({
      source: source.value.trim(),
      amount: parseFloat(amount.value),
      frequency: frequency.value,
      date: date.value,
      notes: notes.value.trim() || null,
    })
    source.value = ''
    amount.value = ''
    frequency.value = 'monthly'
    date.value = new Date().toISOString().split('T')[0]
    notes.value = ''
  } catch (err) {
    console.error('Error adding income stream:', err)
  }
}

const handleDeleteIncome = async (id: string) => {
  if (confirm('Remove this income stream?')) {
    await incomeStore.deleteIncome(id)
  }
}

const startInlineNoteEdit = (id: string, currentNotes: string | null) => {
  activeEditNoteId.value = id
  inlineNoteText.value = currentNotes || ''
  openNotesIds.value[id] = true
}

const saveInlineNote = async (id: string) => {
  await incomeStore.updateIncomeNote(id, inlineNoteText.value)
  activeEditNoteId.value = null
}

const toggleNoteCollapse = (id: string) => {
  openNotesIds.value[id] = !openNotesIds.value[id]
}

watch(notepadContent, (newContent) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  isSaving.value = true
  saveSuccess.value = false
  debounceTimer = setTimeout(async () => {
    try {
      await incomeStore.saveGeneralNote(newContent)
      isSaving.value = false
      saveSuccess.value = true
      lastSavedTimestamp.value = formatTime(new Date().toISOString())
      setTimeout(() => { saveSuccess.value = false }, 2500)
    } catch (err) {
      isSaving.value = false
      console.error('Auto-save failed:', err)
    }
  }, 1000)
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getFrequencyBadgeStyles(freq: IncomeFrequency): string {
  switch (freq) {
    case 'monthly':  return 'bg-[rgba(105,219,124,0.15)] text-[#69db7c]'
    case 'weekly':   return 'bg-[rgba(255,138,101,0.15)] text-[#FF8A65]'
    case 'biweekly': return 'bg-blue-500/20 text-blue-400'
    case 'annual':   return 'bg-purple-500/20 text-purple-400'
    default:         return 'bg-[#8E8E93]/20 text-[#8E8E93]'
  }
}

function computeSum(records: IncomeRecord[]): number {
  return records.reduce((s, r) => s + r.amount, 0)
}

function computeMonthlySum(records: IncomeRecord[]): number {
  return records.reduce((s, r) => s + r.monthly_equivalent, 0)
}
</script>

<template>
  <div class="min-h-screen text-[#FFFFFF] px-4 pt-6 pb-28 antialiased font-sans" style="background: #111418">
    <div class="max-w-xl mx-auto space-y-6">

      <!-- Header -->
      <header class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Income</h1>
          <p class="text-sm text-[#8E8E93]">Manage and calculate cash inflows</p>
        </div>
        <div class="text-right">
          <span class="text-xs text-[#8E8E93] uppercase block tracking-wider">Est. Monthly</span>
          <span class="text-xl font-bold text-[#69db7c]">{{ formatCurrency(incomeStore.totalMonthlyIncome) }}</span>
        </div>
      </header>

      <!-- Add income form -->
      <section class="bg-[#2A2D34] rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] space-y-4">
        <h2 class="text-sm font-bold uppercase tracking-wider text-[#8E8E93]">Add Income Source</h2>

        <div class="space-y-3">
          <!-- Source name -->
          <input
            type="text"
            v-model="source"
            placeholder="Source Name (e.g. Salary, Freelance)"
            class="w-full bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF8A65] min-h-[44px]"
          />

          <!-- Amount -->
          <div class="relative flex items-center border border-[rgba(255,255,255,0.08)] bg-[#111418] rounded-xl px-3 min-h-[44px]">
            <span class="text-base font-semibold text-[#8E8E93] mr-1">₱</span>
            <input
              type="number"
              pattern="[0-9]*"
              inputmode="decimal"
              v-model="amount"
              placeholder="0.00"
              class="w-full bg-transparent text-white focus:outline-none text-sm"
            />
          </div>

          <!-- Frequency pills -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-[#8E8E93] block">Frequency</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                v-for="freq in (['once', 'weekly', 'biweekly', 'monthly', 'annual'] as const)"
                :key="freq"
                @click="frequency = freq"
                class="text-xs px-3 py-2 capitalize rounded-xl border font-medium transition-all min-h-[44px] shrink-0 cursor-pointer"
                :class="frequency === freq
                  ? 'bg-[#FF8A65] border-[#FF8A65] text-[#111418] font-bold'
                  : 'bg-[#111418] border-[rgba(255,255,255,0.08)] text-[#8E8E93]'"
              >
                {{ freq }}
              </button>
            </div>
          </div>

          <!-- Monthly equivalent preview -->
          <div class="min-h-[20px] px-1">
            <p v-if="currentCalculatedMonthly > 0" class="text-xs text-[#8E8E93]">
              ≈ <span class="text-[#69db7c] font-medium">{{ formatCurrency(currentCalculatedMonthly) }}</span> / month equivalent
            </p>
          </div>

          <!-- Date -->
          <div class="flex flex-col space-y-1">
            <label class="text-[11px] font-medium text-[#8E8E93]">Inflow Date / Effective From</label>
            <input
              type="date"
              v-model="date"
              class="bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none min-h-[44px] block w-full"
            />
          </div>

          <!-- Notes -->
          <input
            type="text"
            v-model="notes"
            placeholder="Optional notes (e.g. Account number, billing date)"
            class="w-full bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white placeholder-[#8E8E93] focus:outline-none min-h-[44px]"
          />
        </div>

        <button
          type="button"
          @click="handleAddIncome"
          :disabled="!isFormValid"
          class="w-full bg-[#FF8A65] text-[#111418] font-bold py-3 rounded-xl min-h-[48px] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Add Income Source
        </button>
      </section>

      <!-- Income list -->
      <section class="space-y-3">
        <h2 class="text-sm font-bold uppercase tracking-wider text-[#8E8E93] px-1">Active Streams</h2>

        <div
          v-if="incomeStore.incomeRecords.length === 0"
          class="text-center py-10 bg-[#2A2D34] rounded-2xl border border-[rgba(255,255,255,0.08)]"
        >
          <span class="text-3xl block mb-2">💵</span>
          <p class="text-sm text-[#8E8E93]">No income sources yet</p>
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="record in incomeStore.incomeRecords"
            :key="record.id"
            class="bg-[#2A2D34] rounded-xl border border-[rgba(255,255,255,0.08)] p-3.5 space-y-3"
          >
            <!-- Record header -->
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h3 class="font-bold text-white text-base leading-tight">{{ record.source }}</h3>
                  <span
                    class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                    :class="getFrequencyBadgeStyles(record.frequency)"
                  >
                    {{ record.frequency }}
                  </span>
                </div>
                <p class="text-xs text-[#8E8E93]">Base Amount: {{ formatCurrency(record.amount) }}</p>
                <p class="text-[11px] text-[#8E8E93]">Date: {{ formatDisplayDate(record.date) }}</p>
              </div>
              <div class="text-right">
                <span class="text-base font-bold text-[#69db7c] block">{{ formatCurrency(record.monthly_equivalent) }}</span>
                <span class="text-[9px] text-[#8E8E93] uppercase tracking-wider block">/ month equiv</span>
              </div>
            </div>

            <!-- Per-source note -->
            <div
              v-if="record.notes || activeEditNoteId === record.id"
              class="pt-2 border-t border-[rgba(255,255,255,0.04)]"
            >
              <div v-if="activeEditNoteId === record.id" class="space-y-2">
                <textarea
                  v-model="inlineNoteText"
                  class="w-full bg-[#111418] text-xs text-white border border-[rgba(255,255,255,0.08)] rounded-lg p-2 focus:outline-none min-h-[60px]"
                />
                <div class="flex justify-end space-x-2">
                  <button
                    @click="activeEditNoteId = null"
                    class="text-xs text-[#8E8E93] px-2 py-1 min-h-[32px] cursor-pointer"
                  >Cancel</button>
                  <button
                    @click="saveInlineNote(record.id)"
                    class="text-xs bg-[#69db7c] text-[#111418] font-bold px-3 py-1 rounded-md min-h-[32px] cursor-pointer"
                  >Save</button>
                </div>
              </div>
              <div v-else>
                <div
                  @click="toggleNoteCollapse(record.id)"
                  class="flex justify-between items-center cursor-pointer text-[#8E8E93] py-0.5"
                >
                  <span class="text-xs font-medium">📌 Per-Source Note</span>
                  <span class="text-[10px]">{{ openNotesIds[record.id] ? 'Hide' : 'Show' }}</span>
                </div>
                <p
                  v-show="openNotesIds[record.id]"
                  class="text-xs text-[#8E8E93] mt-1 italic pl-1 bg-[#111418]/40 p-2 rounded-lg"
                >
                  {{ record.notes }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end items-center space-x-1 pt-1">
              <button
                type="button"
                @click="startInlineNoteEdit(record.id, record.notes)"
                class="w-11 h-11 bg-[#111418] rounded-xl text-[#8E8E93] hover:text-[#FF8A65] transition-all flex items-center justify-center cursor-pointer"
                title="Edit notes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                @click="handleDeleteIncome(record.id)"
                class="w-11 h-11 bg-[#111418] rounded-xl text-[#8E8E93] hover:text-[#ff6b6b] hover:bg-[rgba(255,107,107,0.05)] transition-all flex items-center justify-center cursor-pointer"
                title="Remove source"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Distribution summary -->
      <section class="bg-[#2A2D34] rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] space-y-3">
        <h2 class="text-sm font-bold uppercase tracking-wider text-[#8E8E93]">Distribution Summary</h2>
        <div class="space-y-2 divide-y divide-[rgba(255,255,255,0.04)] text-xs">

          <div class="flex justify-between items-center py-2">
            <span class="text-[#8E8E93]">One-time Inflows</span>
            <span class="font-bold text-white">{{ formatCurrency(computeSum(incomeStore.incomeByFrequency.once)) }}</span>
          </div>

          <div class="flex justify-between items-center py-2">
            <span class="text-[#8E8E93]">Weekly Streams</span>
            <div class="text-right">
              <span class="font-bold text-white block">{{ formatCurrency(computeSum(incomeStore.incomeByFrequency.weekly)) }} / wk</span>
              <span class="text-[10px] text-[#69db7c]">equiv. {{ formatCurrency(computeMonthlySum(incomeStore.incomeByFrequency.weekly)) }}/mo</span>
            </div>
          </div>

          <div class="flex justify-between items-center py-2">
            <span class="text-[#8E8E93]">Biweekly Streams</span>
            <div class="text-right">
              <span class="font-bold text-white block">{{ formatCurrency(computeSum(incomeStore.incomeByFrequency.biweekly)) }} / bi-wk</span>
              <span class="text-[10px] text-[#69db7c]">equiv. {{ formatCurrency(computeMonthlySum(incomeStore.incomeByFrequency.biweekly)) }}/mo</span>
            </div>
          </div>

          <div class="flex justify-between items-center py-2">
            <span class="text-[#8E8E93]">Monthly Base Channels</span>
            <span class="font-bold text-white">{{ formatCurrency(computeSum(incomeStore.incomeByFrequency.monthly)) }}</span>
          </div>

          <div class="flex justify-between items-center py-2">
            <span class="text-[#8E8E93]">Annualized Revenue</span>
            <div class="text-right">
              <span class="font-bold text-white block">{{ formatCurrency(computeSum(incomeStore.incomeByFrequency.annual)) }} / yr</span>
              <span class="text-[10px] text-[#69db7c]">equiv. {{ formatCurrency(computeMonthlySum(incomeStore.incomeByFrequency.annual)) }}/mo</span>
            </div>
          </div>

        </div>
      </section>

      <!-- Financial notepad -->
      <section class="bg-[#2A2D34] rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span class="text-base">📝</span>
            <h2 class="text-sm font-bold uppercase tracking-wider text-white">Financial Notes</h2>
          </div>
          <div class="text-[11px]">
            <span v-if="isSaving" class="text-[#FF8A65] animate-pulse">Saving...</span>
            <span v-else-if="saveSuccess" class="text-[#69db7c] font-medium">Saved ✓</span>
            <span v-else-if="lastSavedTimestamp" class="text-[#8E8E93]">Saved at {{ lastSavedTimestamp }}</span>
          </div>
        </div>
        <textarea
          v-model="notepadContent"
          placeholder="Add your financial notes, reminders, or goals here..."
          class="w-full bg-[#111418] text-sm text-white border border-[rgba(255,255,255,0.08)] rounded-xl p-3 focus:outline-none focus:border-[#FF8A65] min-h-[120px] resize-y placeholder-[rgba(255,255,255,0.25)]"
        />
      </section>

    </div>
  </div>
</template>

<style scoped>
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
}
</style>
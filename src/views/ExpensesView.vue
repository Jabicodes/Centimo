<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExpensesStore, type Expense } from '@/stores/expenses'

const expensesStore = useExpensesStore()

// Form state
const amount = ref<string>('')
const selectedCategoryId = ref<string>('')
const description = ref<string>('')
const date = ref<string>(new Date().toISOString().split('T')[0])
const isRecurring = ref<boolean>(false)
const recurringFrequency = ref<'weekly' | 'monthly' | 'annual'>('monthly')

// Filter state
const filterCategoryId = ref<string>('all')
const filterRecurringOnly = ref<boolean>(false)
const isRecurringCardCollapsed = ref<boolean>(true)

onMounted(async () => {
  await expensesStore.fetchCategories()
  await expensesStore.fetchExpenses()
  if (expensesStore.categories.length > 0) {
    selectedCategoryId.value = expensesStore.categories[0].id
  }
})

const isValid = computed(() => {
  const parsedAmount = parseFloat(amount.value)
  return !isNaN(parsedAmount) && parsedAmount > 0 && selectedCategoryId.value !== ''
})

const handleAddExpense = async () => {
  if (!isValid.value) return
  try {
    await expensesStore.addExpense({
      amount: parseFloat(amount.value),
      category_id: selectedCategoryId.value,
      description: description.value.trim() || null,
      date: date.value,
      is_recurring: isRecurring.value,
      recurring_frequency: isRecurring.value ? recurringFrequency.value : null,
    })
    amount.value = ''
    description.value = ''
    isRecurring.value = false
    date.value = new Date().toISOString().split('T')[0]
    if (expensesStore.categories.length > 0) {
      selectedCategoryId.value = expensesStore.categories[0].id
    }
  } catch (error) {
    console.error('Submission failed:', error)
  }
}

const handleDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this expense?')) {
    await expensesStore.deleteExpense(id)
  }
}

const filteredExpenses = computed(() =>
  expensesStore.expenses.filter((expense) => {
    const matchesCategory =
      filterCategoryId.value === 'all' || expense.category_id === filterCategoryId.value
    const matchesRecurring = !filterRecurringOnly.value || expense.is_recurring
    return matchesCategory && matchesRecurring
  }),
)

const currentMonthTotal = computed(() => {
  const now = new Date()
  return expensesStore.expenses
    .filter((e) => {
      const eDate = new Date(e.date)
      return (
        eDate.getFullYear() === now.getFullYear() && eDate.getMonth() === now.getMonth()
      )
    })
    .reduce((sum, e) => sum + e.amount, 0)
})

const recurringExpensesList = computed(() =>
  expensesStore.expenses.filter((e) => e.is_recurring),
)

const totalMonthlyRecurringCost = computed(() =>
  recurringExpensesList.value.reduce((sum, e) => {
    if (e.recurring_frequency === 'weekly') return sum + e.amount * 4.33
    if (e.recurring_frequency === 'annual') return sum + e.amount / 12
    return sum + e.amount
  }, 0),
)

const groupedExpenses = computed(() => {
  const groups: Record<string, Expense[]> = {}
  filteredExpenses.value.forEach((expense) => {
    if (!groups[expense.date]) groups[expense.date] = []
    groups[expense.date].push(expense)
  })
  return groups
})

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}

function formatDateGroupHeader(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterdayObj = new Date()
  yesterdayObj.setDate(yesterdayObj.getDate() - 1)
  const yesterday = yesterdayObj.toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="min-h-screen text-[#FFFFFF] px-4 pt-6 pb-28 antialiased font-sans" style="background: #111418">
    <div class="max-w-xl mx-auto space-y-6">

      <!-- Header -->
      <header class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Expenses</h1>
          <p class="text-sm text-[#8E8E93]">Track your local financial outflows</p>
        </div>
        <div class="text-right">
          <span class="text-xs text-[#8E8E93] uppercase block tracking-wider">This Month</span>
          <span class="text-xl font-bold text-[#69db7c]">{{ formatCurrency(currentMonthTotal) }}</span>
        </div>
      </header>

      <!-- Add Expense Form -->
      <section class="bg-[#2A2D34] rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] space-y-4">
        <!-- Amount input -->
        <div class="relative flex items-center justify-center border-b border-[rgba(255,255,255,0.08)] py-2">
          <span class="text-3xl font-semibold text-[#FF8A65] absolute left-3">₱</span>
          <input
            type="number"
            pattern="[0-9]*"
            inputmode="decimal"
            v-model="amount"
            placeholder="0.00"
            class="w-full text-center text-4xl font-bold bg-transparent text-white placeholder-[rgba(255,255,255,0.2)] focus:outline-none py-2 px-10 min-h-[48px]"
          />
        </div>

        <!-- Category picker -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">Select Category</label>
          <div class="grid grid-cols-3 md:grid-cols-4 gap-2">
            <button
              type="button"
              v-for="cat in expensesStore.categories"
              :key="cat.id"
              @click="selectedCategoryId = cat.id"
              class="flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-150 min-h-[54px] cursor-pointer"
              :class="
                selectedCategoryId === cat.id
                  ? 'bg-[#FF8A65] border-[#FF8A65] text-[#111418] font-bold shadow-md'
                  : 'bg-[#111418] border-[rgba(255,255,255,0.08)] text-[#FFFFFF] hover:border-[rgba(255,255,255,0.2)]'
              "
            >
              <span class="text-lg mb-0.5">{{ cat.icon || '💸' }}</span>
              <span class="text-[11px] truncate w-full px-1">{{ cat.name }}</span>
            </button>
          </div>
        </div>

        <!-- Description -->
        <input
          type="text"
          v-model="description"
          placeholder="What was this for? (e.g. Lunch with team)"
          class="w-full bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#FF8A65] min-h-[44px]"
        />

        <!-- Date + Recurring toggle -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col space-y-1">
            <label class="text-[11px] font-medium text-[#8E8E93]">Date</label>
            <input
              type="date"
              v-model="date"
              class="bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none min-h-[44px] block w-full"
            />
          </div>
          <div class="flex flex-col justify-end items-end">
            <label class="flex items-center space-x-2 cursor-pointer min-h-[44px]">
              <span class="text-sm text-[#FFFFFF]">Recurring?</span>
              <div class="relative">
                <input type="checkbox" v-model="isRecurring" class="sr-only peer" />
                <div class="w-9 h-5 bg-[#111418] border border-[rgba(255,255,255,0.15)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#69db7c]"></div>
              </div>
            </label>
          </div>
        </div>

        <!-- Billing cycle selector -->
        <div
          v-if="isRecurring"
          class="p-3 bg-[#111418] rounded-xl border border-[rgba(255,255,255,0.05)] flex items-center justify-between"
        >
          <span class="text-xs text-[#8E8E93]">Billing Cycle:</span>
          <div class="flex bg-[#2A2D34] p-1 rounded-lg border border-[rgba(255,255,255,0.08)]">
            <button
              type="button"
              v-for="freq in (['weekly', 'monthly', 'annual'] as const)"
              :key="freq"
              @click="recurringFrequency = freq"
              class="text-xs px-3 py-1 capitalize rounded-md font-medium transition-all min-h-[32px]"
              :class="recurringFrequency === freq ? 'bg-[#FF8A65] text-[#111418] font-bold' : 'text-[#8E8E93]'"
            >
              {{ freq }}
            </button>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="button"
          @click="handleAddExpense"
          :disabled="!isValid"
          class="w-full bg-[#FF8A65] text-[#111418] font-bold py-3 rounded-xl min-h-[48px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
        >
          Add Expense
        </button>
      </section>

      <!-- Filters -->
      <section class="bg-[#2A2D34] rounded-xl p-3 border border-[rgba(255,255,255,0.08)] space-y-3">
        <div class="flex items-center justify-between text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
          <span>Filter Criteria</span>
          <span class="text-[#FF8A65] normal-case font-normal">{{ filteredExpenses.length }} items</span>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              @click="filterCategoryId = 'all'"
              class="text-xs px-3 py-1.5 rounded-full border shrink-0 min-h-[36px]"
              :class="filterCategoryId === 'all' ? 'bg-[#FFFFFF] text-[#111418] border-[#FFFFFF] font-bold' : 'bg-[#111418] text-[#8E8E93] border-[rgba(255,255,255,0.08)]'"
            >
              All
            </button>
            <button
              type="button"
              v-for="cat in expensesStore.categories"
              :key="cat.id"
              @click="filterCategoryId = cat.id"
              class="text-xs px-3 py-1.5 rounded-full border shrink-0 flex items-center space-x-1 min-h-[36px]"
              :class="filterCategoryId === cat.id ? 'bg-[#FFFFFF] text-[#111418] border-[#FFFFFF] font-bold' : 'bg-[#111418] text-[#8E8E93] border-[rgba(255,255,255,0.08)]'"
            >
              <span>{{ cat.icon }}</span>
              <span>{{ cat.name }}</span>
            </button>
          </div>
          <label class="flex items-center space-x-2 shrink-0 self-end sm:self-auto cursor-pointer min-h-[36px]">
            <span class="text-xs text-[#8E8E93]">🔂 Recurring Only</span>
            <input type="checkbox" v-model="filterRecurringOnly" class="sr-only peer" />
            <div class="w-7 h-4 bg-[#111418] border border-[rgba(255,255,255,0.15)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[#FF8A65] relative"></div>
          </label>
        </div>
      </section>

      <!-- Expense list -->
      <main class="space-y-4">
        <div
          v-if="filteredExpenses.length === 0"
          class="text-center py-12 bg-[#2A2D34] rounded-2xl border border-[rgba(255,255,255,0.08)] p-6"
        >
          <span class="text-4xl block mb-2">📥</span>
          <p class="text-white font-medium">No expenses yet.</p>
          <p class="text-sm text-[#8E8E93] mt-1">Add your first financial entry above!</p>
        </div>

        <div v-else v-for="(items, dateGroup) in groupedExpenses" :key="dateGroup" class="space-y-2">
          <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-widest px-1 pt-2">
            {{ formatDateGroupHeader(String(dateGroup)) }}
          </h3>
          <div class="bg-[#2A2D34] rounded-2xl border border-[rgba(255,255,255,0.08)] divide-y divide-[rgba(255,255,255,0.05)] overflow-hidden">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-center justify-between p-3.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <div class="flex items-center space-x-3 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-xl bg-[#111418] flex items-center justify-center text-lg shrink-0 relative border border-[rgba(255,255,255,0.05)]">
                  {{ item.categories?.icon || '💸' }}
                  <span class="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[#FF8A65]"></span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                    <span class="font-semibold text-white truncate text-sm">
                      {{ item.description || item.categories?.name }}
                    </span>
                    <span
                      v-if="item.is_recurring"
                      class="bg-[rgba(255,138,101,0.15)] text-[#FF8A65] text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                    >
                      {{ item.recurring_frequency }}
                    </span>
                  </div>
                  <span class="text-xs text-[#8E8E93] block mt-0.5">
                    {{ item.categories?.name }} &middot; {{ dateGroup }}
                  </span>
                </div>
              </div>
              <div class="flex items-center space-x-3 ml-2 shrink-0">
                <span class="font-bold text-white text-base">{{ formatCurrency(item.amount) }}</span>
                <button
                  type="button"
                  @click="handleDelete(item.id)"
                  class="w-11 h-11 bg-[#111418] text-[#8E8E93] hover:text-[#ff6b6b] hover:bg-[rgba(255,107,107,0.1)] rounded-xl flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Recurring summary card -->
      <section
        v-if="recurringExpensesList.length > 0"
        class="bg-[#2A2D34] rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden"
      >
        <div
          @click="isRecurringCardCollapsed = !isRecurringCardCollapsed"
          class="p-4 flex items-center justify-between cursor-pointer border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.01)] transition-colors min-h-[44px]"
        >
          <div class="flex items-center space-x-2">
            <span class="text-base">🔄</span>
            <h2 class="font-bold text-white text-sm tracking-wide">Recurring Expenses</h2>
          </div>
          <div class="flex items-center space-x-2 text-right">
            <div>
              <span class="text-[10px] uppercase text-[#8E8E93] block">Est. Monthly Base</span>
              <span class="text-sm font-bold text-[#FF8A65]">{{ formatCurrency(totalMonthlyRecurringCost) }}</span>
            </div>
            <span
              class="text-[#8E8E93] text-xs transition-transform duration-200"
              :class="{ 'rotate-180': !isRecurringCardCollapsed }"
            >▼</span>
          </div>
        </div>

        <div
          v-show="!isRecurringCardCollapsed || recurringExpensesList.length <= 5"
          class="divide-y divide-[rgba(255,255,255,0.04)] bg-[#111418]/30"
        >
          <div
            v-for="rec in (isRecurringCardCollapsed ? recurringExpensesList.slice(0, 5) : recurringExpensesList)"
            :key="rec.id"
            class="flex justify-between items-center px-4 py-2.5 text-xs"
          >
            <div class="min-w-0 flex-1 pr-2">
              <p class="font-semibold text-white truncate">{{ rec.description || rec.categories?.name }}</p>
              <p class="text-[#8E8E93] text-[11px] capitalize mt-0.5">Cycle: {{ rec.recurring_frequency }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="font-bold text-white">{{ formatCurrency(rec.amount) }}</p>
              <p class="text-[10px] text-[#8E8E93] mt-0.5">
                <span v-if="rec.recurring_frequency === 'weekly'">{{ formatCurrency(rec.amount * 4.33) }}/mo</span>
                <span v-else-if="rec.recurring_frequency === 'annual'">{{ formatCurrency(rec.amount / 12) }}/mo</span>
                <span v-else>Active</span>
              </p>
            </div>
          </div>
          <div v-if="recurringExpensesList.length > 5" class="p-2 text-center bg-[#111418]/60">
            <button
              type="button"
              @click="isRecurringCardCollapsed = !isRecurringCardCollapsed"
              class="text-[#FF8A65] text-xs font-semibold hover:underline w-full py-1 min-h-[36px] cursor-pointer"
            >
              {{ isRecurringCardCollapsed ? `Show ${recurringExpensesList.length - 5} More` : 'Show Less' }}
            </button>
          </div>
        </div>
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
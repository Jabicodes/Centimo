<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExpensesStore } from '@/stores/expenses'

const expensesStore = useExpensesStore()

// Form state
const expenseAmount = ref('')
const selectedCategoryId = ref<string>('')
const expenseDescription = ref('')
const expenseDate = ref(new Date().toLocaleDateString('en-CA'))
const activeFilter = ref('All')

const categories = computed(() => expensesStore.categories)

onMounted(async () => {
  await Promise.all([expensesStore.fetchCategories(), expensesStore.fetchExpenses()])
  if (expensesStore.categories.length > 0) {
    selectedCategoryId.value = expensesStore.categories[0].id
  }
})

const filteredExpenses = computed(() => {
  if (activeFilter.value === 'All') return expensesStore.expenses
  return expensesStore.expenses.filter((e) => e.categories?.name === activeFilter.value)
})

async function handleAddExpense() {
  const amount = parseFloat(expenseAmount.value)
  if (isNaN(amount) || amount <= 0) return
  try {
    await expensesStore.addExpense({
      amount,
      category_id: selectedCategoryId.value,
      description: expenseDescription.value.trim() || null,
      date: expenseDate.value,
      is_recurring: false,
      recurring_frequency: null,
    })
    expenseAmount.value = ''
    expenseDescription.value = ''
    expenseDate.value = new Date().toLocaleDateString('en-CA')
  } catch (err) {
    console.error('Failed to write expense log entry:', err)
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}
</script>

<template>
  <div class="min-h-screen text-white px-3 pt-4 pb-24 antialiased font-sans" style="background: #111418">
    <div class="max-w-md mx-auto space-y-4">

      <!-- Header -->
      <header class="px-1 flex justify-between items-end">
        <div>
          <h1 class="text-xl font-bold tracking-tight">Expenses</h1>
          <p class="text-xs text-[#8E8E93]">Track your local financial outflows</p>
        </div>
      </header>

      <!-- Input card -->
      <section class="bg-[#1A1D24] rounded-xl p-3 border border-[rgba(255,255,255,0.06)] space-y-3">

        <!-- Amount -->
        <div class="text-center py-1 relative">
          <span class="absolute left-2 top-1/2 -translate-y-1/2 text-lg font-bold text-[#FF8A65]">₱</span>
          <input
            type="number"
            pattern="[0-9]*"
            inputmode="decimal"
            v-model="expenseAmount"
            placeholder="0.00"
            class="w-full bg-transparent text-center text-3xl font-black text-white focus:outline-none placeholder-white/20 tracking-tight px-6"
          />
        </div>

        <!-- Category grid -->
        <div class="space-y-1">
          <label class="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] px-0.5">Select Category</label>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              @click="selectedCategoryId = cat.id"
              class="flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all min-h-[52px] cursor-pointer"
              :class="
                selectedCategoryId === cat.id
                  ? 'bg-[#FF8A65] border-[#FF8A65] text-[#111418]'
                  : 'bg-[#2A2D34] border-[rgba(255,255,255,0.06)] text-white hover:bg-[#343842]'
              "
            >
              <span class="text-sm mb-0.5">{{ cat.icon || '🛍️' }}</span>
              <span class="text-[10px] font-bold tracking-tight truncate w-full px-0.5">{{ cat.name }}</span>
            </button>
          </div>
        </div>

        <!-- Description + date -->
        <div class="space-y-2">
          <input
            type="text"
            v-model="expenseDescription"
            placeholder="What was this for? (e.g. Lunch with team)"
            class="w-full bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none placeholder-[#8E8E93]"
          />
          <div class="flex flex-col space-y-1">
            <label class="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93] px-0.5">Date</label>
            <input
              type="date"
              v-model="expenseDate"
              class="w-full bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none color-scheme-dark"
            />
          </div>
        </div>

        <!-- Submit -->
        <button
          @click="handleAddExpense"
          :disabled="!expenseAmount || parseFloat(expenseAmount) <= 0"
          class="w-full bg-[#FF8A65] text-[#111418] text-xs font-bold py-2.5 rounded-lg min-h-[40px] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-wider cursor-pointer"
        >
          Add Expense
        </button>
      </section>

      <!-- Category filter row -->
      <section class="space-y-2">
        <label class="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] px-1 block">Filter Criteria</label>
        <div class="flex space-x-1.5 overflow-x-auto pb-1 px-1 scrollbar-hide snap-x">
          <button
            @click="activeFilter = 'All'"
            class="text-[11px] px-3 py-1 rounded-full whitespace-nowrap font-medium cursor-pointer"
            :class="activeFilter === 'All' ? 'bg-white text-black font-bold' : 'bg-[#2A2D34] text-[#8E8E93]'"
          >
            All
          </button>
          <button
            v-for="cat in categories"
            :key="'filter-' + cat.id"
            @click="activeFilter = cat.name"
            class="text-[11px] px-3 py-1 rounded-full whitespace-nowrap font-medium flex items-center space-x-1 cursor-pointer"
            :class="activeFilter === cat.name ? 'bg-white text-black font-bold' : 'bg-[#2A2D34] text-[#8E8E93]'"
          >
            <span>{{ cat.icon || '🛍️' }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </section>

      <!-- Expense list -->
      <section class="px-0.5">
        <div
          v-if="filteredExpenses.length === 0"
          class="text-center py-8 bg-[#1A1D24] rounded-xl border border-[rgba(255,255,255,0.06)] px-4"
        >
          <div class="inline-flex w-10 h-10 bg-[#2A2D34] text-xl items-center justify-center rounded-xl mb-2">📥</div>
          <h3 class="text-sm font-bold text-white">No expenses yet.</h3>
          <p class="text-xs text-[#8E8E93] max-w-[240px] mx-auto mt-0.5">Add your first financial entry above to begin tracking balances.</p>
        </div>

        <div
          v-else
          class="bg-[#1A1D24] rounded-xl border border-[rgba(255,255,255,0.06)] divide-y divide-[rgba(255,255,255,0.05)] overflow-hidden"
        >
          <div
            v-for="item in filteredExpenses"
            :key="item.id"
            class="flex items-center justify-between p-3"
          >
            <div class="min-w-0 flex-1 pr-2">
              <p class="text-xs font-semibold text-white truncate">{{ item.description || item.categories?.name }}</p>
              <span class="text-[10px] text-[#8E8E93] mt-0.5 block">
                {{ item.categories?.name }} &middot; {{ item.date.split('T')[0] }}
              </span>
            </div>
            <div class="text-xs font-bold text-[#FF6B6B] shrink-0">
              -{{ formatCurrency(item.amount) }}
            </div>
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
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.color-scheme-dark {
  color-scheme: dark;
}
</style>
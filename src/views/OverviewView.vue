<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useExpensesStore } from '../stores/expenses'
import { useIncomeStore } from '../stores/income'

const authStore = useAuthStore()
const expensesStore = useExpensesStore()
const incomeStore = useIncomeStore()

onMounted(() => {
  expensesStore.fetchExpenses()
  expensesStore.fetchCategories()
  incomeStore.fetchData()
})

// ── Greeting ──────────────────────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  const name = authStore.user?.username ?? ''
  if (h < 12) return `Good Morning, ${name}`
  if (h < 18) return `Good Afternoon, ${name}`
  return `Good Evening, ${name}`
})

// ── Summary metrics ───────────────────────────────────────────────────────────
const totalIncome = computed(() => incomeStore.totalMonthlyIncome)
const totalExpenses = computed(() => expensesStore.totalMonthlyExpenses)
const netSavings = computed(() => totalIncome.value - totalExpenses.value)
const savingsRate = computed(() => {
  if (totalIncome.value === 0) return 0
  return (netSavings.value / totalIncome.value) * 100
})

// ── Donut chart ───────────────────────────────────────────────────────────────
const CHART_SIZE = 200
const STROKE = 28
const R = (CHART_SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R
const CX = CHART_SIZE / 2
const CY = CHART_SIZE / 2

const chartSegments = computed(() => {
  const cats = expensesStore.expensesByCategory.filter((c) => c.spent > 0)
  const total = cats.reduce((s, c) => s + c.spent, 0)
  if (total === 0) return []

  let offset = 0
  return cats.map((c) => {
    const dash = (c.spent / total) * CIRC
    const gap = CIRC - dash
    const seg = { ...c, dash, gap, offset: -offset - CIRC * 0.25 }
    offset += dash
    return seg
  })
})

const chartTotal = computed(() =>
  expensesStore.expensesByCategory.reduce((s, c) => s + c.spent, 0),
)

const chartEmpty = computed(() => chartTotal.value === 0)

// ── Budget bars ───────────────────────────────────────────────────────────────
const budgetCategories = computed(() =>
  expensesStore.expensesByCategory.filter((c) => c.budget_limit > 0),
)

function budgetPct(spent: number, limit: number): number {
  return Math.min((spent / limit) * 100, 100)
}

function budgetColor(spent: number, limit: number): string {
  const pct = (spent / limit) * 100
  if (pct >= 80) return '#ff6b6b'
  if (pct >= 50) return '#FF8A65'
  return '#34d399'
}

// ── Formatters ────────────────────────────────────────────────────────────────
function peso(n: number): string {
  return '₱' + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n: number): string {
  return n.toFixed(1) + '%'
}
</script>

<template>
  <div class="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">

    <!-- Greeting -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-white">{{ greeting }}</h1>
      <p class="text-sm mt-0.5" style="color: #8E8E93">Here's your financial snapshot for this month.</p>
    </div>

    <!-- Summary cards 2×2 → 4 across -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <!-- Income -->
      <div class="rounded-2xl p-4" style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.06)">
        <p class="text-xs font-medium mb-2" style="color: #8E8E93">Monthly Income</p>
        <p class="text-lg font-bold text-white leading-tight">{{ peso(totalIncome) }}</p>
      </div>

      <!-- Expenses -->
      <div class="rounded-2xl p-4" style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.06)">
        <p class="text-xs font-medium mb-2" style="color: #8E8E93">Monthly Expenses</p>
        <p class="text-lg font-bold text-white leading-tight">{{ peso(totalExpenses) }}</p>
      </div>

      <!-- Net Savings -->
      <div class="rounded-2xl p-4" style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.06)">
        <p class="text-xs font-medium mb-2" style="color: #8E8E93">Net Savings</p>
        <p
          class="text-lg font-bold leading-tight"
          :style="netSavings >= 0 ? 'color: #34d399' : 'color: #ff6b6b'"
        >
          {{ netSavings >= 0 ? '' : '-' }}{{ peso(netSavings) }}
        </p>
      </div>

      <!-- Savings Rate -->
      <div class="rounded-2xl p-4" style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.06)">
        <p class="text-xs font-medium mb-2" style="color: #8E8E93">Savings Rate</p>
        <p
          class="text-lg font-bold leading-tight"
          :style="savingsRate >= 0 ? 'color: #34d399' : 'color: #ff6b6b'"
        >
          {{ pct(savingsRate) }}
        </p>
      </div>
    </div>

    <!-- Donut chart + breakdown -->
    <div class="rounded-2xl p-5 mb-6" style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.06)">
      <p class="text-sm font-semibold text-white mb-4">Spending Breakdown</p>

      <!-- Empty state -->
      <div v-if="chartEmpty" class="flex flex-col items-center justify-center py-10 gap-2">
        <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: rgba(255,255,255,0.04)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <p class="text-sm" style="color: #8E8E93">No expenses recorded this month</p>
      </div>

      <!-- Chart + legend -->
      <div v-else class="flex flex-col md:flex-row md:items-center gap-6">
        <!-- SVG Donut -->
        <div class="flex-shrink-0 flex justify-center">
          <div class="relative" :style="`width: ${CHART_SIZE}px; height: ${CHART_SIZE}px`">
            <svg :width="CHART_SIZE" :height="CHART_SIZE">
              <!-- Track ring -->
              <circle
                :cx="CX" :cy="CY" :r="R"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                :stroke-width="STROKE"
              />
              <!-- Segments -->
              <circle
                v-for="(seg, i) in chartSegments"
                :key="i"
                :cx="CX" :cy="CY" :r="R"
                fill="none"
                :stroke="seg.color"
                :stroke-width="STROKE"
                :stroke-dasharray="`${seg.dash} ${seg.gap}`"
                :stroke-dashoffset="seg.offset"
                stroke-linecap="butt"
              />
            </svg>
            <!-- Center label -->
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p class="text-xs font-medium" style="color: #8E8E93">Total</p>
              <p class="text-base font-bold text-white">{{ peso(chartTotal) }}</p>
            </div>
          </div>
        </div>

        <!-- Legend grid -->
        <div class="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 min-w-0">
          <div
            v-for="cat in expensesStore.expensesByCategory.filter(c => c.spent > 0)"
            :key="cat.id"
            class="flex items-center gap-2 min-w-0"
          >
            <span class="text-base leading-none flex-shrink-0">{{ cat.icon }}</span>
            <div class="min-w-0">
              <p class="text-xs font-medium text-white truncate">{{ cat.name }}</p>
              <p class="text-xs" style="color: #8E8E93">
                {{ chartTotal > 0 ? pct((cat.spent / chartTotal) * 100) : '0%' }}
                · {{ peso(cat.spent) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Budget progress panel -->
    <div
      v-if="budgetCategories.length > 0"
      class="rounded-2xl p-5"
      style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.06)"
    >
      <p class="text-sm font-semibold text-white mb-4">Budget Tracker</p>
      <div class="space-y-4">
        <div v-for="cat in budgetCategories" :key="cat.id">
          <!-- Label row -->
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span class="text-sm leading-none">{{ cat.icon }}</span>
              <span class="text-sm font-medium text-white">{{ cat.name }}</span>
            </div>
            <span class="text-xs font-medium tabular-nums" :style="`color: ${budgetColor(cat.spent, cat.budget_limit)}`">
              {{ pct(budgetPct(cat.spent, cat.budget_limit)) }}
            </span>
          </div>
          <!-- Bar -->
          <div class="h-1.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.08)">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="`width: ${budgetPct(cat.spent, cat.budget_limit)}%; background: ${budgetColor(cat.spent, cat.budget_limit)}`"
            />
          </div>
          <!-- Remainder / over-budget -->
          <div class="flex justify-between mt-1">
            <span class="text-xs" style="color: #8E8E93">
              {{ peso(cat.spent) }} of {{ peso(cat.budget_limit) }}
            </span>
            <span
              class="text-xs font-medium"
              :style="cat.spent > cat.budget_limit ? 'color: #ff6b6b' : 'color: #8E8E93'"
            >
              {{ cat.spent > cat.budget_limit
                  ? `${peso(cat.spent - cat.budget_limit)} over`
                  : `${peso(cat.budget_limit - cat.spent)} left` }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
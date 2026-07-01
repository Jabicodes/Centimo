<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletStore, type TransactionType, type SourceType, type WalletTransaction } from '@/stores/wallet'

const walletStore = useWalletStore()

// Modal control
const isTransactionModalOpen = ref(false)
const isSetBalanceModalOpen = ref(false)

// Transaction form
const txType = ref<TransactionType>('cash_in')
const txSource = ref<SourceType>('cash')
const txAmount = ref('')
const txCategory = ref('Food')
const txDescription = ref('')
const txDate = ref(new Date().toLocaleDateString('en-CA'))

// Set balance form
const targetBalanceSource = ref<SourceType>('cash')
const overrideAmount = ref('')

// Filter tab
const activeTab = ref<'all' | 'cash' | 'bank'>('all')

const categories = ['Food', 'Transport', 'Utilities', 'Salary', 'Freelance', 'Leisure', 'Savings', 'Transfer', 'Others']

onMounted(async () => {
  await Promise.all([walletStore.fetchWallet(), walletStore.fetchTransactions()])
})

function openTransactionModal(source: SourceType, direction: 'in' | 'out') {
  txSource.value = source
  txType.value = source === 'cash'
    ? (direction === 'in' ? 'cash_in' : 'cash_out')
    : (direction === 'in' ? 'bank_in' : 'bank_out')
  txAmount.value = ''
  txDescription.value = ''
  txDate.value = new Date().toLocaleDateString('en-CA')
  isTransactionModalOpen.value = true
}

function openSetBalanceModal(source: SourceType) {
  targetBalanceSource.value = source
  const currentVal = walletStore.wallet
    ? (source === 'cash' ? walletStore.wallet.cash_on_hand : walletStore.wallet.cash_on_bank)
    : 0
  overrideAmount.value = currentVal.toString()
  isSetBalanceModalOpen.value = true
}

async function handleLogTransaction() {
  const numericAmount = parseFloat(txAmount.value)
  if (isNaN(numericAmount) || numericAmount <= 0) return
  try {
    await walletStore.logTransaction({
      type: txType.value,
      source: txSource.value,
      amount: numericAmount,
      category: txCategory.value,
      description: txDescription.value.trim() || null,
      date: txDate.value,
    })
    isTransactionModalOpen.value = false
  } catch (err) {
    console.error('Transaction insertion failed:', err)
  }
}

async function handleSetBalance() {
  const numericAmount = parseFloat(overrideAmount.value)
  if (isNaN(numericAmount) || numericAmount < 0) return
  let cashOnHand = walletStore.wallet?.cash_on_hand ?? 0
  let cashOnBank = walletStore.wallet?.cash_on_bank ?? 0
  if (targetBalanceSource.value === 'cash') {
    cashOnHand = numericAmount
  } else {
    cashOnBank = numericAmount
  }
  try {
    await walletStore.setBalance(cashOnHand, cashOnBank)
    isSetBalanceModalOpen.value = false
  } catch (err) {
    console.error('Balance override failed:', err)
  }
}

const filteredTransactions = computed(() => {
  if (activeTab.value === 'cash') return walletStore.cashTransactions
  if (activeTab.value === 'bank') return walletStore.bankTransactions
  return walletStore.transactions
})

const groupedTransactions = computed(() => {
  const groups: Record<string, WalletTransaction[]> = {}
  filteredTransactions.value.forEach((tx) => {
    const dateKey = tx.date.split('T')[0]
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(tx)
  })
  return groups
})

const quickStats = computed(() => ({
  moneyIn: walletStore.totalMoneyInThisMonth,
  moneyOut: walletStore.totalMoneyOutThisMonth,
  netFlow: walletStore.netFlowThisMonth,
}))

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val)
}

function formatDateGroupHeader(dateStr: string): string {
  const today = new Date().toLocaleDateString('en-CA')
  const yesterdayObj = new Date()
  yesterdayObj.setDate(yesterdayObj.getDate() - 1)
  const yesterday = yesterdayObj.toLocaleDateString('en-CA')
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function isIncomeType(type: TransactionType): boolean {
  return type === 'cash_in' || type === 'bank_in'
}
</script>

<template>
  <div class="min-h-screen text-[#FFFFFF] px-4 pt-6 pb-28 antialiased font-sans" style="background: #111418">
    <div class="max-w-xl mx-auto space-y-6">

      <!-- Header -->
      <header class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Wallet</h1>
          <p class="text-sm text-[#8E8E93]">Manage cash pipelines and balances</p>
        </div>
        <div class="text-right">
          <span class="text-xs text-[#8E8E93] uppercase block tracking-wider font-semibold">Net Worth Base</span>
          <span class="text-2xl font-bold text-[#FF8A65]">{{ formatCurrency(walletStore.totalBalance) }}</span>
        </div>
      </header>

      <!-- Balance cards -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Cash -->
        <div class="bg-[#2A2D34] rounded-2xl p-4 border-l-4 border-l-[#FF8A65] border border-[rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-[#8E8E93] block">Cash On Hand</span>
              <span class="text-2xl font-bold text-white tracking-tight mt-1 block">
                {{ formatCurrency(walletStore.wallet?.cash_on_hand ?? 0) }}
              </span>
            </div>
            <button
              type="button"
              @click="openSetBalanceModal('cash')"
              class="text-xs text-[#FF8A65] hover:underline px-2 py-1 bg-[#111418] rounded-lg min-h-[32px] cursor-pointer"
            >
              Set Balance
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="openTransactionModal('cash', 'in')"
              class="bg-[rgba(105,219,124,0.15)] text-[#69db7c] text-xs font-bold py-2.5 rounded-xl min-h-[44px] hover:bg-[rgba(105,219,124,0.25)] transition-all cursor-pointer"
            >+ Money In</button>
            <button
              @click="openTransactionModal('cash', 'out')"
              class="bg-[rgba(255,107,107,0.15)] text-[#ff6b6b] text-xs font-bold py-2.5 rounded-xl min-h-[44px] hover:bg-[rgba(255,107,107,0.25)] transition-all cursor-pointer"
            >- Money Out</button>
          </div>
        </div>

        <!-- Bank -->
        <div class="bg-[#2A2D34] rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] flex flex-col justify-between space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-[#8E8E93] block">Bank Account</span>
              <span class="text-2xl font-bold text-white tracking-tight mt-1 block">
                {{ formatCurrency(walletStore.wallet?.cash_on_bank ?? 0) }}
              </span>
            </div>
            <button
              type="button"
              @click="openSetBalanceModal('bank')"
              class="text-xs text-[#FF8A65] hover:underline px-2 py-1 bg-[#111418] rounded-lg min-h-[32px] cursor-pointer"
            >
              Set Balance
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="openTransactionModal('bank', 'in')"
              class="bg-[rgba(105,219,124,0.15)] text-[#69db7c] text-xs font-bold py-2.5 rounded-xl min-h-[44px] hover:bg-[rgba(105,219,124,0.25)] transition-all cursor-pointer"
            >+ Deposit</button>
            <button
              @click="openTransactionModal('bank', 'out')"
              class="bg-[rgba(255,107,107,0.15)] text-[#ff6b6b] text-xs font-bold py-2.5 rounded-xl min-h-[44px] hover:bg-[rgba(255,107,107,0.25)] transition-all cursor-pointer"
            >- Withdraw</button>
          </div>
        </div>
      </section>

      <!-- Monthly stats -->
      <section class="bg-[#2A2D34] rounded-2xl p-4 border border-[rgba(255,255,255,0.08)] space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">This Month Dashboard</h2>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-[#111418] p-2 rounded-xl">
            <span class="text-[10px] uppercase block text-[#8E8E93]">Total In</span>
            <span class="text-sm font-bold text-[#69db7c] truncate block">{{ formatCurrency(quickStats.moneyIn) }}</span>
          </div>
          <div class="bg-[#111418] p-2 rounded-xl">
            <span class="text-[10px] uppercase block text-[#8E8E93]">Total Out</span>
            <span class="text-sm font-bold text-[#ff6b6b] truncate block">{{ formatCurrency(quickStats.moneyOut) }}</span>
          </div>
          <div class="bg-[#111418] p-2 rounded-xl">
            <span class="text-[10px] uppercase block text-[#8E8E93]">Net Flow</span>
            <span
              class="text-sm font-bold truncate block"
              :class="quickStats.netFlow >= 0 ? 'text-[#69db7c]' : 'text-[#ff6b6b]'"
            >
              {{ quickStats.netFlow > 0 ? '+' : '' }}{{ formatCurrency(quickStats.netFlow) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Ledger -->
      <section class="space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <h2 class="text-sm font-bold uppercase tracking-wider text-[#8E8E93]">Ledger Transaction Log</h2>
          <div class="flex bg-[#2A2D34] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] self-start sm:self-auto">
            <button
              v-for="tab in (['all', 'cash', 'bank'] as const)"
              :key="tab"
              @click="activeTab = tab"
              class="text-xs px-3 py-1 capitalize rounded-lg font-medium transition-all min-h-[32px] cursor-pointer"
              :class="activeTab === tab ? 'bg-[#FF8A65] text-[#111418] font-bold' : 'text-[#8E8E93]'"
            >
              {{ tab }}
            </button>
          </div>
        </div>

        <div
          v-if="filteredTransactions.length === 0"
          class="text-center py-12 bg-[#2A2D34] rounded-2xl border border-[rgba(255,255,255,0.08)]"
        >
          <span class="text-4xl block mb-2">📦</span>
          <p class="text-sm text-[#8E8E93]">No transactions logged under this filter</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="(items, dateGroup) in groupedTransactions" :key="dateGroup" class="space-y-1.5">
            <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-widest px-1 pt-1">
              {{ formatDateGroupHeader(String(dateGroup)) }}
            </h3>
            <div class="bg-[#2A2D34] rounded-2xl border border-[rgba(255,255,255,0.08)] divide-y divide-[rgba(255,255,255,0.05)] overflow-hidden">
              <div
                v-for="tx in items"
                :key="tx.id"
                class="flex items-center justify-between p-3.5"
              >
                <div class="flex items-center space-x-3 min-w-0 flex-1">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    :class="isIncomeType(tx.type) ? 'bg-[rgba(105,219,124,0.15)] text-[#69db7c]' : 'bg-[rgba(255,107,107,0.15)] text-[#ff6b6b]'"
                  >
                    {{ isIncomeType(tx.type) ? '▲' : '▼' }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-white text-sm truncate leading-snug">
                      {{ tx.description || tx.category }}
                    </p>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                      <span class="text-[10px] font-bold uppercase tracking-wider bg-[#111418] px-2 py-0.5 rounded border border-[rgba(255,255,255,0.05)] text-[#8E8E93]">
                        {{ tx.source }}
                      </span>
                      <span class="text-xs text-[#8E8E93]">&middot; {{ tx.category }}</span>
                    </div>
                  </div>
                </div>
                <div
                  class="text-right ml-2 shrink-0 font-bold text-base"
                  :class="isIncomeType(tx.type) ? 'text-[#69db7c]' : 'text-white'"
                >
                  {{ isIncomeType(tx.type) ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- Log Transaction Modal -->
    <div
      v-if="isTransactionModalOpen"
      class="fixed inset-0 bg-[#111418]/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
    >
      <div class="bg-[#2A2D34] w-full sm:max-w-md h-full sm:h-auto rounded-t-2xl sm:rounded-2xl border border-[rgba(255,255,255,0.08)] p-6 space-y-5 overflow-y-auto flex flex-col justify-between sm:justify-start">
        <div class="space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.05)]">
            <div>
              <h3 class="text-lg font-bold text-white">Log Transaction</h3>
              <p class="text-xs text-[#8E8E93]">
                Targeting <span class="capitalize text-[#FF8A65] font-semibold">{{ txSource }}</span> Ledger &middot;
                <span class="capitalize text-white">{{ isIncomeType(txType) ? 'Inflow' : 'Outflow' }}</span>
              </p>
            </div>
            <button @click="isTransactionModalOpen = false" class="text-[#8E8E93] hover:text-white text-xl p-2 cursor-pointer">&times;</button>
          </div>

          <div class="space-y-3">
            <div class="relative flex items-center border border-[rgba(255,255,255,0.08)] bg-[#111418] rounded-xl px-3 min-h-[44px]">
              <span class="text-base font-semibold text-[#8E8E93] mr-1">₱</span>
              <input
                type="number"
                pattern="[0-9]*"
                inputmode="decimal"
                v-model="txAmount"
                placeholder="0.00"
                class="w-full bg-transparent text-white focus:outline-none text-sm font-bold"
              />
            </div>

            <div class="flex flex-col space-y-1">
              <label class="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">Category</label>
              <select
                v-model="txCategory"
                class="bg-[#111418] text-white border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[44px] block w-full"
              >
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <div class="flex flex-col space-y-1">
              <label class="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">Date</label>
              <input
                type="date"
                v-model="txDate"
                class="bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none min-h-[44px] block w-full"
              />
            </div>

            <div class="flex flex-col space-y-1">
              <label class="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">Description</label>
              <input
                type="text"
                v-model="txDescription"
                placeholder="Optional notes..."
                class="w-full bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-4 sm:pt-2">
          <button
            type="button"
            @click="isTransactionModalOpen = false"
            class="bg-[#111418] text-[#8E8E93] font-bold py-3 rounded-xl min-h-[44px] hover:bg-black/40 transition-all cursor-pointer"
          >Cancel</button>
          <button
            type="button"
            @click="handleLogTransaction"
            :disabled="!txAmount || parseFloat(txAmount) <= 0"
            class="bg-[#FF8A65] text-[#111418] font-bold py-3 rounded-xl min-h-[44px] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >Confirm</button>
        </div>
      </div>
    </div>

    <!-- Set Balance Modal -->
    <div
      v-if="isSetBalanceModalOpen"
      class="fixed inset-0 bg-[#111418]/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
    >
      <div class="bg-[#2A2D34] w-full sm:max-w-md h-full sm:h-auto rounded-t-2xl sm:rounded-2xl border border-[rgba(255,255,255,0.08)] p-6 space-y-5 overflow-y-auto flex flex-col justify-between sm:justify-start">
        <div class="space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.05)]">
            <div>
              <h3 class="text-lg font-bold text-white">Adjust Baseline Balance</h3>
              <p class="text-xs text-[#8E8E93]">Target: <span class="capitalize text-[#FF8A65] font-semibold">{{ targetBalanceSource }}</span> Channel</p>
            </div>
            <button @click="isSetBalanceModalOpen = false" class="text-[#8E8E93] hover:text-white text-xl p-2 cursor-pointer">&times;</button>
          </div>

          <div class="bg-[rgba(255,138,101,0.1)] border border-[rgba(255,138,101,0.2)] rounded-xl p-3 flex items-start space-x-2.5">
            <span class="text-base">⚠️</span>
            <p class="text-xs text-[#FF8A65] leading-normal">
              <strong>Warning:</strong> This will directly override your recorded balance. Ledger transactions will not be modified.
            </p>
          </div>

          <div class="relative flex items-center border border-[rgba(255,255,255,0.08)] bg-[#111418] rounded-xl px-3 min-h-[44px]">
            <span class="text-base font-semibold text-[#8E8E93] mr-1">₱</span>
            <input
              type="number"
              pattern="[0-9]*"
              inputmode="decimal"
              v-model="overrideAmount"
              placeholder="0.00"
              class="w-full bg-transparent text-white focus:outline-none text-sm font-bold"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-4 sm:pt-2">
          <button
            type="button"
            @click="isSetBalanceModalOpen = false"
            class="bg-[#111418] text-[#8E8E93] font-bold py-3 rounded-xl min-h-[44px] cursor-pointer"
          >Cancel</button>
          <button
            type="button"
            @click="handleSetBalance"
            :disabled="!overrideAmount || parseFloat(overrideAmount) < 0"
            class="bg-[#FF8A65] text-[#111418] font-bold py-3 rounded-xl min-h-[44px] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >Set Balance</button>
        </div>
      </div>
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
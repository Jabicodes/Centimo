import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export type TransactionType = 'cash_in' | 'cash_out' | 'bank_in' | 'bank_out'
export type SourceType = 'cash' | 'bank'

export interface WalletBalance {
  id?: string
  user_id: string
  cash_on_hand: number
  cash_on_bank: number
  created_at?: string
  updated_at?: string
}

export interface WalletTransaction {
  id: string
  created_at: string
  user_id: string
  type: TransactionType
  source: SourceType
  amount: number
  description: string | null
  category: string
  date: string
}

export const useWalletStore = defineStore('wallet', () => {
  const wallet = ref<WalletBalance | null>(null)
  const transactions = ref<WalletTransaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const totalBalance = computed(() =>
    (wallet.value?.cash_on_hand ?? 0) + (wallet.value?.cash_on_bank ?? 0),
  )

  const cashTransactions = computed(() =>
    transactions.value.filter((t) => t.source === 'cash'),
  )

  const bankTransactions = computed(() =>
    transactions.value.filter((t) => t.source === 'bank'),
  )

  const totalMoneyInThisMonth = computed(() => {
    const now = new Date()
    return transactions.value
      .filter((t) => {
        const d = new Date(t.date)
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          (t.type === 'cash_in' || t.type === 'bank_in')
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
  })

  const totalMoneyOutThisMonth = computed(() => {
    const now = new Date()
    return transactions.value
      .filter((t) => {
        const d = new Date(t.date)
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          (t.type === 'cash_out' || t.type === 'bank_out')
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
  })

  const netFlowThisMonth = computed(
    () => totalMoneyInThisMonth.value - totalMoneyOutThisMonth.value,
  )

  // ── Actions ────────────────────────────────────────────────────────────────

  async function fetchWallet() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('wallet')
        .select('*')
        .maybeSingle()
      if (err) throw err
      wallet.value = data as WalletBalance
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load wallet'
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactions() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (err) throw err
      transactions.value = data as WalletTransaction[]
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load transactions'
    } finally {
      loading.value = false
    }
  }

  async function logTransaction(payload: {
    type: TransactionType
    source: SourceType
    amount: number
    description: string | null
    category: string
    date: string
  }) {
    loading.value = true
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('User session not found.')
      const { error: err } = await supabase
        .from('wallet_transactions')
        .insert([{ ...payload, user_id: userId }])
      if (err) throw err
      await Promise.all([fetchWallet(), fetchTransactions()])
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to log transaction'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function setBalance(cashOnHand: number, cashOnBank: number) {
    loading.value = true
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('User session not found.')
      const { error: err } = await supabase
        .from('wallet')
        .upsert(
          { user_id: userId, cash_on_hand: cashOnHand, cash_on_bank: cashOnBank, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      if (err) throw err
      await fetchWallet()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update balance'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    wallet,
    transactions,
    loading,
    error,
    totalBalance,
    cashTransactions,
    bankTransactions,
    totalMoneyInThisMonth,
    totalMoneyOutThisMonth,
    netFlowThisMonth,
    fetchWallet,
    fetchTransactions,
    logTransaction,
    setBalance,
  }
})
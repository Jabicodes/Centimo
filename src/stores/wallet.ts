import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useWalletStore = defineStore('wallet', () => {
  const cashOnHand = ref(0)
  const cashOnBank = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('wallet')
        .select('cash_on_hand, cash_on_bank')
        .maybeSingle()
      if (err) throw err
      cashOnHand.value = Number(data?.cash_on_hand ?? 0)
      cashOnBank.value = Number(data?.cash_on_bank ?? 0)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load wallet'
    } finally {
      loading.value = false
    }
  }

  return { cashOnHand, cashOnBank, loading, error, fetchData }
})
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface IncomeRecord {
  id: string
  source: string
  amount: number
  frequency: string
  monthly_equivalent: number
  date: string
  notes: string | null
}

export const useIncomeStore = defineStore('income', () => {
  const incomeRecords = ref<IncomeRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalMonthlyIncome = computed(() =>
    incomeRecords.value.reduce((sum, r) => sum + Number(r.monthly_equivalent), 0),
  )

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('income')
        .select('id, source, amount, frequency, monthly_equivalent, date, notes')
        .order('date', { ascending: false })
      if (err) throw err
      incomeRecords.value = data ?? []
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load income'
    } finally {
      loading.value = false
    }
  }

  return { incomeRecords, loading, error, totalMonthlyIncome, fetchData }
})
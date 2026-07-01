import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export type IncomeFrequency = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'annual'

export interface IncomeRecord {
  id: string
  created_at: string
  source: string
  amount: number
  frequency: IncomeFrequency
  monthly_equivalent: number
  notes: string | null
  date: string
  user_id: string
}

export interface GeneralNote {
  id: string
  updated_at: string
  content: string
  user_id: string
}

export const useIncomeStore = defineStore('income', () => {
  const incomeRecords = ref<IncomeRecord[]>([])
  const generalNote = ref<GeneralNote | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  }

  function calculateMonthlyEquivalent(amount: number, frequency: IncomeFrequency): number {
    switch (frequency) {
      case 'weekly':   return amount * 4.3
      case 'biweekly': return amount * 2
      case 'annual':   return amount / 12
      default:         return amount
    }
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const totalMonthlyIncome = computed(() =>
    incomeRecords.value.reduce((sum, item) => sum + item.monthly_equivalent, 0),
  )

  const incomeByFrequency = computed(() => {
    const groups: Record<IncomeFrequency, IncomeRecord[]> = {
      once: [], weekly: [], biweekly: [], monthly: [], annual: [],
    }
    incomeRecords.value.forEach((record) => {
      groups[record.frequency].push(record)
    })
    return groups
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  async function fetchIncome() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('income')
        .select('*')
        .order('monthly_equivalent', { ascending: false })
      if (err) throw err
      incomeRecords.value = data as IncomeRecord[]
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load income'
    } finally {
      loading.value = false
    }
  }

  async function addIncome(
    record: Omit<IncomeRecord, 'id' | 'created_at' | 'monthly_equivalent' | 'user_id'>,
  ) {
    loading.value = true
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('User session not found.')
      const monthly_equivalent = calculateMonthlyEquivalent(record.amount, record.frequency)
      const { error: err } = await supabase
        .from('income')
        .insert([{ ...record, monthly_equivalent, user_id: userId }])
      if (err) throw err
      await fetchIncome()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to add income'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteIncome(id: string) {
    loading.value = true
    try {
      const { error: err } = await supabase.from('income').delete().eq('id', id)
      if (err) throw err
      await fetchIncome()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete income'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateIncomeNote(id: string, notes: string | null) {
    try {
      const { error: err } = await supabase
        .from('income')
        .update({ notes: notes?.trim() || null })
        .eq('id', id)
      if (err) throw err
      const index = incomeRecords.value.findIndex((item) => item.id === id)
      if (index !== -1) incomeRecords.value[index].notes = notes
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update note'
      throw err
    }
  }

  async function fetchGeneralNote() {
    try {
      const { data, error: err } = await supabase
        .from('income_notes')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (err) throw err
      generalNote.value = data as GeneralNote
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load note'
    }
  }

  async function saveGeneralNote(content: string) {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('User session not found.')
      const payload = { content, user_id: userId, updated_at: new Date().toISOString() }

      if (generalNote.value?.id) {
        const { error: err } = await supabase
          .from('income_notes')
          .update(payload)
          .eq('id', generalNote.value.id)
        if (err) throw err
        generalNote.value.updated_at = payload.updated_at
      } else {
        const { data, error: err } = await supabase
          .from('income_notes')
          .insert([payload])
          .select()
          .single()
        if (err) throw err
        generalNote.value = data as GeneralNote
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to save note'
      throw err
    }
  }

  return {
    incomeRecords,
    generalNote,
    loading,
    error,
    totalMonthlyIncome,
    incomeByFrequency,
    calculateMonthlyEquivalent,
    fetchIncome,
    addIncome,
    deleteIncome,
    updateIncomeNote,
    fetchGeneralNote,
    saveGeneralNote,
  }
})
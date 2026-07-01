import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface Category {
  id: string
  name: string
  icon: string
  color?: string
  budget_limit?: number
}

export interface Expense {
  id: string
  created_at: string
  amount: number
  category_id: string | null
  description: string | null
  date: string
  is_recurring: boolean
  recurring_frequency: 'weekly' | 'monthly' | 'annual' | null
  user_id: string
  categories?: Category
}

export const useExpensesStore = defineStore('expenses', () => {
  const expenses = ref<Expense[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Computed ───────────────────────────────────────────────────────────────

  const totalMonthlyExpenses = computed(() => {
    const now = new Date()
    return expenses.value
      .filter((e) => {
        const d = new Date(e.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)
  })

  const expensesByCategory = computed(() => {
    const now = new Date()
    const monthly = expenses.value.filter((e) => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    return categories.value.map((cat) => {
      const spent = monthly
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + Number(e.amount), 0)
      return {
        ...cat,
        spent,
        budget_limit: Number(cat.budget_limit ?? 0),
      }
    })
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function fetchExpenses() {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('expenses')
        .select(`*, categories:category_id (id, name, icon)`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (err) throw err
      expenses.value = data as Expense[]
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load expenses'
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      if (err) throw err
      categories.value = data as Category[]
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load categories'
    }
  }

  async function addExpense(expenseData: Omit<Expense, 'id' | 'created_at' | 'user_id' | 'categories'>) {
    loading.value = true
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('User session not found.')
      const { error: err } = await supabase
        .from('expenses')
        .insert([{ ...expenseData, user_id: userId }])
      if (err) throw err
      await fetchExpenses()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to add expense'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteExpense(id: string) {
    loading.value = true
    try {
      const { error: err } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      if (err) throw err
      await fetchExpenses()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete expense'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    expenses,
    categories,
    loading,
    error,
    totalMonthlyExpenses,
    expensesByCategory,
    fetchExpenses,
    fetchCategories,
    addExpense,
    deleteExpense,
  }
})
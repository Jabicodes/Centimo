import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; username: string } | null>(null)
  const session = ref<Session | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  function buildEmail(username: string): string {
    return `${username}@centimo.com`
  }

  function extractUsername(email: string): string {
    return email.split('@')[0]
  }

  async function login(username: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: buildEmail(username),
        password,
      })
      if (err) throw err
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      isLoading.value = false
    }
  }

  async function signUp(username: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signUp({
        email: buildEmail(username),
        password,
      })
      if (err) throw err
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Sign up failed'
      isLoading.value = false
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
    error.value = null
  }

  function initializeAuth() {
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      if (newSession?.user) {
        user.value = {
          id: newSession.user.id,
          username: extractUsername(newSession.user.email ?? ''),
        }
      } else {
        user.value = null
      }
      isLoading.value = false
    })
  }

  return { user, session, isLoading, error, login, signUp, logout, initializeAuth }
})
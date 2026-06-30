<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const isLogin = ref(true)
const username = ref('')
const password = ref('')

async function handleSubmit() {
  if (isLogin.value) {
    await authStore.login(username.value, password.value)
  } else {
    await authStore.signUp(username.value, password.value)
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  authStore.error = null
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background: #111418">
    <div
      class="w-full max-w-[400px] rounded-2xl p-8 space-y-6"
      style="background: #2A2D34; border: 1px solid rgba(255,255,255,0.08)"
    >
      <!-- Brand Emblem -->
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center"
          style="background: #FF8A65"
        >
          <span class="text-white text-2xl font-bold select-none">₱</span>
        </div>
        <div class="text-center">
          <h1 class="text-white text-2xl font-bold tracking-tight">Centimo</h1>
          <p class="text-sm mt-1" style="color: #8E8E93">Clean. Calm. Consistent.</p>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <input
          v-model="username"
          type="text"
          placeholder="Username"
          autocomplete="username"
          required
          class="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition focus:ring-2 focus:ring-[#FF8A65]"
          style="background: #111418; border: 1px solid rgba(255,255,255,0.08)"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          required
          class="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition focus:ring-2 focus:ring-[#FF8A65]"
          style="background: #111418; border: 1px solid rgba(255,255,255,0.08)"
        />

        <p v-if="authStore.error" class="text-red-400 text-xs text-center pt-1">
          {{ authStore.error }}
        </p>

        <button
          type="submit"
          :disabled="authStore.isLoading"
          class="w-full py-3 rounded-xl text-white font-semibold text-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          style="background: #FF8A65"
        >
          {{ authStore.isLoading ? 'Please wait…' : isLogin ? 'Login' : 'Sign Up' }}
        </button>
      </form>

      <!-- Toggle -->
      <p class="text-center text-sm" style="color: #8E8E93">
        {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
        <button
          type="button"
          @click="toggleMode"
          class="font-semibold ml-1 transition hover:opacity-80 cursor-pointer"
          style="color: #FF8A65"
        >
          {{ isLogin ? 'Sign Up' : 'Login' }}
        </button>
      </p>
    </div>
  </div>
</template>
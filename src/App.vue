<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AuthView from './views/AuthView.vue'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initializeAuth()
})
</script>

<template>
  <div class="min-h-screen" style="background: #111418">
    <!-- Resolving session -->
    <div
      v-if="authStore.isLoading"
      class="min-h-screen flex items-center justify-center"
    >
      <span class="text-sm" style="color: #8E8E93">Loading…</span>
    </div>

    <!-- Unauthenticated -->
    <AuthView v-else-if="!authStore.user" />

    <!-- Authenticated placeholder workspace -->
    <div
      v-else
      class="min-h-screen flex flex-col items-center justify-center gap-6"
    >
      <h1 class="text-white text-2xl font-bold tracking-tight">
        Welcome, {{ authStore.user.username }}!
      </h1>
      <button
        @click="authStore.logout()"
        class="px-6 py-2 rounded-xl text-white font-semibold text-sm transition active:scale-95 cursor-pointer"
        style="background: #FF8A65"
      >
        Sign Out
      </button>
    </div>
  </div>
</template>
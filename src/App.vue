<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AuthView from './views/AuthView.vue'
import AppLayout from './components/layout/AppLayout.vue'

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
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center"
          style="background: #FF8A65"
        >
          <span class="text-white font-bold text-lg leading-none">₱</span>
        </div>
        <span class="text-sm" style="color: #8E8E93">Loading…</span>
      </div>
    </div>

    <!-- Unauthenticated -->
    <AuthView v-else-if="!authStore.user" />

    <!-- Authenticated -->
    <AppLayout v-else />
  </div>
</template>
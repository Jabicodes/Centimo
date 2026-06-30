<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

interface NavItem {
  path: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { path: '/overview', label: 'Overview', icon: 'overview' },
  { path: '/expenses', label: 'Expenses', icon: 'expenses' },
  { path: '/income', label: 'Income', icon: 'income' },
  { path: '/wallet', label: 'Wallet', icon: 'wallet' },
  { path: '/investments', label: 'Investments', icon: 'investments' },
]

const iconMap: Record<string, string> = {
  overview: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  expenses: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4"/><path d="M4 12l8-8 8 8"/></svg>`,
  income: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16"/><path d="M20 12l-8 8-8-8"/></svg>`,
  wallet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  investments: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
}

function isActive(path: string): boolean {
  return route.path === path
}

function navigate(path: string): void {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="flex min-h-screen" style="background: #111418;">

    <!-- ===== DESKTOP SIDEBAR ===== -->
    <aside
      class="hidden md:flex flex-col fixed top-0 left-0 h-screen"
      style="width: 240px; background: #111418; border-right: 1px solid rgba(255,255,255,0.08); z-index: 50;"
    >
      <!-- Brand -->
      <div class="flex items-center gap-3 px-5 pt-6 pb-5">
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style="background: #FF8A65;"
        >
          <span class="text-white font-bold text-base leading-none">₱</span>
        </div>
        <span class="font-bold text-lg tracking-tight text-white">Centimo</span>
      </div>

      <!-- Nav list -->
      <nav class="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigate(item.path)"
          class="nav-desktop-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer text-left"
          :class="isActive(item.path) ? 'nav-active' : 'nav-inactive'"
        >
          <span
            class="w-5 h-5 flex-shrink-0 flex items-center justify-center"
            v-html="iconMap[item.icon]"
          />
          {{ item.label }}
        </button>
      </nav>

      <!-- Profile dock -->
      <div class="p-4" style="border-top: 1px solid rgba(255,255,255,0.08);">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style="background: #2A2D34;"
          >
            {{ (authStore.user?.username ?? '?').charAt(0).toUpperCase() }}
          </div>
          <span class="text-white text-sm font-medium truncate leading-tight">
            {{ authStore.user?.username }}
          </span>
        </div>
        <button
          @click="authStore.logout()"
          class="sign-out-btn w-full text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </aside>

    <!-- ===== MAIN CONTENT ===== -->
    <main class="flex-1 min-h-screen md:ml-60 pb-28 md:pb-0">
      <router-view />
    </main>

    <!-- ===== MOBILE BOTTOM PILL NAV ===== -->
    <div
      class="md:hidden fixed left-0 right-0 flex justify-center px-4"
      style="bottom: 16px; z-index: 999;"
    >
      <nav
        class="flex justify-around items-center py-3 px-3 w-full"
        style="
          max-width: 420px;
          background: rgba(17, 20, 24, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
        "
      >
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigate(item.path)"
          class="mobile-nav-btn flex items-center justify-center p-2.5 rounded-xl cursor-pointer"
          :style="isActive(item.path) ? 'color: #FF8A65;' : 'color: #8E8E93;'"
        >
          <span
            class="w-5 h-5 flex items-center justify-center"
            v-html="iconMap[item.icon]"
          />
        </button>
      </nav>
    </div>

  </div>
</template>

<style scoped>
.nav-active {
  background: rgba(255, 138, 101, 0.12);
  color: #FF8A65;
}

.nav-inactive {
  color: #8E8E93;
}

.nav-inactive:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #ffffff;
}

.sign-out-btn {
  color: #8E8E93;
}

.sign-out-btn:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.08);
}

.mobile-nav-btn {
  transition: transform 100ms ease, color 150ms ease;
}

.mobile-nav-btn:active {
  transform: scale(0.95);
}
</style>
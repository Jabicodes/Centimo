import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/overview' },
    { path: '/overview', component: () => import('../views/OverviewView.vue') },
    { path: '/expenses', component: () => import('../views/ExpensesView.vue') },
    { path: '/income', component: () => import('../views/IncomeView.vue') },
    { path: '/wallet', component: () => import('../views/WalletView.vue') },
    { path: '/investments', component: () => import('../views/InvestmentsView.vue') },
  ],
})

router.beforeEach(() => {
  const authStore = useAuthStore()
  if (!authStore.isLoading && !authStore.user) {
    return false
  }
})

export default router
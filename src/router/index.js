import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import VoteView from '../views/VoteView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminLoginView from '../views/AdminLoginView.vue'
import { useAuthStore } from '../stores/auth'
import { useAdminAuthStore } from '../stores/adminAuth'

const routes = [
  { path: '/', redirect: '/login' },

  // Voter login + voting
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/vote',
    name: 'vote',
    component: VoteView,
    meta: { requiresVoter: true },
  },

  // Admin login + dashboard
  { path: '/admin-login', name: 'admin-login', component: AdminLoginView },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard,
    meta: { requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const adminAuth = useAdminAuthStore()

  // voter-protected routes
  if (to.meta.requiresVoter && !authStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  // admin-protected routes
  if (to.meta.requiresAdmin && !adminAuth.isAuthenticated) {
    return next({ name: 'admin-login' })
  }

  // prevent logged-in voter from going back to /login
  if (to.name === 'login' && authStore.isAuthenticated) {
    return next({ name: 'vote' })
  }

  // prevent logged-in admin from going back to /admin-login
  if (to.name === 'admin-login' && adminAuth.isAuthenticated) {
    return next({ name: 'admin' })
  }

  next()
})

export default router

<script setup>
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useAdminAuthStore } from './stores/adminAuth'

const authStore = useAuthStore()
const adminAuth = useAdminAuthStore()
const router = useRouter()

// voter logout
const handleVoterLogout = () => {
  authStore.logout()
  router.push('/login')
}

// admin logout
const handleAdminLogout = () => {
  adminAuth.logout()
  router.push('/admin-login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <!-- Left -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-slate-800">DILG Voting System</span>
        <span
          class="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
        >
          Prototype
        </span>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-4">
        <!-- Navigation -->
        <nav class="flex items-center gap-2 text-xs">
          <!-- Voter nav -->
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/vote"
            class="px-3 py-1 rounded-lg border hover:bg-slate-100"
            active-class="border-slate-300 bg-slate-100"
          >
            Vote
          </RouterLink>

          <!-- Admin nav -->
          <RouterLink
            v-if="adminAuth.isAuthenticated"
            to="/admin"
            class="px-3 py-1 rounded-lg border hover:bg-slate-100"
            active-class="border-slate-300 bg-slate-100"
          >
            Admin
          </RouterLink>

          <!-- Show admin login link only if not logged in -->
          <RouterLink
            v-if="!authStore.isAuthenticated && !adminAuth.isAuthenticated"
            to="/admin-login"
            class="px-3 py-1 rounded-lg border hover:bg-slate-100 text-slate-600"
          >
            Admin Login
          </RouterLink>

          <!-- Show voter login if no one is logged in -->
          <RouterLink
            v-if="!authStore.isAuthenticated && !adminAuth.isAuthenticated"
            to="/login"
            class="px-3 py-1 rounded-lg border hover:bg-slate-100 text-slate-600"
          >
            Voter Login
          </RouterLink>
        </nav>

        <!-- Voter info -->
        <div v-if="authStore.isAuthenticated" class="text-xs text-slate-600">
          <div class="font-semibold">{{ authStore.voter?.name }}</div>
          <div class="text-[10px]">Voter ID: {{ authStore.voter?.voter_id }}</div>
        </div>

        <!-- Admin info -->
        <div v-if="adminAuth.isAuthenticated" class="text-xs text-slate-600">
          <div class="font-semibold">
            Admin: {{ adminAuth.admin?.full_name || adminAuth.admin?.username }}
          </div>
        </div>

        <!-- Logout Buttons -->
        <button
          v-if="authStore.isAuthenticated"
          @click="handleVoterLogout"
          class="text-xs rounded-lg border px-3 py-1 hover:bg-slate-100"
        >
          Logout
        </button>

        <button
          v-if="adminAuth.isAuthenticated"
          @click="handleAdminLogout"
          class="text-xs rounded-lg border px-3 py-1 hover:bg-slate-100"
        >
          Logout (Admin)
        </button>
      </div>
    </header>

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>

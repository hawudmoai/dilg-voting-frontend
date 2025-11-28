<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-slate-800"> DILG Voting System </span>
        <span
          class="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
        >
          Prototype
        </span>
      </div>

      <div class="flex items-center gap-4">
        <nav v-if="authStore.isAuthenticated" class="flex items-center gap-2 text-xs">
          <RouterLink
            to="/vote"
            class="px-3 py-1 rounded-lg border border-transparent hover:bg-slate-100"
            active-class="border-slate-300 bg-slate-100"
          >
            Vote
          </RouterLink>
          <RouterLink
            to="/admin"
            class="px-3 py-1 rounded-lg border border-transparent hover:bg-slate-100"
            active-class="border-slate-300 bg-slate-100"
          >
            Admin
          </RouterLink>
        </nav>

        <div v-if="authStore.isAuthenticated" class="text-xs text-slate-600">
          <div class="font-semibold">
            {{ authStore.voter?.name }}
          </div>
          <div class="text-[10px]">Voter ID: {{ authStore.voter?.voter_id }}</div>
        </div>

        <button
          v-if="authStore.isAuthenticated"
          @click="handleLogout"
          class="text-xs rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </header>

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>

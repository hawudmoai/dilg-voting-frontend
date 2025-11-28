<!-- src/views/LoginView.vue -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const voterId = ref('')
const pin = ref('')
const localError = ref('')
const localMessage = ref('')

const handleLogin = async () => {
  localError.value = ''
  localMessage.value = ''

  if (!voterId.value || !pin.value) {
    localError.value = 'Voter ID and PIN are required.'
    return
  }

  try {
    await authStore.login(voterId.value.trim(), pin.value.trim())
    localMessage.value = `Welcome, ${authStore.voter.name}. Redirecting...`
    router.push('/vote')
  } catch (error) {
    localError.value = authStore.error || 'Login failed.'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-md">
      <div class="mb-4 text-center">
        <h1 class="text-2xl font-bold text-slate-800">DILG Provincial Voting System</h1>
        <p class="text-xs text-slate-500 mt-1">
          Secure electronic voting prototype for provincial elections.
        </p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Voter ID</label>
          <input
            v-model="voterId"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. VOTER-0001"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">PIN</label>
          <input
            v-model="pin"
            type="password"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••"
          />
        </div>

        <button
          @click="handleLogin"
          :disabled="authStore.loading"
          class="w-full inline-flex justify-center items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          <span v-if="authStore.loading">Logging in...</span>
          <span v-else>Login</span>
        </button>

        <div class="min-h-[32px]">
          <p v-if="localMessage" class="text-xs text-emerald-600">
            {{ localMessage }}
          </p>
          <p v-if="localError" class="text-xs text-rose-600">
            {{ localError }}
          </p>
        </div>
      </div>

      <p class="text-[11px] text-slate-500 mt-3 text-center">
        For demo: use one of the voters you created in Django admin (e.g. VOTER-0001).
      </p>
    </div>
  </div>
</template>

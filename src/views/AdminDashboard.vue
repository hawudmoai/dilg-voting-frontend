<!-- src/views/AdminDashboard.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const loading = ref(false)
const error = ref('')

const stats = ref({
  totalPositions: 0,
  totalCandidates: 0,
  totalVotes: 0,
})

const tally = ref([])

const loadDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    // get positions, candidates, tally
    const [posRes, candRes, tallyRes] = await Promise.all([
      api.get('positions/'),
      api.get('candidates/'),
      api.get('tally/'),
    ])

    const positions = posRes.data || []
    const candidates = candRes.data || []
    const tallyData = tallyRes.data || []

    // compute total votes from tally
    let totalVotes = 0
    for (const pos of tallyData) {
      for (const c of pos.candidates) {
        totalVotes += c.votes
      }
    }

    stats.value.totalPositions = positions.length
    stats.value.totalCandidates = candidates.length
    stats.value.totalVotes = totalVotes

    tally.value = tallyData
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-800">Admin Dashboard</h2>
        <p class="text-xs text-slate-500">Overview of current election activity and live tally.</p>
      </div>

      <button
        @click="loadDashboard"
        :disabled="loading"
        class="text-xs rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-60"
      >
        {{ loading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <!-- Error -->
    <p v-if="error" class="text-sm text-rose-600">
      {{ error }}
    </p>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Positions</p>
        <p class="text-2xl font-semibold text-slate-800">
          {{ stats.totalPositions }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">
          Active positions configured for this election.
        </p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Candidates</p>
        <p class="text-2xl font-semibold text-slate-800">
          {{ stats.totalCandidates }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Total candidates across all positions.</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500 mb-1">Votes Cast</p>
        <p class="text-2xl font-semibold text-slate-800">
          {{ stats.totalVotes }}
        </p>
        <p class="text-[11px] text-slate-400 mt-1">Sum of all votes recorded so far.</p>
      </div>
    </div>

    <!-- Tally section -->
    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-slate-800">Live Tally by Position</h3>

      <div v-if="loading" class="text-sm text-slate-500">Loading tally...</div>

      <div v-else-if="tally.length === 0" class="text-xs text-slate-500">
        No tally data yet. Cast some votes to see results.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="position in tally"
          :key="position.position_id"
          class="bg-white rounded-2xl border border-slate-200 p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <div>
              <h4 class="text-sm font-semibold text-slate-800">
                {{ position.position }}
              </h4>
              <p class="text-[11px] text-slate-500">Level: {{ position.level || 'N/A' }}</p>
            </div>
          </div>

          <table class="w-full text-xs border-t border-slate-100 mt-2">
            <thead>
              <tr class="text-left text-slate-500">
                <th class="py-2 pr-2">Candidate</th>
                <th class="py-2 pr-2">Party</th>
                <th class="py-2 text-right">Votes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in position.candidates"
                :key="c.candidate_id"
                class="border-t border-slate-100"
              >
                <td class="py-1 pr-2 text-slate-800">
                  {{ c.full_name }}
                </td>
                <td class="py-1 pr-2 text-slate-500">
                  {{ c.party || '—' }}
                </td>
                <td class="py-1 text-right font-semibold">
                  {{ c.votes }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

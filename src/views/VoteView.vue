<!-- src/views/VoteView.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const positions = ref([])
const selectedPositionId = ref('')
const candidates = ref([])
const selectedCandidateId = ref('')

const loadingPositions = ref(false)
const loadingCandidates = ref(false)
const submitting = ref(false)
const message = ref('')
const error = ref('')

const loadPositions = async () => {
  try {
    loadingPositions.value = true
    const res = await api.get('positions/')
    positions.value = res.data
  } catch (error) {
    console.error(error)
    error.value = 'Failed to load positions.'
  } finally {
    loadingPositions.value = false
  }
}

const loadCandidates = async (positionId) => {
  if (!positionId) {
    candidates.value = []
    return
  }
  try {
    loadingCandidates.value = true
    const res = await api.get('candidates/', {
      params: { position: positionId },
    })
    candidates.value = res.data
  } catch (error) {
    console.error(error)
    error.value = 'Failed to load candidates.'
  } finally {
    loadingCandidates.value = false
  }
}

watch(selectedPositionId, (val) => {
  selectedCandidateId.value = ''
  message.value = ''
  if (val) loadCandidates(val)
  else candidates.value = []
})

const submitVote = async () => {
  if (!selectedPositionId.value || !selectedCandidateId.value) return

  error.value = ''
  message.value = ''
  submitting.value = true

  try {
    await api.post('vote/', {
      position_id: selectedPositionId.value,
      candidate_id: selectedCandidateId.value,
    })
    message.value = 'Your vote has been recorded. Thank you.'
  } catch (error) {
    console.error(error)
    if (error.response?.data?.error) {
      error.value = error.response.data.error
    } else {
      error.value = 'Failed to submit vote. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

onMounted(loadPositions)
</script>

<template>
  <div class="grid gap-6 md:grid-cols-[2fr,1.3fr]">
    <!-- Left: voting UI -->
    <section class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 class="text-lg font-semibold mb-1">Cast Your Vote</h2>
      <p class="text-xs text-slate-500 mb-4">
        Select a position, choose your preferred candidate, and submit your vote.
      </p>

      <!-- Step 1: Position -->
      <div class="mb-5">
        <h3 class="text-sm font-semibold text-slate-700">Step 1 · Select Position</h3>
        <p class="text-xs text-slate-500 mb-2">Positions available for this election cycle.</p>
        <select
          v-model="selectedPositionId"
          :disabled="loadingPositions"
          class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
        >
          <option value="">-- Choose a position --</option>
          <option v-for="p in positions" :key="p.id" :value="p.id">
            {{ p.name }}<span v-if="p.level"> · {{ p.level }}</span>
          </option>
        </select>
        <p v-if="loadingPositions" class="mt-1 text-xs text-slate-400">Loading positions...</p>
      </div>

      <!-- Step 2: Candidate -->
      <div class="mb-5" v-if="selectedPositionId">
        <h3 class="text-sm font-semibold text-slate-700">Step 2 · Choose Candidate</h3>
        <p class="text-xs text-slate-500 mb-2">
          Only one candidate can be selected for this position.
        </p>

        <div v-if="loadingCandidates" class="py-3 text-sm text-slate-500">
          Loading candidates...
        </div>

        <div v-else-if="candidates.length === 0" class="py-3 text-sm text-amber-600">
          No candidates found for this position.
        </div>

        <ul v-else class="space-y-2 mt-1">
          <li v-for="c in candidates" :key="c.id">
            <label
              class="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:border-blue-500 hover:bg-blue-50 cursor-pointer text-sm"
            >
              <input
                type="radio"
                name="candidate"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500"
                :value="c.id"
                v-model="selectedCandidateId"
              />
              <div>
                <p class="font-medium">
                  {{ c.full_name }}
                </p>
                <p class="text-xs text-slate-500">
                  <span v-if="c.party">{{ c.party }}</span>
                </p>
              </div>
            </label>
          </li>
        </ul>
      </div>

      <!-- Step 3: Submit -->
      <div class="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          You can only vote once per position. Double-check before submitting.
        </div>
        <button
          @click="submitVote"
          :disabled="!selectedPositionId || !selectedCandidateId || submitting"
          class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          <span v-if="submitting">Submitting...</span>
          <span v-else>Submit Vote</span>
        </button>
      </div>

      <div class="mt-3 space-y-1 min-h-[32px]">
        <p v-if="message" class="text-sm text-emerald-600">
          {{ message }}
        </p>
        <p v-if="error" class="text-sm text-rose-600">
          {{ error }}
        </p>
      </div>
    </section>

    <!-- Right: summary -->
    <aside class="space-y-4">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <h3 class="text-sm font-semibold mb-2">Ballot Summary</h3>
        <dl class="text-sm space-y-2">
          <div class="flex justify-between">
            <dt class="text-slate-500">Position</dt>
            <dd class="font-medium">
              {{
                positions.find((p) => p.id === Number(selectedPositionId))?.name || 'Not selected'
              }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Candidate</dt>
            <dd class="font-medium">
              {{
                candidates.find((c) => c.id === Number(selectedCandidateId))?.full_name ||
                'Not selected'
              }}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  </div>
</template>

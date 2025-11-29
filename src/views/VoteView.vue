<!-- src/views/VoteView.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'
import { useAuthStore } from '../stores/auth'
import ElectionStatusBar from '../components/ElectionStatusBar.vue'

const authStore = useAuthStore()

/* ---------------- STATE ---------------- */
const positions = ref([])
const candidates = ref([])
const votedPositions = ref([])

const selectedPosition = ref(null)
const selectedCandidate = ref(null)

const loadingPositions = ref(false)
const loadingCandidates = ref(false)
const submitting = ref(false)
const finishing = ref(false)

const error = ref('')
const message = ref('')
const electionOpen = ref(false)

const defaultAvatarBase = 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name='

/* ---------------- LOAD ELECTION STATUS ---------------- */
const loadElectionStatus = async () => {
  try {
    const res = await api.get('election-status/')
    electionOpen.value = res.data?.is_active || false
  } catch (err) {
    console.error(err)
    electionOpen.value = false
  }
}

/* ---------------- LOAD POSITIONS ---------------- */
const loadPositions = async () => {
  loadingPositions.value = true
  try {
    const res = await api.get('positions/')
    positions.value = res.data
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load positions'
  } finally {
    loadingPositions.value = false
  }
}

/* ---------------- LOAD MY VOTES ---------------- */
const loadMyVotes = async () => {
  try {
    const res = await api.get('my-votes/')
    votedPositions.value = res.data.map((v) => v.position_id)
  } catch (error) {
    console.error('Failed to load my votes')
  }
}

/* ---------------- LOAD CANDIDATES ---------------- */
const loadCandidates = async () => {
  if (!selectedPosition.value) {
    candidates.value = []
    return
  }

  loadingCandidates.value = true
  try {
    const res = await api.get('candidates/', {
      params: { position: selectedPosition.value.id },
    })
    candidates.value = res.data
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load candidates'
  } finally {
    loadingCandidates.value = false
  }
}

/* --- handle change of position --- */
const onPositionChange = () => {
  selectedCandidate.value = null
  loadCandidates()
}

/* ---------------- VOTE SUBMISSION ---------------- */
const submitVote = async () => {
  if (!selectedPosition.value || !selectedCandidate.value) return

  submitting.value = true
  error.value = ''
  message.value = ''

  try {
    await api.post('vote/', {
      position_id: selectedPosition.value.id,
      candidate_id: selectedCandidate.value.id,
    })

    message.value = 'Vote submitted successfully!'
    votedPositions.value.push(selectedPosition.value.id)

    selectedPosition.value = null
    selectedCandidate.value = null
    candidates.value = []
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.error || 'Failed to submit vote.'
  } finally {
    submitting.value = false
  }
}

/* ---------------- FINISH VOTING ---------------- */
const finishVoting = async () => {
  if (!confirm('Are you sure you are completely finished voting? You cannot log in again.')) {
    return
  }

  finishing.value = true
  error.value = ''
  message.value = ''

  try {
    await api.post('finish-voting/')
    message.value = 'Your voting session has been completed. Thank you!'

    // optional: redirect back to login
    setTimeout(() => {
      window.location.href = '/login'
    }, 1500)
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.error || 'Failed to finish voting.'
  } finally {
    finishing.value = false
  }
}

/* ---------------- COMPUTED ---------------- */
const hasVoted = computed(() => (posId) => votedPositions.value.includes(posId))

const canSubmit = computed(() => {
  if (!selectedPosition.value) return false
  if (!selectedCandidate.value) return false
  if (!electionOpen.value) return false
  if (hasVoted.value(selectedPosition.value.id)) return false
  if (submitting.value) return false
  return true
})

/* ---------------- MOUNT ---------------- */
onMounted(async () => {
  await Promise.all([loadElectionStatus(), loadPositions(), loadMyVotes()])
})
</script>

<template>
  <div class="px-3 py-4 sm:px-6 sm:py-6 max-w-6xl mx-auto">
    <!-- HEADER -->
    <div>
      <h2 class="text-xl font-semibold">Welcome, {{ authStore.voter?.name }}</h2>
      <p class="text-xs text-slate-500 mb-4">Voter ID: {{ authStore.voter?.voter_id }}</p>
    </div>

    <ElectionStatusBar class="mb-4" />

    <div class="grid gap-6 md:grid-cols-[2fr,1fr]">
      <!-- LEFT SIDE -->
      <section class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">Cast Your Vote</h3>
        <p class="text-xs text-slate-500 mb-4">Choose a position and select your candidate.</p>

        <!-- POSITION SELECT -->
        <div class="mb-5">
          <label class="text-sm font-medium text-slate-700">Position</label>

          <select
            v-model="selectedPosition"
            @change="onPositionChange"
            class="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option :value="null">-- Select Position --</option>
            <option v-for="p in positions" :key="p.id" :value="p" :disabled="hasVoted(p.id)">
              {{ p.name }} ({{ p.level }})
              <span v-if="hasVoted(p.id)"> — already voted</span>
            </option>
          </select>
        </div>

        <!-- CANDIDATE SELECT -->
        <div v-if="selectedPosition">
          <h4 class="text-sm font-medium text-slate-700 mb-2">
            Candidates for {{ selectedPosition.name }}
          </h4>

          <p
            v-if="hasVoted(selectedPosition.id)"
            class="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2"
          >
            You have already voted for this position.
          </p>

          <div v-else>
            <div v-if="loadingCandidates" class="text-sm text-slate-500 py-3">Loading...</div>

            <ul v-else class="space-y-2">
              <li
                v-for="c in candidates"
                :key="c.id"
                @click="selectedCandidate = c"
                class="cursor-pointer border border-slate-200 rounded-xl p-3 hover:border-blue-500 hover:bg-blue-50"
                :class="{ 'border-blue-600 bg-blue-50': selectedCandidate?.id === c.id }"
              >
                <div class="flex items-center gap-3">
                  <img
                    class="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover flex-shrink-0"
                    :src="c.photo_url || defaultAvatarBase + encodeURIComponent(c.full_name)"
                    :alt="c.full_name"
                  />
                  <div>
                    <p class="font-medium text-sm">
                      {{ c.full_name }}
                    </p>
                    <p class="text-[11px] text-slate-500">
                      {{ c.party || 'Independent / N/A' }}
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- ACTIONS -->
        <div
          class="mt-6 border-t pt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        >
          <p class="text-xs text-slate-500">You can only vote once per position.</p>

          <div class="flex gap-2 justify-end">
            <button
              @click="finishVoting"
              :disabled="finishing || votedPositions.length === 0"
              class="border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs sm:text-sm disabled:opacity-50"
            >
              {{ finishing ? 'Finishing…' : 'Finish Voting' }}
            </button>

            <button
              @click="submitVote"
              :disabled="!canSubmit"
              class="bg-blue-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-xs sm:text-sm"
            >
              {{ submitting ? 'Submitting...' : 'Submit Vote' }}
            </button>
          </div>
        </div>

        <!-- MESSAGES -->
        <div class="mt-3 min-h-[20px]">
          <p v-if="message" class="text-emerald-600 text-sm">{{ message }}</p>
          <p v-if="error" class="text-rose-600 text-sm">{{ error }}</p>
        </div>
      </section>

      <!-- RIGHT SIDE: SUMMARY -->
      <aside class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h3 class="text-sm font-semibold mb-3">Selection Summary</h3>

        <div v-if="!selectedPosition" class="text-xs text-slate-500">
          No position selected yet. Choose a position to see details here.
        </div>

        <div v-else>
          <p class="text-xs text-slate-500">Position:</p>
          <p class="text-sm font-semibold mb-3">
            {{ selectedPosition.name }}
          </p>

          <p class="text-xs text-slate-500 mb-1">Candidate:</p>

          <div v-if="!selectedCandidate" class="text-xs text-slate-500">
            No candidate selected yet.
          </div>

          <div v-else class="space-y-3">
            <div class="flex items-center gap-3">
              <div
                class="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center"
              >
                <img
                  v-if="selectedCandidate.photo_url"
                  :src="selectedCandidate.photo_url"
                  class="h-full w-full object-cover"
                  alt="Candidate avatar"
                />
                <span v-else class="text-[11px] font-semibold">
                  {{
                    selectedCandidate.full_name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                  }}
                </span>
              </div>

              <div>
                <p class="text-sm font-semibold">{{ selectedCandidate.full_name }}</p>
                <p class="text-xs text-slate-500">
                  {{ selectedCandidate.party || 'Independent' }}
                </p>
              </div>
            </div>

            <p class="text-xs text-slate-600 whitespace-pre-line">
              {{ selectedCandidate.bio || 'No bio provided.' }}
            </p>

            <div class="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <img
                v-if="selectedCandidate.photo_portrait_url"
                :src="selectedCandidate.photo_portrait_url"
                class="w-full h-48 md:h-56 lg:h-64 object-cover"
                alt="Candidate portrait"
              />
              <div
                v-else
                class="h-48 md:h-56 lg:h-64 w-full flex items-center justify-center text-[11px] text-slate-400"
              >
                No portrait photo
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

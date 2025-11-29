<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../api'
import { useAdminAuthStore } from '../stores/adminAuth'

const adminAuth = useAdminAuthStore()

const loading = ref(false)
const loadingTally = ref(false)
const endingElection = ref(false)
const error = ref('')

// all elections (active + ended)
const elections = ref([])

// id of election currently selected in the dashboard
const selectedElectionId = ref(null)

// per-position tally for the selected election
const tally = ref([])

/* ---------- Add-Election wizard state ---------- */
const showAddModal = ref(false)
const wizardStep = ref(1) // 1 = election, 2 = positions, 3 = candidates

// Step 1: election
const addSubmitting = ref(false)
const addError = ref('')
const newElection = ref({
  name: '',
  start_at: '',
  end_at: '',
  is_active: true,
})
const createdElectionId = ref(null) // ID from backend after Step 1

// Step 2: positions
const positionsForm = ref([{ name: '', level: '', seats: 1 }])
const positionsSubmitting = ref(false)
const positionsError = ref('')
const createdPositions = ref([]) // store positions returned from API

// Step 3: candidates
const candidatesForm = ref([
  { full_name: '', party: '', photo_url: '', photo_portrait_url: '', bio: '', position_id: null },
])
const candidatesSubmitting = ref(false)
const candidatesError = ref('')

/* ---------- Add-Voter modal state ---------- */
const showAddVoterModal = ref(false)
const voterSubmitting = ref(false)
const voterError = ref('')
const sections = ref([])

const newVoter = ref({
  name: '',
  section: null, // section id
  pin: '',
})

/* ---------- Computed helpers ---------- */

const selectedElection = computed(
  () => elections.value.find((e) => e.id === selectedElectionId.value) || null,
)

const hasAnyElection = computed(() => elections.value.length > 0)

const stats = computed(() => {
  if (!selectedElection.value) {
    return {
      totalPositions: 0,
      totalCandidates: 0,
      totalVotes: 0,
      turnoutPercent: 0,
    }
  }

  return {
    totalPositions: selectedElection.value.total_positions || 0,
    totalCandidates: selectedElection.value.total_candidates || 0,
    totalVotes: selectedElection.value.total_votes || 0,
    turnoutPercent: selectedElection.value.turnout_percent || 0,
  }
})

const authHeaders = computed(() => (adminAuth.token ? { 'X-Admin-Token': adminAuth.token } : {}))

/* ---------- API: load elections ---------- */

const loadElections = async () => {
  error.value = ''
  try {
    const res = await api.get('admin/elections/', {
      headers: authHeaders.value,
    })
    elections.value = res.data || []

    if (!elections.value.length) {
      selectedElectionId.value = null
      tally.value = []
      return
    }

    if (!selectedElectionId.value) {
      const active = elections.value.find((e) => e.is_active)
      selectedElectionId.value = active ? active.id : elections.value[0].id
    }
  } catch (err) {
    console.error(err)
    error.value =
      err.response?.data?.error || 'Failed to load elections. Please log in again as admin.'
    elections.value = []
    selectedElectionId.value = null
    tally.value = []
  }
}

/* ---------- API: load tally for selected election ---------- */

const loadTally = async () => {
  if (!selectedElectionId.value) {
    tally.value = []
    return
  }

  loadingTally.value = true
  error.value = ''

  try {
    const res = await api.get('admin/tally/', {
      headers: authHeaders.value,
      params: { election_id: selectedElectionId.value },
    })
    tally.value = res.data || []
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.error || 'Failed to load tally data.'
    tally.value = []
  } finally {
    loadingTally.value = false
  }
}

const reloadAll = async () => {
  loading.value = true
  await loadElections()
  await loadTally()
  loading.value = false
}

/* ---------- End election early ---------- */

const endElectionNow = async () => {
  if (!selectedElection.value || !selectedElection.value.is_active) return

  const confirmEnd = window.confirm(
    `Are you sure you want to end "${selectedElection.value.name}" now?\n\n` +
      'Voters will no longer be able to cast votes once the election is ended.',
  )
  if (!confirmEnd) return

  endingElection.value = true
  error.value = ''

  try {
    await api.post(
      'admin/end-election/',
      {},
      {
        headers: authHeaders.value,
      },
    )

    await reloadAll()
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.error || 'Failed to end election.'
  } finally {
    endingElection.value = false
  }
}

/* ---------- Wizard helpers ---------- */

const resetWizardState = () => {
  wizardStep.value = 1
  addError.value = ''
  positionsError.value = ''
  candidatesError.value = ''
  addSubmitting.value = false
  positionsSubmitting.value = false
  candidatesSubmitting.value = false

  newElection.value = {
    name: '',
    start_at: '',
    end_at: '',
    is_active: true,
  }

  createdElectionId.value = null
  positionsForm.value = [{ name: '', level: '', seats: 1 }]
  createdPositions.value = []
  candidatesForm.value = [
    { full_name: '', party: '', photo_url: '', photo_portrait_url: '', bio: '', position_id: null },
  ]
}

const openAddModal = () => {
  resetWizardState()
  showAddModal.value = true
}

const closeAddModal = () => {
  if (addSubmitting.value || positionsSubmitting.value || candidatesSubmitting.value) return
  showAddModal.value = false
  resetWizardState()
}

/* ---------- Wizard: Step 1 – Election ---------- */

const submitElectionStep = async () => {
  if (!newElection.value.name || !newElection.value.start_at || !newElection.value.end_at) {
    addError.value = 'Please fill in name, start and end date/time.'
    return
  }

  addSubmitting.value = true
  addError.value = ''

  try {
    let res
    if (!createdElectionId.value) {
      // Create
      res = await api.post(
        'admin/elections/',
        {
          name: newElection.value.name,
          start_at: newElection.value.start_at,
          end_at: newElection.value.end_at,
          is_active: newElection.value.is_active,
        },
        { headers: authHeaders.value },
      )
      createdElectionId.value = res.data?.id
    } else {
      // Update if they went back and changed something
      res = await api.patch(
        `admin/elections/${createdElectionId.value}/`,
        {
          name: newElection.value.name,
          start_at: newElection.value.start_at,
          end_at: newElection.value.end_at,
          is_active: newElection.value.is_active,
        },
        { headers: authHeaders.value },
      )
    }

    if (!createdElectionId.value) {
      throw new Error('Election ID missing from response.')
    }

    wizardStep.value = 2
  } catch (err) {
    console.error(err)
    addError.value = err.response?.data?.error || 'Failed to save election.'
  } finally {
    addSubmitting.value = false
  }
}

/* ---------- Wizard: Step 2 – Positions ---------- */

const addPositionRow = () => {
  positionsForm.value.push({ name: '', level: '', seats: 1 })
}

const removePositionRow = (idx) => {
  if (positionsForm.value.length === 1) return
  positionsForm.value.splice(idx, 1)
}

const submitPositionsStep = async () => {
  if (!createdElectionId.value) {
    positionsError.value = 'Election must be created first.'
    return
  }

  const payloads = positionsForm.value
    .filter((p) => p.name && String(p.name).trim().length > 0)
    .map((p) => ({
      name: p.name,
      level: p.level || null,
      seats: Number(p.seats) || 1,
      election: createdElectionId.value,
      is_active: true,
    }))

  if (!payloads.length) {
    positionsError.value = 'Add at least one position with a name.'
    return
  }

  positionsSubmitting.value = true
  positionsError.value = ''
  createdPositions.value = []

  try {
    const responses = []
    for (const payload of payloads) {
      const res = await api.post('positions/', payload, {
        headers: authHeaders.value,
      })
      responses.push(res.data)
    }
    createdPositions.value = responses

    // Prefill candidates position select with first position
    if (createdPositions.value.length && candidatesForm.value.length) {
      candidatesForm.value[0].position_id = createdPositions.value[0].id
    }

    wizardStep.value = 3
  } catch (err) {
    console.error(err)
    positionsError.value = err.response?.data?.error || 'Failed to save positions.'
  } finally {
    positionsSubmitting.value = false
  }
}

/* ---------- Wizard: Step 3 – Candidates ---------- */

const addCandidateRow = () => {
  const defaultPositionId = createdPositions.value[0]?.id || null
  candidatesForm.value.push({
    full_name: '',
    party: '',
    photo_url: '',
    photo_portrait_url: '',
    bio: '',
    position_id: defaultPositionId,
  })
}

const removeCandidateRow = (idx) => {
  if (candidatesForm.value.length === 1) return
  candidatesForm.value.splice(idx, 1)
}

const submitCandidatesAndFinish = async () => {
  const payloads = candidatesForm.value
    .filter((c) => c.full_name && String(c.full_name).trim().length > 0 && c.position_id)
    .map((c) => ({
      full_name: c.full_name,
      party: c.party || null,
      photo_url: c.photo_url || null,
      photo_portrait_url: c.photo_portrait_url || null,
      bio: c.bio || null,
      position: c.position_id,
    }))

  if (!payloads.length) {
    candidatesError.value = 'Add at least one candidate with a name and position.'
    return
  }

  candidatesSubmitting.value = true
  candidatesError.value = ''

  try {
    for (const payload of payloads) {
      await api.post('candidates/', payload, {
        headers: authHeaders.value,
      })
    }

    const electionName = newElection.value.name
    const positionsCount = createdPositions.value.length
    const candidatesCount = payloads.length

    showAddModal.value = false
    await reloadAll()

    window.alert(
      `Election "${electionName}" created with ${positionsCount} position(s) and ${candidatesCount} candidate(s).`,
    )

    resetWizardState()
  } catch (err) {
    console.error(err)
    candidatesError.value = err.response?.data?.error || 'Failed to save candidates.'
  } finally {
    candidatesSubmitting.value = false
  }
}

/* ---------- Add Voter: API + handlers ---------- */

const loadSections = async () => {
  try {
    const res = await api.get('sections/', {
      headers: authHeaders.value,
    })
    sections.value = res.data || []
  } catch (err) {
    console.error(err)
  }
}

const openAddVoterModal = async () => {
  voterError.value = ''
  newVoter.value = {
    name: '',
    section: null,
    pin: '',
  }
  showAddVoterModal.value = true

  if (!sections.value.length) {
    await loadSections()
  }
}

const closeAddVoterModal = () => {
  if (voterSubmitting.value) return
  showAddVoterModal.value = false
}

const submitNewVoter = async () => {
  // Name & section required, PIN optional
  if (!newVoter.value.name || !newVoter.value.section) {
    voterError.value = 'Please fill in name and section.'
    return
  }

  if (newVoter.value.pin && newVoter.value.pin.length < 4) {
    voterError.value = 'If you provide a PIN, it should be at least 4 digits.'
    return
  }

  voterSubmitting.value = true
  voterError.value = ''

  try {
    const res = await api.post(
      'admin/voters/',
      {
        name: newVoter.value.name,
        section: newVoter.value.section,
        pin: newVoter.value.pin || '',
      },
      { headers: authHeaders.value },
    )

    const voter = res.data
    const createdPin = voter.pin || newVoter.value.pin || '(no PIN returned)'

    showAddVoterModal.value = false
    await reloadAll()

    window.alert(
      `Voter created.\n\n` +
        `Name: ${voter.name}\n` +
        `Voter ID: ${voter.voter_id}\n` +
        `PIN: ${createdPin}`,
    )
  } catch (err) {
    console.error(err)
    voterError.value =
      err.response?.data?.error || 'Failed to create voter. Please check the fields and try again.'
  } finally {
    voterSubmitting.value = false
  }
}

/* ---------- Watch & mount ---------- */

watch(selectedElectionId, async () => {
  await loadTally()
})

onMounted(async () => {
  await reloadAll()
})
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-800">Admin Dashboard</h2>
        <p class="text-xs text-slate-500">Overview of elections, turnout, and tallies.</p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Add Voter -->
        <button
          @click="openAddVoterModal"
          class="text-xs rounded-lg bg-sky-600 text-white px-3 py-1.5 shadow-sm"
        >
          Add Voter
        </button>

        <!-- Add Election: always visible -->
        <button
          @click="openAddModal"
          class="text-xs rounded-lg bg-emerald-600 text-white px-3 py-1.5 shadow-sm"
        >
          Add Election
        </button>

        <!-- End Election: only when selected is active -->
        <button
          v-if="selectedElection && selectedElection.is_active"
          @click="endElectionNow"
          :disabled="endingElection"
          class="text-xs rounded-lg bg-rose-600 text-white px-3 py-1.5 shadow-sm disabled:bg-rose-300 disabled:cursor-not-allowed"
        >
          {{ endingElection ? 'Ending…' : 'End Election Now' }}
        </button>

        <button
          @click="reloadAll"
          :disabled="loading"
          class="text-xs rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-60"
        >
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- GLOBAL ERROR -->
    <p v-if="error" class="text-sm text-rose-600">
      {{ error }}
    </p>

    <!-- NO ELECTIONS YET -->
    <div
      v-if="!hasAnyElection && !error"
      class="mt-4 bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center text-sm text-slate-500"
    >
      <p class="mb-2 font-medium text-slate-700">No elections configured yet.</p>
      <p class="mb-4">
        Use the <span class="font-semibold">Add Election</span> button above to create one.
      </p>
      <button
        @click="openAddModal"
        class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm"
      >
        Add Election
      </button>
    </div>

    <!-- MAIN CONTENT WHEN THERE ARE ELECTIONS -->
    <template v-else>
      <!-- CURRENT ELECTION CARD + SELECTOR -->
      <div
        class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Current selection
          </p>
          <p class="text-sm font-semibold text-slate-800">
            {{ selectedElection?.name || 'Select an election' }}
          </p>
          <p class="text-[11px] text-slate-500 mt-1" v-if="selectedElection">
            Starts:
            {{ new Date(selectedElection.start_at).toLocaleString() }} · Ends:
            {{ new Date(selectedElection.end_at).toLocaleString() }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-[11px] text-slate-500">Election:</label>
          <select
            v-model.number="selectedElectionId"
            class="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50"
          >
            <option v-for="e in elections" :key="e.id" :value="e.id">
              {{ e.name }} {{ e.is_active ? '· ACTIVE' : '· ended' }}
            </option>
          </select>
        </div>
      </div>

      <!-- STATS -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 mb-1">Positions</p>
          <p class="text-2xl font-semibold text-slate-800">
            {{ stats.totalPositions }}
          </p>
          <p class="text-[11px] text-slate-400 mt-1">Positions configured for this election.</p>
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
          <p class="text-[11px] text-slate-400 mt-1">Sum of all votes recorded.</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 mb-1">Turnout</p>
          <p class="text-2xl font-semibold text-slate-800">
            {{ stats.turnoutPercent.toFixed(1) }}%
          </p>
          <p class="text-[11px] text-slate-400 mt-1">Unique voters who voted in this election.</p>
        </div>
      </div>

      <!-- TALLY -->
      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-slate-800">Tally by Position</h3>

        <div v-if="loadingTally" class="text-sm text-slate-500">Loading tally…</div>

        <div v-else-if="tally.length === 0" class="text-xs text-slate-500">
          No votes yet for this election.
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
    </template>

    <!-- ADD ELECTION WIZARD MODAL -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-3"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
        <!-- Step header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span v-if="wizardStep === 1">Step 1 of 3 – Election details</span>
              <span v-else-if="wizardStep === 2">
                Step 2 of 3 – Positions for {{ newElection.name || 'this election' }}
              </span>
              <span v-else>Step 3 of 3 – Candidates</span>
            </p>
            <h3 class="text-sm font-semibold">
              <span v-if="wizardStep === 1">Add New Election</span>
              <span v-else-if="wizardStep === 2">Configure Positions</span>
              <span v-else>Add Candidates</span>
            </h3>
          </div>
          <div class="flex items-center gap-1 text-[10px] text-slate-500">
            <div
              v-for="step in [1, 2, 3]"
              :key="step"
              class="h-1.5 w-8 rounded-full"
              :class="[wizardStep >= step ? 'bg-emerald-500' : 'bg-slate-200']"
            />
          </div>
        </div>

        <!-- STEP 1 CONTENT -->
        <div v-if="wizardStep === 1" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Name</label>
            <input
              v-model="newElection.name"
              type="text"
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Local Election 2026"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Start</label>
              <input
                v-model="newElection.start_at"
                type="datetime-local"
                class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">End</label>
              <input
                v-model="newElection.end_at"
                type="datetime-local"
                class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 text-xs text-slate-700">
            <input v-model="newElection.is_active" type="checkbox" class="h-3 w-3" />
            Set this election as active
          </label>

          <p v-if="addError" class="text-xs text-rose-600">
            {{ addError }}
          </p>
        </div>

        <!-- STEP 2 CONTENT -->
        <div v-else-if="wizardStep === 2" class="space-y-3">
          <p class="text-xs text-slate-500">
            Add the positions that students will vote for in
            <span class="font-semibold">{{ newElection.name || 'this election' }}</span
            >.
          </p>

          <div class="max-h-72 overflow-y-auto border border-slate-100 rounded-xl p-2">
            <div
              v-for="(pos, idx) in positionsForm"
              :key="idx"
              class="grid grid-cols-12 gap-2 items-center mb-2"
            >
              <div class="col-span-5">
                <label class="block text-[11px] text-slate-600 mb-1">Position name</label>
                <input
                  v-model="pos.name"
                  type="text"
                  class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                  placeholder="e.g. SSG President"
                />
              </div>
              <div class="col-span-4">
                <label class="block text-[11px] text-slate-600 mb-1">Level</label>
                <select
                  v-model="pos.level"
                  class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-slate-50"
                >
                  <option value="">Select level</option>
                  <option value="Junior High">Junior High</option>
                  <option value="Senior High">Senior High</option>
                  <option value="Whole School">Whole School</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-[11px] text-slate-600 mb-1">Seats</label>
                <input
                  v-model.number="pos.seats"
                  type="number"
                  min="1"
                  class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-center"
                />
              </div>
              <div class="col-span-1 flex items-end justify-end">
                <button
                  type="button"
                  @click="removePositionRow(idx)"
                  class="text-[10px] px-2 py-1 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="addPositionRow"
            class="text-[11px] mt-2 px-3 py-1.5 rounded-lg border border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          >
            + Add Position
          </button>

          <p v-if="positionsError" class="text-xs text-rose-600">
            {{ positionsError }}
          </p>
        </div>

        <!-- STEP 3 CONTENT -->
        <div v-else class="space-y-3">
          <p class="text-xs text-slate-500">
            Add candidates for each position. You can set party/section and optional photo URL.
          </p>

          <div class="text-[11px] text-slate-500 mb-1" v-if="createdPositions.length">
            Positions created:
            <span class="font-semibold">
              {{ createdPositions.map((p) => p.name).join(', ') }}
            </span>
          </div>

          <div class="max-h-72 overflow-y-auto border border-slate-100 rounded-xl p-2">
            <div
              v-for="(cand, idx) in candidatesForm"
              :key="idx"
              class="border border-slate-200 rounded-xl p-2 mb-2"
            >
              <div class="grid grid-cols-12 gap-2">
                <div class="col-span-5">
                  <label class="block text-[11px] text-slate-600 mb-1">Full name</label>
                  <input
                    v-model="cand.full_name"
                    type="text"
                    class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                    placeholder="e.g. Juan Dela Cruz"
                  />
                </div>
                <div class="col-span-4">
                  <label class="block text-[11px] text-slate-600 mb-1">Party / Section</label>
                  <input
                    v-model="cand.party"
                    type="text"
                    class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                    placeholder="e.g. Pula Party / 10 - St. Paul"
                  />
                </div>
                <div class="col-span-3">
                  <label class="block text-[11px] text-slate-600 mb-1">Position</label>
                  <select
                    v-model="cand.position_id"
                    class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-slate-50"
                  >
                    <option :value="null">Select…</option>
                    <option v-for="p in createdPositions" :key="p.id" :value="p.id">
                      {{ p.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-12 gap-2 mt-2">
                <div class="col-span-4">
                  <label class="block text-[11px] text-slate-600 mb-1"
                    >Small avatar URL (optional)</label
                  >
                  <input
                    v-model="cand.photo_url"
                    type="url"
                    class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                    placeholder="https://… (thumbnail)"
                  />
                </div>
                <div class="col-span-4">
                  <label class="block text-[11px] text-slate-600 mb-1"
                    >Large portrait URL (optional)</label
                  >
                  <input
                    v-model="cand.photo_portrait_url"
                    type="url"
                    class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                    placeholder="https://… (for summary panel)"
                  />
                </div>
                <div class="col-span-3">
                  <label class="block text-[11px] text-slate-600 mb-1">Short bio (optional)</label>
                  <input
                    v-model="cand.bio"
                    type="text"
                    class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                    placeholder="e.g. Grade 10, class rep for 2 years…"
                  />
                </div>
                <div class="col-span-1 flex items-end justify-end">
                  <button
                    type="button"
                    @click="removeCandidateRow(idx)"
                    class="text-[10px] px-2 py-1 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="addCandidateRow"
            class="text-[11px] mt-2 px-3 py-1.5 rounded-lg border border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          >
            + Add Candidate
          </button>

          <p v-if="candidatesError" class="text-xs text-rose-600">
            {{ candidatesError }}
          </p>
        </div>

        <!-- FOOTER BUTTONS -->
        <div class="mt-5 flex justify-between gap-2">
          <button
            @click="closeAddModal"
            :disabled="addSubmitting || positionsSubmitting || candidatesSubmitting"
            class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>

          <div class="flex gap-2">
            <button
              v-if="wizardStep > 1"
              type="button"
              @click="wizardStep = wizardStep - 1"
              :disabled="addSubmitting || positionsSubmitting || candidatesSubmitting"
              class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
            >
              Back
            </button>

            <button
              v-if="wizardStep === 1"
              @click="submitElectionStep"
              :disabled="addSubmitting"
              class="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-sm disabled:bg-emerald-300 disabled:cursor-not-allowed"
            >
              {{ addSubmitting ? 'Saving…' : 'Next: Positions' }}
            </button>

            <button
              v-else-if="wizardStep === 2"
              @click="submitPositionsStep"
              :disabled="positionsSubmitting"
              class="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-sm disabled:bg-emerald-300 disabled:cursor-not-allowed"
            >
              {{ positionsSubmitting ? 'Saving…' : 'Next: Candidates' }}
            </button>

            <button
              v-else
              @click="submitCandidatesAndFinish"
              :disabled="candidatesSubmitting"
              class="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-sm disabled:bg-emerald-300 disabled:cursor-not-allowed"
            >
              {{ candidatesSubmitting ? 'Finishing…' : 'Finish Setup' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD VOTER MODAL -->
    <div
      v-if="showAddVoterModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-3"
    >
      <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-sm font-semibold mb-4">Add New Voter</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Full name</label>
            <input
              v-model="newVoter.name"
              type="text"
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Section</label>
            <select
              v-model.number="newVoter.section"
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50"
            >
              <option :value="null">Select a section</option>
              <option v-for="s in sections" :key="s.id" :value="s.id">
                <span v-if="s.grade_level"> {{ s.grade_level.name }} – {{ s.name }} </span>
                <span v-else>
                  {{ s.name }}
                </span>
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">
              PIN (for voter login)
            </label>
            <input
              v-model="newVoter.pin"
              type="text"
              maxlength="10"
              class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 4831"
            />
            <p class="text-[10px] text-slate-500 mt-1">
              Optional: leave blank to auto-generate a random 4-digit PIN. The PIN will be stored
              securely (hashed). You’ll need to give this PIN to the student.
            </p>
          </div>

          <p v-if="voterError" class="text-xs text-rose-600">
            {{ voterError }}
          </p>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button
            @click="closeAddVoterModal"
            :disabled="voterSubmitting"
            class="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            @click="submitNewVoter"
            :disabled="voterSubmitting"
            class="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white shadow-sm disabled:bg-sky-300 disabled:cursor-not-allowed"
          >
            {{ voterSubmitting ? 'Saving…' : 'Create Voter' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

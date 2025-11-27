<script setup>
import { ref, onMounted, watch } from "vue";
import api, { setAuthToken } from "../api";

// ---------- AUTH STATE ----------
const token = ref(localStorage.getItem("voterToken") || "");
const voter = ref(null);

const loginVoterId = ref("");
const loginPin = ref("");
const loggingIn = ref(false);

// ---------- VOTING STATE ----------
const positions = ref([]);
const selectedPositionId = ref("");
const candidates = ref([]);
const selectedCandidateId = ref("");

const loadingPositions = ref(false);
const loadingCandidates = ref(false);
const submitting = ref(false);
const message = ref("");
const error = ref("");

// if we already have a token in localStorage, attach it to axios on load
onMounted(async () => {
  if (token.value) {
    setAuthToken(token.value);
  }
  await loadPositions();
});

// ---------- LOGIN ----------
const login = async () => {
  error.value = "";
  message.value = "";
  loggingIn.value = true;

  try {
    const res = await api.post("login/", {
      voter_id: loginVoterId.value,
      pin: loginPin.value,
    });

    token.value = res.data.token;
    voter.value = res.data.voter;
    localStorage.setItem("voterToken", token.value);
    setAuthToken(token.value);

    message.value = `Welcome, ${voter.value.name}.`;
  } catch (e) {
    console.error(e);
    if (e.response?.data?.error) {
      error.value = e.response.data.error;
    } else {
      error.value = "Login failed. Please check your Voter ID and PIN.";
    }
  } finally {
    loggingIn.value = false;
  }
};

// ---------- LOAD POSITIONS & CANDIDATES ----------
const loadPositions = async () => {
  try {
    loadingPositions.value = true;
    const res = await api.get("positions/");
    positions.value = res.data;
  } catch (e) {
    console.error(e);
    error.value = "Failed to load positions.";
  } finally {
    loadingPositions.value = false;
  }
};

const loadCandidates = async (positionId) => {
  if (!positionId) {
    candidates.value = [];
    return;
  }
  try {
    loadingCandidates.value = true;
    const res = await api.get("candidates/", {
      params: { position: positionId },
    });
    candidates.value = res.data;
  } catch (e) {
    console.error(e);
    error.value = "Failed to load candidates.";
  } finally {
    loadingCandidates.value = false;
  }
};

watch(selectedPositionId, (val) => {
  selectedCandidateId.value = "";
  message.value = "";
  if (val) loadCandidates(val);
  else candidates.value = [];
});

// ---------- SUBMIT VOTE ----------
const submitVote = async () => {
  if (!selectedPositionId.value || !selectedCandidateId.value) return;
  if (!token.value) {
    error.value = "You must log in before voting.";
    return;
  }

  error.value = "";
  message.value = "";
  submitting.value = true;

  try {
    await api.post("vote/", {
      position_id: selectedPositionId.value,
      candidate_id: selectedCandidateId.value,
    });

    message.value = "Your vote has been recorded. Thank you.";
  } catch (e) {
    console.error(e);
    if (e.response?.data) {
      error.value = "Failed to submit vote: " + JSON.stringify(e.response.data);
    } else {
      error.value = "Failed to submit vote. Please try again.";
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="grid gap-6 md:grid-cols-[2fr,1.3fr]">
    <!-- LEFT COLUMN -->
    <section class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <!-- Login card -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-1">Voter Login</h2>
        <p class="text-xs text-slate-500 mb-3">
          Enter your Voter ID and PIN to access the ballot.
        </p>

        <div class="grid gap-3 md:grid-cols-[1.2fr,1.2fr,auto] items-end">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">
              Voter ID
            </label>
            <input
              v-model="loginVoterId"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">
              PIN
            </label>
            <input
              v-model="loginPin"
              type="password"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            @click="login"
            :disabled="loggingIn"
            class="inline-flex justify-center items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            <span v-if="loggingIn">Logging in...</span>
            <span v-else>Login</span>
          </button>
        </div>

        <p v-if="voter" class="mt-2 text-xs text-emerald-600">
          Logged in as <strong>{{ voter.name }}</strong> ({{ voter.voter_id }}).
        </p>
      </div>

      <!-- Voting UI only if logged in -->
      <div v-if="token">
        <h2 class="text-lg font-semibold mb-1">Cast Your Vote</h2>
        <p class="text-sm text-slate-500 mb-4">
          Select a position, choose your preferred candidate, and submit your vote.
        </p>

        <!-- Step 1 -->
        <div class="mb-5">
          <h3 class="text-sm font-semibold text-slate-700">
            Step 1 · Select Position
          </h3>
          <p class="text-xs text-slate-500 mb-2">
            Positions available for this election cycle.
          </p>
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
          <p v-if="loadingPositions" class="mt-1 text-xs text-slate-400">
            Loading positions...
          </p>
          <p
            v-if="!loadingPositions && positions.length === 0"
            class="mt-1 text-xs text-amber-600"
          >
            No positions configured yet. Ask an admin to add them in Django admin.
          </p>
        </div>

        <!-- Step 2 -->
        <div class="mb-5" v-if="selectedPositionId">
          <h3 class="text-sm font-semibold text-slate-700">
            Step 2 · Choose Candidate
          </h3>
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

        <!-- Step 3 -->
        <div
          class="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between"
        >
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
      </div>

      <!-- messages -->
      <div class="mt-3 space-y-1">
        <p v-if="message" class="text-sm text-emerald-600">
          {{ message }}
        </p>
        <p v-if="error" class="text-sm text-rose-600">
          {{ error }}
        </p>
      </div>
    </section>

    <!-- RIGHT COLUMN: summary (unchanged, except it now just reads the same refs) -->
    <aside class="space-y-4">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <h3 class="text-sm font-semibold mb-2">Ballot Summary</h3>
        <p class="text-xs text-slate-500 mb-3">
          Quick overview of your current selections.
        </p>
        <dl class="text-sm space-y-2">
          <div class="flex justify-between">
            <dt class="text-slate-500">Position</dt>
            <dd class="font-medium">
              {{
                positions.find(p => p.id === Number(selectedPositionId))?.name ||
                "Not selected"
              }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Candidate</dt>
            <dd class="font-medium">
              {{
                candidates.find(c => c.id === Number(selectedCandidateId))?.full_name ||
                "Not selected"
              }}
            </dd>
          </div>
        </dl>
      </div>

      <div
        class="bg-blue-50 border border-blue-100 text-xs text-blue-900 rounded-2xl p-4"
      >
        <h4 class="font-semibold mb-1 text-sm">Notes</h4>
        <ul class="list-disc list-inside space-y-1">
          <li>Your vote is stored immediately after submission.</li>
          <li>Admins see aggregated counts, not your individual ballot.</li>
          <li>This is a prototype; real deployment must follow DILG/COMELEC rules.</li>
        </ul>
      </div>
    </aside>
  </div>
</template>

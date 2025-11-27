<script setup>
import { ref, onMounted, computed } from "vue";
import api from "../api";

const positions = ref([]);
const candidates = ref([]);
const votes = ref([]);

const loading = ref(false);
const error = ref("");

const loadData = async () => {
  error.value = "";
  loading.value = true;
  try {
    const [posRes, candRes, voteRes] = await Promise.all([
      api.get("/positions/"),
      api.get("/candidates/"),
      api.get("/votes/"),
    ]);
    positions.value = posRes.data;
    candidates.value = candRes.data;
    votes.value = voteRes.data;
  } catch (e) {
    console.error(e);
    error.value = "Failed to load dashboard data.";
  } finally {
    loading.value = false;
  }
};

const resultsByPosition = computed(() => {
  const byPos = new Map();
  const candidateMap = new Map(candidates.value.map(c => [c.id, c]));
  const positionMap = new Map(positions.value.map(p => [p.id, p]));

  for (const v of votes.value) {
    const c = candidateMap.get(v.candidate);
    const p = positionMap.get(v.position);
    if (!c || !p) continue;

    if (!byPos.has(p.id)) {
      byPos.set(p.id, { position: p, candidates: new Map() });
    }
    const posEntry = byPos.get(p.id);
    const current = posEntry.candidates.get(c.id) || { candidate: c, count: 0 };
    current.count += 1;
    posEntry.candidates.set(c.id, current);
  }

  return Array.from(byPos.values()).map(entry => ({
    position: entry.position,
    rows: Array.from(entry.candidates.values()).sort((a, b) => b.count - a.count),
  }));
});

onMounted(loadData);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold">Admin Dashboard</h2>
        <p class="text-sm text-slate-500">
          Overview of positions, candidates, and current vote counts.
        </p>
      </div>
      <button
        @click="loadData"
        :disabled="loading"
        class="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {{ loading ? "Refreshing..." : "Refresh" }}
      </button>
    </div>

    <div
      v-if="error"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
    >
      {{ error }}
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">Total positions</p>
        <p class="mt-1 text-2xl font-semibold">{{ positions.length }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">Total candidates</p>
        <p class="mt-1 text-2xl font-semibold">{{ candidates.length }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">Total votes recorded</p>
        <p class="mt-1 text-2xl font-semibold">{{ votes.length }}</p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-if="resultsByPosition.length === 0 && !loading"
        class="text-sm text-slate-500"
      >
        No votes recorded yet.
      </div>

      <div
        v-for="entry in resultsByPosition"
        :key="entry.position.id"
        class="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      >
        <div
          class="px-4 py-3 border-b border-slate-200 flex items-center justify-between"
        >
          <div>
            <h3 class="text-sm font-semibold">
              {{ entry.position.name }}
              <span v-if="entry.position.level" class="text-xs text-slate-500">
                · {{ entry.position.level }}
              </span>
            </h3>
            <p class="text-xs text-slate-500">
              {{ entry.rows.length }} candidate<span
                v-if="entry.rows.length !== 1"
                >s</span
              >
            </p>
          </div>
        </div>
        <div class="p-4 overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead class="text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-2 pr-4">Candidate</th>
                <th class="py-2 pr-4">Party</th>
                <th class="py-2 pr-4 text-right">Votes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in entry.rows"
                :key="row.candidate.id"
                class="border-b border-slate-100 last:border-b-0"
              >
                <td class="py-2 pr-4 text-sm">
                  {{ row.candidate.full_name }}
                </td>
                <td class="py-2 pr-4 text-xs text-slate-500">
                  {{ row.candidate.party || "—" }}
                </td>
                <td class="py-2 pr-4 text-right text-sm font-semibold">
                  {{ row.count }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

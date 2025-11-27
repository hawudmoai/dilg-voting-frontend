<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <!-- Top nav -->
    <header class="bg-white border-b border-slate-200">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm"
          >
            VS
          </div>
          <div>
            <h1 class="text-sm font-semibold leading-tight">
              DILG Provincial Voting System
            </h1>
            <p class="text-xs text-slate-500">
              Internal prototype · not for production use
            </p>
          </div>
        </div>

        <nav class="flex gap-2 text-sm">
          <RouterLink
            to="/vote"
            class="px-3 py-1.5 rounded-md hover:bg-slate-100"
            active-class="bg-blue-600 text-white hover:bg-blue-600"
          >
            Voting
          </RouterLink>
          <RouterLink
            to="/admin"
            class="px-3 py-1.5 rounded-md hover:bg-slate-100"
            active-class="bg-slate-900 text-white bg-slate-900 hover:bg-slate-900"
          >
            Admin Dashboard
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- Page content -->
    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>

    <footer class="mt-8 border-t border-slate-200 bg-white">
      <div
        class="mx-auto max-w-6xl px-4 py-3 text-xs text-slate-500 flex justify-between"
      >
        <span>Prototype for DILG · {{ new Date().getFullYear() }}</span>
        <span>Dev: Emerson</span>
      </div>
    </footer>
  </div>
</template>

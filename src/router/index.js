import { createRouter, createWebHistory } from "vue-router";
import VoterPage from "../views/VoterPage.vue";
import AdminDashboard from "../views/AdminDashboard.vue";

const routes = [
  { path: "/", redirect: "/vote" },
  { path: "/vote", component: VoterPage },
  { path: "/admin", component: AdminDashboard },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

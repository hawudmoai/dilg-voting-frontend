// src/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
})

// set / clear session token header
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['X-Session-Token'] = token
  } else {
    delete api.defaults.headers.common['X-Session-Token']
  }
}

// OPTIONAL: auto-logout on 401
import { useAuthStore } from './stores/auth'
import router from './router'

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

export default api

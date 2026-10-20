import { useAuthStore } from '@/services/auth'

// Adressen till backend
const API_URL = 'http://localhost:3000'

// Anropar backend och skickar med token om användaren är inloggad
export async function apiFetch(path, options = {}) {
    const authStore = useAuthStore()

    const headers = { 'Content-Type': 'application/json', ...options.headers }

    if (authStore.token) {
        headers.Authorization = `Bearer ${authStore.token}`
    }

    return fetch(`${API_URL}${path}`, { ...options, headers })
}

import { apiFetch } from '@/services/api'

export async function getLeaderboard() {
  const response = await apiFetch('/api/leaderboard', {
    method: 'GET',
  })

  if (!response.ok) {
    const error = new Error(`Kunde inte hämta topplistan (status ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}
// Här samlas allt som handlar om att hämta quizresultat från backenden.

import { apiFetch } from '@/services/api'

// Hämtar den inloggade användarens sparade resultat, senaste först.
// (Resultat sparas när ett quiz avslutas på servern – se quizSession.js.)
export async function getResults() {
  const response = await apiFetch('/api/results', {
    method: 'GET',
  })

  if (!response.ok) {
    const error = new Error(`Kunde inte hämta resultatet (status ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

// Hämtar den inloggade användarens XP och nivå från backenden.
// Används t.ex. av profilsidan för att visa nivån utan att spela ett quiz.

import { apiFetch } from '@/services/api'

// Returnerar { xp, level, xpIntoLevel, xpPerLevel }.
// apiFetch skickar automatiskt med token om användaren är inloggad.
// Kastar ett fel med error.status satt (t.ex. 401) om något går snett.
export async function getProgress() {
  const response = await apiFetch('/api/progress')

  if (!response.ok) {
    const error = new Error(`Kunde inte hämta XP (status ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

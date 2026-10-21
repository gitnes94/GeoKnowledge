// Här samlas allt som handlar om att SPARA quizresultat i backenden.
// Vyerna anropar bara saveResult() och behöver inte veta hur anropet ser ut.

import { apiFetch } from '@/services/api'

// Skickar ett resultat till backenden för den inloggade användaren.
//   result – { quiz_type, region, correct_count, total }
//
// apiFetch lägger själv till backendens adress och token (om man är inloggad).
//
// Returnerar { result, xp } – det sparade resultatet och användarens nya XP.
// Kastar ett fel om något går snett, med error.status satt till
// HTTP-statuskoden (t.ex. 401).
export async function saveResult(result) {
  const response = await apiFetch('/api/results', {
    method: 'POST',
    body: JSON.stringify(result),
  })

  if (!response.ok) {
    const error = new Error(`Kunde inte spara resultatet (status ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

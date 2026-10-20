// Här samlas allt som handlar om att SPARA quizresultat i backenden.
// Vyerna anropar bara saveResult() och behöver inte veta hur anropet ser ut.

const RESULTS_URL = 'http://localhost:3000/api/results'

// Skickar ett resultat till backenden för den inloggade användaren.
//   token  – JWT från inloggningen (authStore.token)
//   result – { quiz_type, region, correct_count, total }
//
// Returnerar det sparade resultatet. Kastar ett fel om något går snett,
// med error.status satt till HTTP-statuskoden (t.ex. 401).
export async function saveResult(token, result) {
  const response = await fetch(RESULTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(result),
  })

  if (!response.ok) {
    const error = new Error(`Kunde inte spara resultatet (status ${response.status})`)
    error.status = response.status
    throw error
  }

  const data = await response.json()
  return data.result
}

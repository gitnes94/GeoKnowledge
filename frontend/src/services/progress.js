// Hämtar den inloggade användarens XP och nivå från backenden.
// Används t.ex. av profilsidan för att visa nivån utan att spela ett quiz.

const PROGRESS_URL = 'http://localhost:3000/api/progress'

// Returnerar { xp, level, xpIntoLevel, xpPerLevel }.
// Kastar ett fel med error.status satt (t.ex. 401) om något går snett.
export async function getProgress(token) {
  const response = await fetch(PROGRESS_URL, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const error = new Error(`Kunde inte hämta XP (status ${response.status})`)
    error.status = response.status
    throw error
  }

  return response.json()
}

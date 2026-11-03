// Anrop som rör den inloggades konto: byta visningsnamn och ta bort kontot.
// Kastar ett fel med error.status (t.ex. 409) och serverns meddelande om
// något går snett, så att profilsidan kan visa det.

import { apiFetch } from '@/services/api'

async function send(method, body) {
  const response = await apiFetch('/api/users/me', {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.message || `Anropet misslyckades (status ${response.status})`)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

// Byter visningsnamn. Svar: { id, username, picture_url } – samma som /api/auth/me
export function updateUsername(username) {
  return send('PUT', { username })
}

// Tar bort kontot med alla resultat och troféer
export function deleteAccount() {
  return send('DELETE')
}

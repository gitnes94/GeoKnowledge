// Anropen till serverns quiz. Servern skapar frågorna, har facit och tar tiden –
// webbläsaren får bara veta om ett svar var rätt EFTER att man har svarat.
//
//   startQuiz()    – POST /api/quiz/start
//   answerQuestion – POST /api/quiz/:id/answer
//   finishQuiz()   – POST /api/quiz/:id/finish (sparar resultatet om man är inloggad)
//
// Alla funktioner kastar ett fel med error.status satt (t.ex. 409) om något går snett.

import { apiFetch } from '@/services/api'

async function post(path, body) {
  const response = await apiFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || `Anropet misslyckades (status ${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}

// Startar ett quiz.
//   options – { quiz_type, region, timed, seen_ids }
//
// Svar:
//   {
//     session_id, quiz_type, region,
//     time_limit: 60 | null, lives: 3 | null,
//     will_save,       // sparas resultatet? (bara för inloggade)
//     login_expired,   // det fanns en inloggning men den har gått ut
//     map_view,        // GeoMaster: { center, span } – området kartan ska visa
//     questions: [{ kind: 'shape' | 'flag' | 'capital', options: [{ id, name }],
//                   shape?, flag?, capital? }, ...]
//   }
export function startQuiz(options) {
  return post('/api/quiz/start', options)
}

// Svarar på en fråga. Svar: { correct, correct_id, done }
export function answerQuestion(sessionId, index, optionId) {
  return post(`/api/quiz/${sessionId}/answer`, { index, option_id: optionId })
}

// Avslutar quizet. Svar: { result, saved, xp, country_ids }
export function finishQuiz(sessionId) {
  return post(`/api/quiz/${sessionId}/finish`)
}

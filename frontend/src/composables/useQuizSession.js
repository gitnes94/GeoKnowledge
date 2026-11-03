// Det som är gemensamt för alla quiz: starta ett quiz på servern, svara,
// avsluta, visa om resultatet sparades, XP och nya troféer.
// Förut fanns samma kod i varje quizvy.
//
// Användning i en vy:
//   const quiz = useQuizSession('shape', () => ({ region: 'Europe', timed: false }))
//   onMounted(quiz.start)
//   <QuizRunner :questions="quiz.session.value.questions" :check-answer="quiz.answer" @finished="quiz.onFinished" />

import { ref, shallowRef } from 'vue'
import { startQuiz, answerQuestion, finishQuiz } from '@/services/quizSession.js'
import { getSeenIds, markSeen } from '@/services/quizHistory.js'
import { startTrophyCheck, findNewTrophies, loadTrophyWorld } from '@/services/trophies.js'
import { getQuizPool } from '@/services/quiz.js'
import { useAuthStore } from '@/services/auth'

//   quizType   – 'shape', 'flag', 'capital' eller 'geomaster'
//   getOptions – funktion som ger { region, timed } när ett quiz startar
//   useHistory – kom ihåg vilka länder man fått, så att de inte kommer igen
//                förrän alla länder i världsdelen har varit med (se quizHistory.js)
export function useQuizSession(quizType, getOptions, { useHistory = false } = {}) {
  const authStore = useAuthStore()

  // 'loading' | 'playing' | 'finished' | 'error'
  const status = ref('loading')
  const error = ref(null)

  // Svaret från servern när quizet startade (frågorna, tidsgräns, liv ...)
  const session = shallowRef(null)

  // Resultatet när quizet är slut: { correct_count, total, ... }
  const result = ref(null)

  // Hur det gick att spara resultatet:
  //   'idle' | 'saving' | 'saved' | 'not-logged-in' | 'expired' | 'error'
  const saveStatus = ref('idle')

  // XP från servern efter sparningen: { gained, total, level, leveledUp, ... }
  const xp = ref(null)

  // Troféer som låstes upp av quizet
  const newTrophies = ref([])

  // Ökas varje ny omgång. Används som :key på QuizRunner, och för att svar
  // från en gammal omgång inte ska visas i en ny.
  const round = ref(0)

  let trophiesBefore = null
  let region = 'World'

  async function start() {
    round.value++
    const thisRound = round.value

    const options = getOptions()
    region = options.region

    status.value = 'loading'
    error.value = null
    session.value = null
    result.value = null
    saveStatus.value = 'idle'
    xp.value = null
    newTrophies.value = []
    trophiesBefore = authStore.token ? startTrophyCheck() : null

    try {
      const data = await startQuiz({
        quiz_type: quizType,
        region,
        timed: options.timed === true,
        seen_ids: useHistory ? getSeenIds(quizType, region) : [],
      })
      if (thisRound !== round.value) return
      session.value = data
      status.value = 'playing'
    } catch (e) {
      console.error(e)
      if (thisRound !== round.value) return
      status.value = 'error'
      // 429 = för många quiz på kort tid, 401 = kontot finns inte längre.
      // Då förklarar serverns meddelande vad som hänt.
      error.value = e.status === 429 || e.status === 401
        ? e.message
        : 'Kunde inte starta quizet. Är servern igång?'
    }
  }

  // QuizRunner anropar den här när användaren svarar
  function answer(index, optionId) {
    return answerQuestion(session.value.session_id, index, optionId)
  }

  // QuizRunner skickar 'finished' när quizet är slut: { correct_count, total }.
  // Resultatet visas direkt och quizet avslutas sedan på servern.
  async function onFinished(localResult) {
    const thisRound = round.value
    const current = session.value

    result.value = localResult
    status.value = 'finished'

    if (current.will_save) {
      saveStatus.value = 'saving'
    } else {
      saveStatus.value = current.login_expired ? 'expired' : 'not-logged-in'
    }

    let data
    try {
      data = await finishQuiz(current.session_id)
    } catch (e) {
      console.error(e)
      if (thisRound !== round.value) return
      if (current.will_save) saveStatus.value = e.status === 401 ? 'expired' : 'error'
      return
    }
    if (thisRound !== round.value) return

    // Serverns rättning gäller, t.ex. om ett svar hann fram precis när tiden tog slut
    result.value = { ...localResult, ...data.result }

    if (useHistory) {
      try {
        const world = await loadTrophyWorld()
        const poolIds = getQuizPool(world, quizType, region).map((country) => country.id)
        markSeen(quizType, region, data.country_ids, poolIds)
      } catch (e) {
        console.error(e) // quizet fungerar ändå, bara utan minne
      }
    }

    if (!data.saved) return

    xp.value = data.xp
    saveStatus.value = 'saved'

    // Leta efter nya troféer. Går det inte visas bara inga – resultatet är ju sparat.
    try {
      const found = await findNewTrophies(trophiesBefore)
      if (thisRound !== round.value) return
      newTrophies.value = found
    } catch (e) {
      console.error(e)
    }
  }

  return { status, error, session, result, saveStatus, xp, newTrophies, round, start, answer, onFinished }
}

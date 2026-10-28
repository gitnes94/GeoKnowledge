<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { loadWorld, loadCapitals } from '../services/countries.js'
import { createQuestions, CONTINENTS } from '../services/quiz.js'
import { saveResult } from '../services/results.js'
import { useAuthStore } from '../services/auth'
import QuizRunner from '../components/QuizRunner.vue'
import XpBar from '../components/XpBar.vue'
import NewTrophies from '../components/NewTrophies.vue'
import { startTrophyCheck, findNewTrophies } from '../services/trophies.js'

const route = useRoute()
// Hur många frågor ett quiz har
const QUESTION_COUNT = 10

// Kartdatan, används för att skapa frågorna
const world = shallowRef(null)

// Alla huvudstäder, t.ex SWE: 'Stockholm', DNK: 'Köpenhamn' osv
const capitals = shallowRef(null)

// Frågorna som skickas till QuizRunner
const questions = ref([])

// Resultatet från QuizRunner när quizet är klart, annars null
const result = ref(null)

// Ökas varje ny omgång. Används som :key på QuizRunner så att
// komponenten skapas på nytt och börjar om från fråga 1.
const round = ref(0)

// Felmeddelande om datan inte gick att ladda
const error = ref(null)

// Vilken quiztyp det här är – sparas med resultatet
const QUIZ_TYPE = 'capital'

// Världsdelen quizet spelas för, t.ex. 'Europe' – sparas med resultatet
const continent = ref('World')

// Inloggningen. authStore.token finns bara om användaren är inloggad.
const authStore = useAuthStore()

// Hur det gick att spara resultatet:
//   'idle'          – inget sparat än
//   'saving'        – skickar till backenden
//   'saved'         – sparat
//   'not-logged-in' – inte inloggad, inget skickas
//   'expired'       – inloggningen har gått ut (401)
//   'error'         – något annat gick fel
const saveStatus = ref('idle')

// XP från backenden efter sparningen: { gained, total, level, leveledUp, ... }
const xp = ref(null)

// Troféer som låstes upp av quizet – visas på slutskärmen
const newTrophies = ref([])

// Användarens trofésiffror från när quizet startade. Jämförs med siffrorna
// efter sparningen för att se vilka troféer som är nya.
let trophiesBefore = null

// Tar fram huvudstaden för ett land utifrån dess id, t.ex. 'SWE' → 'Stockholm'
function capitalOf(id) {
  return capitals.value[id]
}

// Startar en ny omgång med nya slumpade frågor
function startQuiz() {
  const queryContinent = route.query.continent
  continent.value = Object.keys(CONTINENTS).includes(queryContinent)
      ? queryContinent
      : 'World'

  questions.value = createQuestions(world.value, QUESTION_COUNT, continent.value)
  result.value = null
  saveStatus.value = 'idle'
  xp.value = null
  newTrophies.value = []
  trophiesBefore = authStore.token ? startTrophyCheck() : null
  round.value++
}

// QuizRunner skickar { correct_count, total } när sista frågan är besvarad.
// Resultatet visas direkt och sparas sedan i backenden om användaren är inloggad.
async function onFinished(quizResult) {
  result.value = quizResult

  // Inte inloggad: quizet fungerar ändå, men inget sparas
  if (!authStore.token) {
    saveStatus.value = 'not-logged-in'
    return
  }

  saveStatus.value = 'saving'

  // Vilken omgång resultatet hör till. Hinner användaren klicka "Spela igen"
  // innan backenden svarat ska det gamla svaret inte visas i den nya omgången.
  const thisRound = round.value

  try {
    const saved = await saveResult({
      quiz_type: QUIZ_TYPE,
      region: continent.value,
      correct_count: quizResult.correct_count,
      total: quizResult.total,
      answers: quizResult.answers,
      // Landet som var rätt svar på varje fråga – för mästartroféerna
      country_ids: questions.value.map((question) => question.correct.id),
    })
    if (thisRound !== round.value) return
    xp.value = saved.xp
    saveStatus.value = 'saved'
  } catch (e) {
    console.error(e)
    if (thisRound !== round.value) return
    // 401 = token saknas, är ogiltig eller har gått ut
    saveStatus.value = e.status === 401 ? 'expired' : 'error'
    return
  }

  // Leta efter nya troféer. Går det inte visas bara inga – resultatet är ju sparat.
  try {
    const found = await findNewTrophies(trophiesBefore)
    if (thisRound !== round.value) return
    newTrophies.value = found
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  try {
    world.value = await loadWorld()
    capitals.value = await loadCapitals()
    startQuiz()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <section class="capital-quiz">
    <p v-if="error" class="status">Något gick fel: {{ error }}</p>

    <p v-else-if="!world" class="status">Laddar quiz…</p>

    <!-- Enkel slutskärm. Den riktiga resultatsidan byggs i #26. -->
    <div v-else-if="result" class="finished">
      <h2>Klart!</h2>
      <p class="final-score">{{ result.correct_count }} av {{ result.total }} rätt</p>

      <!-- Visar om resultatet sparades -->
      <p v-if="saveStatus === 'saving'" class="save-status">Sparar resultatet…</p>
      <p v-else-if="saveStatus === 'saved'" class="save-status success">✓ Resultatet är sparat</p>
      <p v-else-if="saveStatus === 'not-logged-in'" class="save-status">
        <RouterLink to="/login">Logga in</RouterLink> för att spara dina resultat.
      </p>
      <p v-else-if="saveStatus === 'expired'" class="save-status warning">
        Din inloggning har gått ut. <RouterLink to="/login">Logga in igen</RouterLink> för att spara.
      </p>
      <p v-else-if="saveStatus === 'error'" class="save-status warning">
        Resultatet kunde inte sparas just nu.
      </p>
      <!-- XP och nivå, visas när resultatet har sparats -->
      <XpBar
          v-if="xp"
          :level="xp.level"
          :xp-into-level="xp.xpIntoLevel"
          :xp-per-level="xp.xpPerLevel"
          :gained="xp.gained"
          :bonus="xp.bonus"
          :leveled-up="xp.leveledUp"
      />

      <!-- Troféer som låstes upp av det här quizet -->
      <NewTrophies :trophies="newTrophies" />

      <div class="actions">
        <button class="primary" @click="startQuiz">Spela igen</button>
        <RouterLink to="/quiz" class="secondary">Välj ett annat quiz</RouterLink>
      </div>
    </div>

    <template v-else>
      <h2>Vilket land har den här huvudstaden?</h2>

      <!-- QuizRunner sköter frågorna, knapparna och poängen.
           Här skickar vi bara in huvudstaden som ska visas. -->
      <QuizRunner :key="round" :questions="questions" @finished="onFinished">
        <template #default="{ question }">
          <div class="capital-area">
            <p class="capital">{{ capitalOf(question.correct.id) }}</p>
          </div>
        </template>
      </QuizRunner>
    </template>
  </section>
</template>

<style scoped>
.capital-quiz {
  max-width: 44rem;
  margin: 1.5rem auto;
  padding: 2rem 1.5rem;
  width: calc(100% - 2rem);
  text-align: center;
  background: var(--card-bg, #ffffff);
  border-radius: 1.75rem;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
}

h2 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.status {
  opacity: 0.7;
}

/* Ytan där huvudstaden visas – fast höjd så att knapparna inte hoppar */
.capital-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10rem;
  margin: 1rem 0 1.5rem;
}

/* Huvudstaden är själva frågan, så den ska vara stor och tydlig */
.capital {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-green, #1b4d3e);
  overflow-wrap: break-word;
}

.final-score {
  margin: 0.5rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.primary,
.secondary {
  padding: 0.75rem 1.75rem;
  font: inherit;
  font-weight: 700;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
}

.primary {
  color: #ffffff;
  background: var(--primary-green, #1b4d3e);
}

.secondary {
  color: var(--primary-green, #1b4d3e);
  background: #ffffff;
}

/* Meddelandet om resultatet sparades */
.save-status {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
}

.save-status.success {
  color: #2f9e4f;
  font-weight: 700;
}

.save-status.warning {
  color: #b5452f;
}

.save-status a {
  color: inherit;
  font-weight: 700;
}
</style>

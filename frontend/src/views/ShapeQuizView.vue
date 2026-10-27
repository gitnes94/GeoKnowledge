<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { loadWorld, loadCountryDetail } from '../services/countries.js'
import { createQuestions, getRegionCountries, CONTINENTS } from '../services/quiz.js'
import { getSeenIds, markSeen } from '../services/quizHistory.js'
import { saveResult } from '../services/results.js'
import { useAuthStore } from '../services/auth'
import QuizRunner from '../components/QuizRunner.vue'
import XpBar from '../components/XpBar.vue'
import CountryShape from '../components/CountryShape.vue'

// Skapar en router som kan hämta info från URL:en
const route = useRoute()

// Hur många frågor ett quiz har
const QUESTION_COUNT = 10

// Kartdatan. shallowRef eftersom datan är stor och aldrig ändras inuti.
const world = shallowRef(null)
const detail = shallowRef(null)

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
const QUIZ_TYPE = 'shape'

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

// Hittar landets form (GeoJSON-feature) utifrån dess id.
// Använder den detaljerade formen om den hunnit laddas, annars den enkla.
function findFeature(id) {
  const source = detail.value || world.value
  return source.features.find((feature) => feature.properties.id === id)
}

// Startar en ny omgång med nya slumpade frågor
function startQuiz() {
  // Hämta värdet från URL:en
  const queryContinent = route.query.continent

  // Validera att kontinenten finns med i CONTINENTS-objektet, annars 'World'
  continent.value = Object.keys(CONTINENTS).includes(queryContinent)
      ? queryContinent
      : 'World'

  // Länder man redan fått i tidigare quiz väljs sist
  const seenIds = getSeenIds(QUIZ_TYPE, continent.value)
  questions.value = createQuestions(world.value, QUESTION_COUNT, continent.value, seenIds)
  result.value = null
  saveStatus.value = 'idle'
  xp.value = null
  round.value++
}

// QuizRunner skickar { correct_count, total, answers } när sista frågan är besvarad.
// Resultatet visas direkt och sparas sedan i backenden om användaren är inloggad.
async function onFinished(quizResult) {
  result.value = quizResult

  // Kom ihåg vilka länder som var med, så att de inte kommer igen
  // förrän alla länder i världsdelen har varit med
  markSeen(
      QUIZ_TYPE,
      continent.value,
      questions.value.map((question) => question.correct.id),
      getRegionCountries(world.value, continent.value).map((country) => country.id)
  )

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
      answers: quizResult.answers, // behövs för combo-bonusen
    })
    if (thisRound !== round.value) return
    xp.value = saved.xp
    saveStatus.value = 'saved'
  } catch (e) {
    console.error(e)
    if (thisRound !== round.value) return
    // 401 = token saknas, är ogiltig eller har gått ut
    saveStatus.value = e.status === 401 ? 'expired' : 'error'
  }
}

onMounted(async () => {
  try {
    world.value = await loadWorld()
    startQuiz()
  } catch (e) {
    error.value = e.message
    return
  }

  // Detaljerad data laddas i bakgrunden. Går den inte att ladda
  // fortsätter quizet med de enklare formerna.
  try {
    detail.value = await loadCountryDetail()
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <section class="shape-quiz">
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

      <div class="actions">
        <button class="primary" @click="startQuiz">Spela igen</button>
        <RouterLink to="/quiz" class="secondary">Välj ett annat quiz</RouterLink>
      </div>
    </div>

    <template v-else>
      <h2>Vilket land är detta?</h2>

      <!-- QuizRunner sköter frågorna, knapparna och poängen.
           Det vi skickar in i sloten visas ovanför svarsalternativen. -->
      <QuizRunner :key="round" :questions="questions" @finished="onFinished">
        <template #default="{ question }">
          <div class="shape-area">
            <CountryShape :feature="findFeature(question.correct.id)" />
          </div>
        </template>
      </QuizRunner>
    </template>
  </section>
</template>

<style scoped>
.shape-quiz {
  /* CountryShape färgar landet med de här variablerna. Vi skriver över dem
     bara inuti quizet, så att landet blir grönt som på startsidans karta. */
  --color-country: #41ac5a;
  --color-accent: var(--primary-green, #1b4d3e);

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

/* Ytan där landet ritas – fast höjd så att knapparna inte hoppar */
.shape-area {
  height: 16rem;
  margin: 1rem 0 1.5rem;
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
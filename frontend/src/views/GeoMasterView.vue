<script setup>
import { ref, shallowRef, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { loadWorld, loadCountryDetail, loadCapitals } from '../services/countries.js'
import { CONTINENTS } from '../services/quiz.js'
import {
  createJourney,
  createGeoMasterQuestions,
  loadNeighbors,
  QUESTION_KINDS,
  LIVES,
} from '../services/geomaster.js'
import { saveResult } from '../services/results.js'
import { useAuthStore } from '../services/auth'
import { startTrophyCheck, findNewTrophies } from '../services/trophies.js'
import QuizRunner from '../components/QuizRunner.vue'
import XpBar from '../components/XpBar.vue'
import NewTrophies from '../components/NewTrophies.vue'
import CountryShape from '../components/CountryShape.vue'
import RouteMap from '../components/RouteMap.vue'

const route = useRoute()
const authStore = useAuthStore()

const QUIZ_TYPE = 'geomaster'

// Datan som behövs. shallowRef eftersom den är stor och aldrig ändras inuti.
const world = shallowRef(null)
const detail = shallowRef(null)     // detaljerade konturer, laddas i bakgrunden
const neighbors = shallowRef(null)  // { SWE: ['FIN', 'NOR'], ... }
const capitals = shallowRef(null)   // { SWE: 'Stockholm', ... }

// Världsdelen resan går genom, t.ex. 'Europe' – sparas med resultatet
const continent = ref('World')

// Resan: länderna i ordning, och en fråga per land
const journey = ref([])
const questions = ref([])

// De länder man svarat på hittills: [{ id: 'SWE', correct: true }, ...]
const visited = ref([])

// Resultatet från QuizRunner när resan är slut, annars null
const result = ref(null)

// Ökas varje ny resa, så att QuizRunner börjar om från början
const round = ref(0)

const error = ref(null)

// Samma sparstatus som i de andra quizen
const saveStatus = ref('idle')
const xp = ref(null)
const newTrophies = ref([])
let trophiesBefore = null

// Id:n på alla länder i resan – kartan zoomar in på dem
const journeyIds = computed(() => journey.value.map((country) => country.id))

// Hur många fel man gjorde, och om man klarade hela resan
const mistakes = computed(() => visited.value.filter((stop) => !stop.correct).length)
const completed = computed(() => result.value && mistakes.value < LIVES)

// Landets egenskaper (iso2 för flaggan) utifrån id
function countryById(id) {
  return journey.value.find((country) => country.id === id)
}

// Landets form: den detaljerade om den hunnit laddas, annars den enkla
function findFeature(id) {
  const source = detail.value || world.value
  return source.features.find((feature) => feature.properties.id === id)
}

function flagUrl(id) {
  return `/flags/${countryById(id).iso2.toLowerCase()}.svg`
}

// Startar en ny resa
function startJourney() {
  const queryContinent = route.query.continent
  continent.value = Object.keys(CONTINENTS).includes(queryContinent) ? queryContinent : 'World'

  journey.value = createJourney(world.value, neighbors.value, continent.value)
  questions.value = createGeoMasterQuestions(world.value, journey.value, continent.value, capitals.value)
  visited.value = []
  result.value = null
  saveStatus.value = 'idle'
  xp.value = null
  newTrophies.value = []
  trophiesBefore = authStore.token ? startTrophyCheck() : null
  round.value++
}

// QuizRunner skickar 'answered' efter varje svar – då ritas landet på kartan
function onAnswered({ index, correct }) {
  visited.value = [...visited.value, { id: questions.value[index].correct.id, correct }]
}

async function onFinished(quizResult) {
  result.value = quizResult

  if (!authStore.token) {
    saveStatus.value = 'not-logged-in'
    return
  }

  saveStatus.value = 'saving'
  const thisRound = round.value

  try {
    const saved = await saveResult({
      quiz_type: QUIZ_TYPE,
      region: continent.value,
      correct_count: quizResult.correct_count,
      total: quizResult.total,
      answers: quizResult.answers,
      // Landet och frågetypen för varje fråga. Rätt svar räknas mot
      // mästartroféerna för den typen (t.ex. en flaggfråga → flaggor).
      country_ids: questions.value.map((question) => question.correct.id),
      question_types: questions.value.map((question) => question.kind),
    })
    if (thisRound !== round.value) return
    xp.value = saved.xp
    saveStatus.value = 'saved'
  } catch (e) {
    console.error(e)
    if (thisRound !== round.value) return
    saveStatus.value = e.status === 401 ? 'expired' : 'error'
    return
  }

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
    // Allt som behövs för frågorna laddas samtidigt
    const [worldData, neighborData, capitalData] = await Promise.all([
      loadWorld(),
      loadNeighbors(),
      loadCapitals(),
    ])
    world.value = worldData
    neighbors.value = neighborData
    capitals.value = capitalData
    startJourney()
  } catch (e) {
    error.value = e.message
    return
  }

  try {
    detail.value = await loadCountryDetail()
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <section class="geomaster">
    <p v-if="error" class="status">Något gick fel: {{ error }}</p>
    <p v-else-if="!world || questions.length === 0" class="status">Packar väskan…</p>

    <template v-else>
      <header class="title">
        <h2>GeoMaster</h2>
        <p>{{ CONTINENTS[continent] }} · {{ journey.length }} länder</p>
      </header>

      <!-- Kartan med resan hittills. Länder visas först när man svarat på dem. -->
      <div class="map">
        <RouteMap :world="world" :journey-ids="journeyIds" :visited="visited" />
      </div>

      <!-- Slutskärm -->
      <div v-if="result" class="finished">
        <h3>{{ completed ? '🎉 Resan är klar!' : '💔 Slut på liv' }}</h3>
        <p class="final-score">
          {{ result.correct_count }} av {{ result.total }} rätt
          <span v-if="!completed" class="reached">· du kom {{ visited.length }} länder</span>
        </p>

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

        <XpBar
            v-if="xp"
            :level="xp.level"
            :xp-into-level="xp.xpIntoLevel"
            :xp-per-level="xp.xpPerLevel"
            :gained="xp.gained"
            :bonus="xp.bonus"
            :leveled-up="xp.leveledUp"
        />
        <NewTrophies :trophies="newTrophies" />

        <div class="actions">
          <button class="primary" @click="startJourney">Ny resa</button>
          <RouterLink to="/quiz" class="secondary">Välj ett annat quiz</RouterLink>
        </div>
      </div>

      <!-- Frågorna. Typen (kontur, flagga, huvudstad) bestäms per land. -->
      <QuizRunner
          v-else
          :key="round"
          :questions="questions"
          :lives="LIVES"
          @answered="onAnswered"
          @finished="onFinished"
      >
        <template #default="{ question }">
          <h3 class="prompt">{{ QUESTION_KINDS[question.kind] }}</h3>

          <div class="question-area">
            <CountryShape v-if="question.kind === 'shape'" :feature="findFeature(question.correct.id)" />
            <img
                v-else-if="question.kind === 'flag'"
                class="flag"
                :src="flagUrl(question.correct.id)"
                alt="Flagga för landet som ska gissas"
            />
            <p v-else class="capital">{{ capitals[question.correct.id] }}</p>
          </div>
        </template>
      </QuizRunner>
    </template>
  </section>
</template>

<style scoped>
.geomaster {
  /* CountryShape färgar landet med de här variablerna */
  --color-country: #41ac5a;
  --color-accent: var(--primary-green, #1b4d3e);

  max-width: 44rem;
  width: calc(100% - 2rem);
  margin: 1.5rem auto;
  padding: 1.5rem;
  text-align: center;
  background: var(--card-bg, #ffffff);
  border-radius: 1.75rem;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
}

.status {
  opacity: 0.7;
}

.title h2 {
  margin: 0;
  font-size: 1.75rem;
}

.title p {
  margin: 0.125rem 0 0;
  font-size: 0.95rem;
  opacity: 0.75;
}

/* Kartan ligger på ett ljusblått hav, som på startsidan */
.map {
  margin: 1rem 0 1.25rem;
  overflow: hidden;
  background: linear-gradient(180deg, #d4ecf7 0%, #b9dff0 100%);
  border: 2px solid rgba(27, 77, 62, 0.25);
  border-radius: 1.25rem;
}

.prompt {
  margin: 0.75rem 0 0;
  font-size: 1.35rem;
}

/* Fast höjd så att knapparna inte hoppar när frågetypen byts */
.question-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 12rem;
  margin: 0.75rem 0 1.25rem;
}

.flag {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid rgba(27, 77, 62, 0.2);
  border-radius: 0.375rem;
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.15);
}

.capital {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
}

.finished h3 {
  margin: 0;
  font-size: 1.6rem;
}

.final-score {
  margin: 0.375rem 0 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.reached {
  font-weight: 400;
  opacity: 0.8;
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

@media (max-width: 600px) {
  .geomaster {
    width: calc(100% - 1rem);
    padding: 1.25rem 0.75rem;
  }

  .question-area {
    height: 9rem;
  }

  .capital {
    font-size: 1.75rem;
  }
}
</style>

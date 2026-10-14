<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { loadWorld, loadCountryDetail } from '../services/countries.js'
import { createQuestions } from '../services/quiz.js'
import QuizRunner from '../../../../../Downloads/quiz-filer/frontend/src/components/QuizRunner.vue'
import CountryShape from '../components/CountryShape.vue'

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

// Hittar landets form (GeoJSON-feature) utifrån dess id.
// Använder den detaljerade formen om den hunnit laddas, annars den enkla.
function findFeature(id) {
  const source = detail.value || world.value
  return source.features.find((feature) => feature.properties.id === id)
}

// Startar en ny omgång med nya slumpade frågor
function startQuiz() {
  questions.value = createQuestions(world.value, QUESTION_COUNT)
  result.value = null
  round.value++
}

// QuizRunner skickar { correct_count, total } när sista frågan är besvarad
function onFinished(quizResult) {
  result.value = quizResult
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
</style>

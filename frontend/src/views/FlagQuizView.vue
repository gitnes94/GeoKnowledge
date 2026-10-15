<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { loadWorld } from '../services/countries.js'
import { createQuestions } from '../services/quiz.js'
import QuizRunner from '../components/QuizRunner.vue'

// Hur många frågor ett quiz har
const QUESTION_COUNT = 10

// Områden vars flagga är densamma som ett annat lands, eller som inte har
// en egen officiell flagga. De går inte att gissa på och hoppas över.
//   SJ = Svalbard (Norges flagga), GF = Franska Guyana (Frankrikes flagga),
//   TF = Franska sydterritorierna, NC = Nya Kaledonien (Frankrikes flagga)
const EXCLUDED_ISO2 = ['SJ', 'GF', 'TF', 'NC']

// Kartdatan, men bara med länder som passar i ett flaggquiz
const world = shallowRef(null)

// Frågorna som skickas till QuizRunner
const questions = ref([])

// Resultatet från QuizRunner när quizet är klart, annars null
const result = ref(null)

// Ökas varje ny omgång. Används som :key på QuizRunner så att
// komponenten skapas på nytt och börjar om från fråga 1.
const round = ref(0)

// Felmeddelande om datan inte gick att ladda
const error = ref(null)

// Tar fram flaggbildens adress för ett land utifrån dess id.
// Flaggorna ligger i public/flags/ (kopierade med npm run copy-flags) och
// heter som landets tvåbokstavskod med små bokstäver, t.ex. /flags/fr.svg.
function flagUrl(id) {
  const feature = world.value.features.find((f) => f.properties.id === id)
  const iso2 = feature.properties.iso2.toLowerCase()
  return `/flags/${iso2}.svg`
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
    const allCountries = await loadWorld()

    // Gör en kopia av datan utan de områden som inte passar.
    // createQuestions får bara se länder med en egen flagga.
    world.value = {
      ...allCountries,
      features: allCountries.features.filter(
        (feature) => !EXCLUDED_ISO2.includes(feature.properties.iso2)
      ),
    }
    startQuiz()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <section class="flag-quiz">
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
      <h2>Vilket land har den här flaggan?</h2>

      <!-- QuizRunner sköter frågorna, knapparna och poängen.
           Här skickar vi bara in flaggan som ska visas. -->
      <QuizRunner :key="round" :questions="questions" @finished="onFinished">
        <template #default="{ question }">
          <div class="flag-area">
            <img
              class="flag"
              :src="flagUrl(question.correct.id)"
              alt="Flagga för landet som ska gissas"
            />
          </div>
        </template>
      </QuizRunner>
    </template>
  </section>
</template>

<style scoped>
.flag-quiz {
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

/* Ytan där flaggan visas – fast höjd så att knapparna inte hoppar */
.flag-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 14rem;
  margin: 1rem 0 1.5rem;
}

/* object-fit gör att hela flaggan alltid syns, utan att bli utdragen */
.flag {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid rgba(27, 77, 62, 0.2);
  border-radius: 0.375rem;
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.15);
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

<script setup>
// Gemensam sida för konturquiz, flaggquiz och huvudstadsquiz.
// Frågorna skapas och rättas på servern (se useQuizSession), så webbläsaren
// vet aldrig rätt svar i förväg.
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CONTINENTS, MODES } from '../services/quiz.js'
import { useQuizSession } from '../composables/useQuizSession.js'
import QuizRunner from './QuizRunner.vue'
import QuestionPrompt from './QuestionPrompt.vue'
import QuizRewards from './QuizRewards.vue'

// Det som skiljer quizen åt skickas in från vyn
const props = defineProps({
  // Rubriken ovanför frågan, t.ex. 'Vilket land har den här flaggan?'
  title: { type: String, required: true },
  // Quiztypen, t.ex. 'flag'
  quizType: { type: String, required: true },
})

const route = useRoute()

// Spelas quizet på tid? Bara tider som finns i MODES godtas (?time=60).
// Hur lång tiden är bestämmer servern.
const timed = computed(() => {
  const time = Number(route.query.time)
  return MODES.some((mode) => mode.timeLimit !== null && mode.timeLimit === time)
})

// Världsdelen från adressen (?continent=Europe), annars hela världen
function region() {
  const continent = route.query.continent
  return Object.keys(CONTINENTS).includes(continent) ? continent : 'World'
}

// useHistory: länder man redan fått i tidigare quiz väljs sist
const quiz = useQuizSession(
  props.quizType,
  () => ({ region: region(), timed: timed.value }),
  { useHistory: true }
)
const { status, error, session, result, saveStatus, xp, newTrophies, round } = quiz

onMounted(quiz.start)
</script>

<template>
  <section class="quiz-page">
    <p v-if="status === 'error'" class="status">Något gick fel: {{ error }}</p>

    <p v-else-if="status === 'loading'" class="status">Laddar quiz…</p>

    <!-- Slutskärmen när sista frågan är besvarad -->
    <div v-else-if="status === 'finished'" class="finished">
      <h2>Klart!</h2>
      <p v-if="session.time_limit" class="timed-badge">⏱ Spelat på tid</p>
      <p class="final-score">{{ result.correct_count }} av {{ result.total }} rätt</p>

      <!-- Om resultatet sparades, XP och nya troféer -->
      <QuizRewards :save-status="saveStatus" :xp="xp" :new-trophies="newTrophies" />

      <div class="actions">
        <button class="primary" @click="quiz.start">Spela igen</button>
        <RouterLink to="/quiz" class="secondary">Välj ett annat quiz</RouterLink>
      </div>
    </div>

    <template v-else>
      <h2>{{ title }}</h2>

      <!-- QuizRunner sköter knapparna och poängen och frågar servern om svaren.
           Vyn kan skicka in egen markup i sloten – annars visas QuestionPrompt
           (konturen, flaggan eller huvudstaden från servern). -->
      <QuizRunner
          :key="round"
          :questions="session.questions"
          :check-answer="quiz.answer"
          :time-limit="session.time_limit"
          @finished="quiz.onFinished"
      >
        <template #default="{ question }">
          <slot :question="question">
            <QuestionPrompt :question="question" />
          </slot>
        </template>
      </QuizRunner>
    </template>
  </section>
</template>

<style scoped>
.quiz-page {
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

/* Visar på slutskärmen att quizet spelades på tid */
.timed-badge {
  display: inline-block;
  margin: 0.25rem 0 0;
  padding: 0.25rem 0.875rem;
  border-radius: 999px;
  background: var(--primary-green, #1b4d3e);
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
}
</style>

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
  <section class="page quiz-page">
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
        <button class="btn btn-primary" @click="quiz.start">Spela igen</button>
        <RouterLink to="/quiz" class="btn">Välj ett annat quiz</RouterLink>
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
/* Panelen kommer från .page i style.css – här bara centreringen */
.quiz-page {
  /* CountryShape färgar landet med de här variablerna. Vi skriver över dem
     bara inuti quizet, så att landet blir grönt som på startsidans karta. */
  --color-country: var(--green-bright);
  --color-accent: var(--primary-green);

  text-align: center;
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

/* Knapparna på slutskärmen är lite större än en vanlig .btn */
.actions .btn {
  padding: 0.75rem 1.75rem;
}

/* Visar på slutskärmen att quizet spelades på tid */
.timed-badge {
  display: inline-block;
  margin: 0.25rem 0 0;
  padding: 0.25rem 0.875rem;
  border-radius: var(--radius-pill);
  background: var(--primary-green);
  color: var(--white);
  font-size: 0.875rem;
  font-weight: 700;
}

/* Mobil: mindre rubrik, så att den får plats på en rad */
@media (max-width: 520px) {
  h2 {
    font-size: 1.3rem;
  }
}
</style>

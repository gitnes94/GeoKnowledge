<script setup>
// GeoMaster: en resa genom världen där varje land är granne med det förra.
// Varje land blir en fråga av slumpad typ – kontur, flagga eller huvudstad.
// Resan skapas på servern, så att man inte kan se vägen (= alla svar) i förväg.
import { ref, shallowRef, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { loadWorld } from '../services/countries.js'
import { CONTINENTS } from '../services/quiz.js'
import { useQuizSession } from '../composables/useQuizSession.js'
import QuizRunner from '../components/QuizRunner.vue'
import QuestionPrompt from '../components/QuestionPrompt.vue'
import QuizRewards from '../components/QuizRewards.vue'
import RouteMap from '../components/RouteMap.vue'

// Frågetexten för varje frågetyp
const QUESTION_KINDS = {
  shape: 'Vilket land är detta?',
  flag: 'Vilket land har den här flaggan?',
  capital: 'Vilket land har den här huvudstaden?',
}

const route = useRoute()

// Kartdatan för resekartan. shallowRef eftersom den är stor och aldrig ändras inuti.
const world = shallowRef(null)
const worldError = ref(null)

// Världsdelen resan går genom, t.ex. 'Europe'
function region() {
  const continent = route.query.continent
  return Object.keys(CONTINENTS).includes(continent) ? continent : 'World'
}

const quiz = useQuizSession('geomaster', () => ({ region: region(), timed: false }))
const { status, error, session, result, saveStatus, xp, newTrophies, round } = quiz

// De länder man svarat på hittills: [{ id: 'SWE', correct: true }, ...]
// Servern berättar vilket land det var först när man har svarat.
const visited = ref([])

// Hur många fel man gjorde, och om man klarade hela resan
function mistakes() {
  return visited.value.filter((stop) => !stop.correct).length
}
function completed() {
  return mistakes() < session.value.lives
}

// Startar en ny resa
function startJourney() {
  visited.value = []
  quiz.start()
}

// QuizRunner skickar 'answered' efter varje svar – då ritas landet på kartan
function onAnswered({ correct, correctId }) {
  visited.value = [...visited.value, { id: correctId, correct }]
}

onMounted(async () => {
  startJourney()
  try {
    world.value = await loadWorld()
  } catch (e) {
    worldError.value = e.message
  }
})
</script>

<template>
  <section class="page geomaster">
    <p v-if="status === 'error' || worldError" class="status">Något gick fel: {{ error || worldError }}</p>
    <p v-else-if="status === 'loading' || !world" class="status">Packar väskan…</p>

    <template v-else>
      <header class="title">
        <h2>GeoMaster</h2>
        <p>{{ CONTINENTS[session.region] }} · {{ session.questions.length }} länder</p>
      </header>

      <!-- Kartan med resan hittills. Länder visas först när man svarat på dem. -->
      <div class="map">
        <RouteMap
            :world="world"
            :view="session.map_view"
            :total="session.questions.length"
            :visited="visited"
        />
      </div>

      <!-- Slutskärm -->
      <div v-if="status === 'finished'" class="finished">
        <h3>{{ completed() ? '🎉 Resan är klar!' : '💔 Slut på liv' }}</h3>
        <p class="final-score">
          {{ result.correct_count }} av {{ result.total }} rätt
          <span v-if="!completed()" class="reached">· du kom {{ visited.length }} länder</span>
        </p>

        <QuizRewards :save-status="saveStatus" :xp="xp" :new-trophies="newTrophies" />

        <div class="actions">
          <button class="btn btn-primary" @click="startJourney">Ny resa</button>
          <RouterLink to="/quiz" class="btn">Välj ett annat quiz</RouterLink>
        </div>
      </div>

      <!-- Frågorna. Typen (kontur, flagga, huvudstad) bestäms per land. -->
      <QuizRunner
          v-else
          :key="round"
          :questions="session.questions"
          :check-answer="quiz.answer"
          :lives="session.lives"
          @answered="onAnswered"
          @finished="quiz.onFinished"
      >
        <template #default="{ question }">
          <h3 class="prompt">{{ QUESTION_KINDS[question.kind] }}</h3>
          <QuestionPrompt :question="question" compact />
        </template>
      </QuizRunner>
    </template>
  </section>
</template>

<style scoped>
/* Panelen kommer från .page i style.css – här bara det som skiljer sig */
.geomaster {
  /* CountryShape färgar landet med de här variablerna */
  --color-country: var(--green-bright);
  --color-accent: var(--primary-green);

  padding: 1.5rem;
  text-align: center;
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

/* Knapparna på slutskärmen är lite större än en vanlig .btn */
.actions .btn {
  padding: 0.75rem 1.75rem;
}

@media (max-width: 600px) {
  .geomaster {
    width: calc(100% - 1rem);
    padding: 1.25rem 0.75rem;
  }
}
</style>

<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { loadWorld, loadCapitals } from '../services/countries.js'
import QuizPage from '../components/QuizPage.vue'

// Kartdatan, används för att skapa frågorna
const world = shallowRef(null)

// Alla huvudstäder, t.ex SWE: 'Stockholm', DNK: 'Köpenhamn' osv
const capitals = shallowRef(null)

// Felmeddelande om datan inte gick att ladda
const error = ref(null)

// Tar fram huvudstaden för ett land utifrån dess id, t.ex. 'SWE' → 'Stockholm'
function capitalOf(id) {
  return capitals.value[id]
}

onMounted(async () => {
  try {
    // Huvudstäderna först – quizet startar så fort world har ett värde
    capitals.value = await loadCapitals()
    world.value = await loadWorld()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <!-- QuizPage sköter frågorna, sparandet och slutskärmen.
       Här skickar vi bara in huvudstaden som ska visas. -->
  <QuizPage title="Vilket land har den här huvudstaden?" quiz-type="capital" :world="world" :error="error">
    <template #default="{ question }">
      <div class="capital-area">
        <p class="capital">{{ capitalOf(question.correct.id) }}</p>
      </div>
    </template>
  </QuizPage>
</template>

<style scoped>
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
</style>

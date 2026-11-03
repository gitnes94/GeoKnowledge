<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { loadWorld, loadCountryDetail } from '../services/countries.js'
import QuizPage from '../components/QuizPage.vue'
import CountryShape from '../components/CountryShape.vue'

// Kartdatan. shallowRef eftersom datan är stor och aldrig ändras inuti.
const world = shallowRef(null)
const detail = shallowRef(null)

// Felmeddelande om datan inte gick att ladda
const error = ref(null)

// Hittar landets form (GeoJSON-feature) utifrån dess id.
// Använder den detaljerade formen om den hunnit laddas, annars den enkla.
function findFeature(id) {
  const source = detail.value || world.value
  return source.features.find((feature) => feature.properties.id === id)
}

onMounted(async () => {
  try {
    world.value = await loadWorld()
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
  <!-- QuizPage sköter frågorna, sparandet och slutskärmen.
       Här skickar vi bara in landet som ska ritas. -->
  <QuizPage title="Vilket land är detta?" quiz-type="shape" :world="world" :error="error">
    <template #default="{ question }">
      <div class="shape-area">
        <CountryShape :feature="findFeature(question.correct.id)" />
      </div>
    </template>
  </QuizPage>
</template>

<style scoped>
/* Ytan där landet ritas – fast höjd så att knapparna inte hoppar */
.shape-area {
  /* CountryShape färgar landet med de här variablerna. Vi skriver över dem
     bara här, så att landet blir grönt som på startsidans karta. */
  --color-country: #41ac5a;
  --color-accent: var(--primary-green, #1b4d3e);

  height: 16rem;
  margin: 1rem 0 1.5rem;
}
</style>

<script setup>
import { ref, shallowRef, onMounted } from 'vue'
import { loadWorld } from '../services/countries.js'
import { FLAG_EXCLUDED_ISO2 } from '../services/quiz.js'
import QuizPage from '../components/QuizPage.vue'

// Områden utan egen flagga hoppas över – listan finns i quiz.js
const EXCLUDED_ISO2 = FLAG_EXCLUDED_ISO2

// Kartdatan, men bara med länder som passar i ett flaggquiz
const world = shallowRef(null)

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
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <!-- QuizPage sköter frågorna, sparandet och slutskärmen.
       Här skickar vi bara in flaggan som ska visas. -->
  <QuizPage title="Vilket land har den här flaggan?" quiz-type="flag" :world="world" :error="error">
    <template #default="{ question }">
      <div class="flag-area">
        <img
            class="flag"
            :src="flagUrl(question.correct.id)"
            alt="Flagga för landet som ska gissas"
        />
      </div>
    </template>
  </QuizPage>
</template>

<style scoped>
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
</style>

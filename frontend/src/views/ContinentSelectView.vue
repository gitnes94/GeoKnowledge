<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CONTINENTS } from '@/services/quiz.js';

const router = useRouter()
const route = useRoute()

// Läs av vilken quiztyp som spelaren valde innan (standardiserar till 'shape' om inget skickats)
const quizType = computed(() => route.params.type || route.query.type || 'shape')

// Omvandlar CONTINENTS-objektet till en lista (array) som vi kan loopa igenom i templaten.
const continentIcons = {
    World: '🌍',
    Europe: '🇪🇺',
    Asia: '🌏',
    Africa: '🌍',
    'North America': '🌎',
    'South America': '🌎',
    Oceania: '🏝️',
}

const continentList = Object.entries(CONTINENTS).map(([id, name]) => ({
    id,
    name,
    icon: continentIcons[id] || '📍',
}))

// ID på den kontinent som användaren valt, eller null
const selectedId = ref(null)

// Hela objektet för den valda kontinenten (eller undefined)
const selectedContinent = computed(() => continentList.find((c) => c.id === selectedId.value))

function selectContinent(continent) {
    selectedId.value = continent.id
}

function startQuiz() {
  if (!selectedContinent.value) return

  // Tillåt bara quiztyper som finns
  const validTypes = ['shape', 'flag', 'capital', 'geomaster']
  const type = quizType.value

  if (!validTypes.includes(type)) {
    // Om typen är okänd, skicka till quiz-startsidan istället
    router.push('/quiz')
    return
  }

  // Om allt stämmer, navigera till rätt quiz-vy med vald kontinent.
  // Har användaren valt att spela på tid följer ?time= med vidare.
  router.push({
    path: `/quiz/${type}/play`,
    query: { continent: selectedContinent.value.id, time: route.query.time }
  })
}
</script>

<template>
    <section class="page continent-select">
        <h2>Välj världsdel</h2>

        <div class="types">
          <button v-for="continent in continentList" :key="continent.id" class="card type-card"
                :class="{ selected: continent.id === selectedId }" @click="selectContinent(continent)">
                <span class="icon" aria-hidden="true">{{ continent.icon }}</span>
                <span class="name">{{ continent.name }}</span>
            </button>
        </div>

        <p class="chosen">
            <template v-if="selectedContinent">Du har valt: <strong>{{ selectedContinent.name }}</strong></template>
            <template v-else>Klicka på en region för att välja den.</template>
        </p>

      <button class="btn btn-primary start" :disabled="!selectedContinent" @click="startQuiz">
            Starta quiz
        </button>
    </section>
</template>

<style scoped>
/* Panelen kommer från .page i style.css – här bara centreringen */
.continent-select {
  text-align: center;
}

h2 {
  margin: 0.5rem 0 1.5rem;
  font-size: 1.75rem;
}

/* Korten bredvid varandra, under varandra på smala skärmar */
/* minmax(0, 1fr): kolumnerna får aldrig bli bredare än panelen */
.types {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

/* Riktigt smala skärmar: ett kort per rad, så att långa namn får plats */
@media (max-width: 360px) {
  .types {
    grid-template-columns: 1fr;
  }
}

/* Utseende, hover och "vald" kommer från .card i style.css – här bara innehållets layout */
.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.icon {
  font-size: 2rem;
}

.name {
  font-weight: 700;
  font-size: 1.15rem;
}

.chosen {
  margin: 1.5rem 0 0;
}

/* Startknappen är lite större än en vanlig .btn */
.start {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
}
</style>

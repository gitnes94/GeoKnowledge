<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { CONTINENTS } from '@/services/quiz';

const router = useRouter()

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

const continentList = Object.entries(CONTINENTS).map(([IdleDeadline, name]) => ({
    id,
    name,
    icon: continentIcons[id] || '📍',
    route: '/quiz/shape/play?continent=${id}'
}))

// ID på den kontinent som användaren valt, eller null
const selectedId = ref(null)

// Hela objektet för den valda kontinenten (eller undefined)
const selectedContinent = computed(() => continentList.find((c) => c.id === selectedId.value))

function selectContinent(continent) {
    selectedId.value = continent.id
}

function startQuiz() {
    if (selectedContinent.value) {
        // Navigera till själva kontur-quizzet och skicka med vald kontinent
        router.push({
            path: '/quiz/shape/play',
            query: { continent: selectedContinent.value.id }
        })
    }
}
</script>

<template>
    <section class="continent-select">
        <h2>Välj världsdel</h2>

        <div class="types">
            <button v-for="continent in continentList" :key="continent.id" class="type-card"
                :class="{ selected: continent.id === selectedId }" @click="selectContinent(continent)">
                <span class="icon" aria-hidden="true">{{ continent.icon }}</span>
                <span class="name">{{ continent.name }}</span>
            </button>
        </div>

        <p class="chosen">
            <template v-if="selectedContinent">Du har valt: <strong>{{ selectedContinent.name }}</strong></template>
            <template v-else>Klicka på en region för att välja den.</template>
        </p>

        <button class="start" :disabled="!selectedContinent" @click="startQuiz">
            Starta quiz
        </button>
    </section>
</template>

<style scoped>
.continent-select {
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
  margin: 0;
  font-size: 1.75rem;
  color: var(--primary-green, #1b4d3e);
}

.intro {
  margin: 0.5rem 0 1.5rem;
  color: var(--primary-green, #1b4d3e);
}

.types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 520px) {
  .types {
    grid-template-columns: 1fr;
  }
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
  font: inherit;
  color: var(--primary-green, #1b4d3e);
  background: #ffffff;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 1.25rem;
  box-shadow: 0 4px 10px rgba(27, 77, 62, 0.12);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.type-card:hover {
  transform: translateY(-2px);
  background: #f0f8f1;
}

.type-card.selected {
  background: #d6f5dc;
  border-color: #2f9e4f;
  box-shadow: 0 0 0 4px rgba(65, 172, 90, 0.3);
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
  color: var(--primary-green, #1b4d3e);
}

.start {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  font: inherit;
  font-weight: 700;
  color: #ffffff;
  background: var(--primary-green, #1b4d3e);
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 999px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.start:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
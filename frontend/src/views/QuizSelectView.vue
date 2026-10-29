<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MODES } from '@/services/quiz.js'

// Routern – används för att byta sida från kod
const router = useRouter()

// Alla quiztyper. Nya typer läggs till här.
//   route    – sidan quizet finns på (null = inte byggd än)
//   icon     – en emoji som symbol
const QUIZ_TYPES = [
  {
    id: 'shape',
    name: 'Konturquiz',
    description: 'Känn igen länder utifrån deras form.',
    icon: '🗺️',
    route: '/quiz/shape/select',
  },
  {
    id: 'flag',
    name: 'Flaggquiz',
    description: 'Känn igen länder utifrån deras flagga.',
    icon: '🏳️',
    route: '/quiz/flag/select',
  },
  {
    id: 'capital',
    name: 'Huvudstadsquiz',
    description: 'Känn igen länder utifrån deras huvudstad.',
    icon: '🏛️',
    route: '/quiz/capital/select',
  },
  {
    id: 'geomaster',
    name: 'GeoMaster',
    description: 'Res genom världen land för land – kontur, flagga och huvudstad blandat. 3 liv.',
    icon: '🧭',
    route: '/quiz/geomaster/select',
    // GeoMaster har liv i stället för tidsgräns, så lägesvalet visas inte
    hasModes: false,
  },
]

// id på quiztypen användaren valt, eller null
const selectedId = ref(null)

// Läget användaren valt. Vanligt är förvalt
const selectedMode = ref(MODES[0])

// Hela objektet för den valda typen (eller undefined)
const selectedType = computed(() => QUIZ_TYPES.find((type) => type.id === selectedId.value))

// Lägesvalet (vanligt / på tid) visas inte för typer som har hasModes: false
const showModes = computed(() => selectedType.value?.hasModes !== false)

// En typ går att välja bara om den har en sida
function isAvailable(type) {
  return type.route !== null
}

function selectType(type) {
  if (isAvailable(type)) {
    selectedId.value = type.id
  }
}

function startQuiz() {
  if (selectedType.value) {
    const timeLimit = showModes.value ? selectedMode.value.timeLimit : null
    router.push({
      path: selectedType.value.route,
      // ?time=60 följer med till quizet om läget har en tidsgräns
      query: timeLimit ? { time: timeLimit } : {},
    })
  }
}
</script>

<template>
  <section class="quiz-select">
    <h2>Välj quiz</h2>
    <p class="intro">Vilken typ av quiz vill du träna på?</p>

    <div class="types">
      <button
        v-for="type in QUIZ_TYPES"
        :key="type.id"
        class="type-card"
        :class="{ selected: type.id === selectedId }"
        :disabled="!isAvailable(type)"
        @click="selectType(type)"
      >
        <span class="icon" aria-hidden="true">{{ type.icon }}</span>
        <span class="name">{{ type.name }}</span>
        <span class="description">{{ type.description }}</span>
        <span v-if="!isAvailable(type)" class="badge">Kommer snart</span>
      </button>
    </div>

    <p class="chosen">
      <template v-if="selectedType">Du har valt: <strong>{{ selectedType.name }}</strong></template>
      <template v-else>Klicka på en quiztyp för att välja den.</template>
    </p>

    <div v-if="showModes" class="modes">

      <button
        v-for="mode in MODES"
        :key="mode.id"
        type="button"
        class="mode"
        :class="{ selected: mode.id === selectedMode.id }"
        :aria-pressed="mode.id === selectedMode.id"
        @click="selectedMode = mode"
        >
        {{ mode.name }}
      </button>
    </div>

    <button class="start" :disabled="!selectedType" @click="startQuiz">
      Starta quiz
    </button>
  </section>
</template>

<style scoped>
.quiz-select {
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
}

.intro {
  margin: 0.5rem 0 1.5rem;
}

/* Korten bredvid varandra, under varandra på smala skärmar */
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
  gap: 0.375rem;
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

.type-card:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #f0f8f1;
}

/* Den valda typen markeras tydligt */
.type-card.selected {
  background: #d6f5dc;
  border-color: #2f9e4f;
  box-shadow: 0 0 0 4px rgba(65, 172, 90, 0.3);
}

.type-card:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.icon {
  font-size: 2rem;
}

.name {
  font-weight: 700;
  font-size: 1.15rem;
}

.description {
  font-size: 0.9rem;
}

.badge {
  margin-top: 0.25rem;
  padding: 0.125rem 0.625rem;
  border-radius: 999px;
  background: var(--primary-green, #1b4d3e);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
}

.chosen {
  margin: 1.5rem 0 0;
}

/* Valet av läge: vanligt eller på tid */
.modes {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.modes-label {
  font-weight: 700;
}

.mode {
  padding: 0.5rem 1.25rem;
  font: inherit;
  font-weight: 700;
  color: var(--primary-green, #1b4d3e);
  background: #ffffff;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 999px;
  cursor: pointer;
}

/* Det valda läget markeras som de valda korten */
.mode.selected {
  background: #d6f5dc;
  border-color: #2f9e4f;
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
}

.start:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../services/auth'
import { getTrophyStats, loadTrophyWorld, buildTrophies, TROPHY_GROUPS, QUIZ_TYPES } from '../services/trophies.js'
import { CONTINENTS } from '../services/quiz.js'

const authStore = useAuthStore()

// Alla troféer, upplåsta och låsta. null tills de är laddade.
const trophies = ref(null)
const error = ref(null)

// Nivå-, felfritt- och GeoMaster-troféerna, uppdelade per grupp. Visas som kort.
const cardGroups = computed(() =>
  ['level', 'perfect', 'geomaster'].map((key) => ({
    key,
    title: TROPHY_GROUPS[key],
    trophies: trophies.value.filter((trophy) => trophy.group === key),
  }))
)

// Mästartroféerna som tabell: en rad per världsdel, en kolumn per quiztyp
const masterRows = computed(() =>
  Object.entries(CONTINENTS).map(([continent, name]) => ({
    continent,
    name,
    cells: Object.keys(QUIZ_TYPES).map((type) =>
      trophies.value.find(
        (trophy) => trophy.group === 'master' && trophy.quizType === type && trophy.continent === continent
      )
    ),
  }))
)

const unlockedCount = computed(() => trophies.value.filter((trophy) => trophy.unlocked).length)

// Procent av en trofés progress, för stapeln
function percent(progress) {
  return Math.round((progress.current / progress.total) * 100)
}

onMounted(async () => {
  if (!authStore.token) return

  try {
    // Siffrorna och kartdatan hämtas samtidigt
    const [stats, world] = await Promise.all([getTrophyStats(), loadTrophyWorld()])
    trophies.value = buildTrophies(stats, world)
  } catch (e) {
    console.error(e)
    error.value = e.status === 401
      ? 'Din inloggning har gått ut. Logga in igen för att se dina troféer.'
      : 'Troféerna kunde inte hämtas just nu.'
  }
})
</script>

<template>
  <section class="trophies-view">
    <h2>Troféer</h2>

    <p v-if="!authStore.token" class="status">
      <RouterLink to="/login">Logga in</RouterLink> för att samla troféer.
    </p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <p v-else-if="!trophies" class="status">Laddar troféer…</p>

    <template v-else>
      <p class="summary">
        Du har låst upp <strong>{{ unlockedCount }} av {{ trophies.length }}</strong> troféer
      </p>

      <section v-for="group in cardGroups" :key="group.key" class="group">
        <h3>{{ group.title }}</h3>

        <ul class="grid">
          <li
            v-for="trophy in group.trophies"
            :key="trophy.id"
            class="trophy"
            :class="{ locked: !trophy.unlocked }"
          >
            <span class="icon" aria-hidden="true">{{ trophy.icon }}</span>
            <span class="name">{{ trophy.name }}</span>
            <span class="description">{{ trophy.description }}</span>

            <!-- Upplåst: bock. Låst med progress: stapel som visar hur långt man kommit -->
            <span v-if="trophy.unlocked" class="done">✓ Upplåst</span>
            <span v-else-if="trophy.progress" class="progress">
              <span
                class="track"
                role="progressbar"
                :aria-valuenow="trophy.progress.current"
                aria-valuemin="0"
                :aria-valuemax="trophy.progress.total"
                :aria-label="`${trophy.name}: ${trophy.progress.current} av ${trophy.progress.total}`"
              >
                <span class="fill" :style="{ width: percent(trophy.progress) + '%' }"></span>
              </span>
              <span class="numbers">{{ trophy.progress.current }} / {{ trophy.progress.total }}</span>
            </span>
            <span v-else class="done locked-text">Låst</span>
          </li>
        </ul>
      </section>

      <!-- Mästare: en trofé per världsdel och quiztyp -->
      <section class="group">
        <h3>{{ TROPHY_GROUPS.master }}</h3>

        <div class="table-wrapper">
          <table class="master">
            <thead>
              <tr>
                <th scope="col">Världsdel</th>
                <th v-for="(type, key) in QUIZ_TYPES" :key="key" scope="col">
                  <span aria-hidden="true">{{ type.icon }}</span> {{ type.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in masterRows" :key="row.continent">
                <th scope="row">{{ row.name }}</th>
                <td
                  v-for="trophy in row.cells"
                  :key="trophy.id"
                  :class="{ unlocked: trophy.unlocked }"
                  :title="trophy.description"
                >
                  <span v-if="trophy.unlocked" class="done">{{ trophy.icon }} Klar</span>
                  <template v-else>
                    <span
                      class="track"
                      role="progressbar"
                      :aria-valuenow="trophy.progress.current"
                      aria-valuemin="0"
                      :aria-valuemax="trophy.progress.total"
                      :aria-label="`${trophy.name}: ${trophy.progress.current} av ${trophy.progress.total}`"
                    >
                      <span class="fill" :style="{ width: percent(trophy.progress) + '%' }"></span>
                    </span>
                    <span class="numbers">{{ trophy.progress.current }} / {{ trophy.progress.total }}</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
/* ---------- Mästartabellen ---------- */
.table-wrapper {
  overflow-x: auto; /* på väldigt smala skärmar kan tabellen scrollas i sidled */
}

.master {
  width: 100%;
  table-layout: fixed; /* lika breda kolumner för quiztyperna */
  border-collapse: separate;
  border-spacing: 0.375rem;
}

.master th {
  font-size: 0.9rem;
}

.master th[scope='row'],
.master thead th:first-child {
  width: 8rem;
  text-align: left;
}

.master td {
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
  background: #ffffff;
  border: 2px solid rgba(27, 77, 62, 0.15);
  border-radius: 0.875rem;
}

.master td .track {
  display: block;
  margin-bottom: 0.25rem;
}

.master td .numbers {
  display: block;
}

.master td.unlocked {
  background: #fff8e6;
  border-color: #f0b400;
}

.master td .done {
  margin: 0;
  padding: 0;
}

@media (max-width: 600px) {
  .trophies-view {
    padding: 1.5rem 0.75rem;
  }

  .master {
    border-spacing: 0.2rem;
  }

  .master th {
    font-size: 0.75rem;
  }

  .master th[scope='row'],
  .master thead th:first-child {
    width: 4.5rem;
  }

  .master th[scope='row'] {
    font-size: 0.68rem;
    overflow-wrap: anywhere;
  }

  .master td {
    padding: 0.3rem 0.35rem;
  }

  .master td .numbers {
    font-size: 0.7rem;
  }
}

/* ---------- Korten ---------- */
.trophies-view {
  max-width: 60rem;
  width: calc(100% - 2rem);
  margin: 1.5rem auto;
  padding: 2rem 1.5rem;
  text-align: center;
  background: var(--card-bg, #ffffff);
  border-radius: 1.75rem;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
}

h2 {
  margin: 0;
  font-size: 1.75rem;
}

.status,
.summary {
  margin: 0.5rem 0 0;
}

.status a {
  color: inherit;
  font-weight: 700;
}

.group {
  margin-top: 2rem;
}

h3 {
  margin: 0 0 0.875rem;
  font-size: 1.15rem;
}

/* Rutnät som anpassar antalet kolumner efter skärmbredden */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trophy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
  background: #fff8e6;
  border: 3px solid #f0b400;
  border-radius: 1.25rem;
}

/* Låsta troféer: grå ikon och tonad ram */
.trophy.locked {
  background: #ffffff;
  border-color: rgba(27, 77, 62, 0.2);
}

.trophy.locked .icon {
  filter: grayscale(1);
  opacity: 0.45;
}

.icon {
  font-size: 2.25rem;
  line-height: 1.2;
}

.name {
  font-weight: 700;
}

.description {
  font-size: 0.85rem;
  opacity: 0.8;
}

.done {
  margin-top: auto;
  padding-top: 0.375rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #a66f00;
}

.locked-text {
  color: inherit;
  opacity: 0.6;
}

.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: auto;
  padding-top: 0.375rem;
}

.track {
  flex: 1;
  height: 0.5rem;
  border-radius: 999px;
  background: #e3f1e6;
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  background: #41ac5a;
  border-radius: 999px;
}

.numbers {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

/* Mobil: två kort i bredd i stället för ett.
   Ligger sist så att den vinner över de vanliga reglerna ovan. */
@media (max-width: 600px) {
  /* minmax(0, 1fr): kolumnerna får krympa även om ett namn är långt */
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .trophy {
    padding: 0.75rem 0.5rem;
  }

  .icon {
    font-size: 1.75rem;
  }

  .name {
    font-size: 0.8rem;
    overflow-wrap: break-word; /* bryter bara om ordet inte får plats alls */
  }

  .description {
    font-size: 0.75rem;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getLeaderboard } from '@/services/leaderboard'

const tables = [
  { key: 'allQuizzes', title: 'Alla quiz', kind: 'accuracy', description: 'Bäst genomsnittlig träffsäkerhet' },
  { key: 'contour', title: 'Konturquiz', kind: 'accuracy', description: 'Känn igen länder på deras form' },
  { key: 'flags', title: 'Flaggquiz', kind: 'accuracy', description: 'Världens flaggor' },
  { key: 'capitals', title: 'Huvudstadsquiz', kind: 'accuracy', description: 'Hitta huvudstäderna' },
  { key: 'geoMaster', title: 'GeoMaster', kind: 'accuracy', description: 'En geografisk resa med blandade frågor'},
  { key: 'xp', title: 'Mest XP', kind: 'xp', description: 'Samla erfarenhet på alla quiz' },
  { key: 'quizCount', title: 'Flest quiz', kind: 'quiz-count', description: 'Vem har spelat allra mest?' },
]

const leaderboard = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const selectedKey = ref('allQuizzes')

// Spelare vars profilbild inte gick att ladda – de får bokstaven i stället
const failedPictures = ref(new Set())

function pictureFailed(userId) {
  failedPictures.value = new Set(failedPictures.value).add(userId)
}

// Visa bilden om spelaren har en och den gick att ladda
function showPicture(row) {
  return row.pictureUrl && !failedPictures.value.has(row.userId)
}

// Första bokstaven i namnet. [...namn] så att t.ex. Å inte delas på mitten.
function initialOf(name) {
  return ([...name][0] || '?').toUpperCase()
}

const activeTable = computed(() => tables.find((table) => table.key === selectedKey.value))
const activeRows = computed(() => leaderboard.value?.[selectedKey.value] ?? [])

// Hur många frågor man måste ha svarat på för att komma med på listorna för
// andel rätt (bestäms i backenden, leaderboard.js)
const minAnswers = computed(() => leaderboard.value?.minAnswers ?? 0)
const isAccuracy = computed(() => activeTable.value.kind === 'accuracy')

function formatScore(row) {
  if (activeTable.value.kind === 'accuracy') return `${row.percentage}%`
  if (activeTable.value.kind === 'xp') return `${row.xp} XP`
  return row.quiz_count
}

function getProgress(row) {
  const score = Number(activeTable.value.kind === 'accuracy'
    ? row.percentage
    : activeTable.value.kind === 'xp'
      ? row.xp
      : row.quiz_count)
  const leader = activeRows.value[0]
  const leaderScore = Number(activeTable.value.kind === 'accuracy'
    ? leader?.percentage
    : activeTable.value.kind === 'xp'
      ? leader?.xp
      : leader?.quiz_count)

  if (!Number.isFinite(score) || !Number.isFinite(leaderScore) || leaderScore <= 0) return 0
  return Math.min(100, Math.max(0, (score / leaderScore) * 100))
}

function getRankClass(place) {
  if (place === 1) return 'gold'
  if (place === 2) return 'silver'
  if (place === 3) return 'bronze'
  return ''
}

onMounted(async () => {
  try {
    leaderboard.value = await getLeaderboard()
  } catch (error) {
    console.error('Kunde inte läsa in topplistan:', error)
    errorMessage.value = 'Topplistan kunde inte hämtas. Försök igen senare.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="leaderboard-ex3">
    <header class="hero">
      <div class="hero-copy">
        <h1>Topplistor</h1>
      <p>Kolla runt bland topplistorna och se vem som ligger bäst till.</p>

      </div>
    </header>

    <p v-if="isLoading" class="state-message" role="status">Hämtar topplistan …</p>
    <p v-else-if="errorMessage" class="state-message error-message" role="alert">
      {{ errorMessage }}
    </p>

    <template v-else>
      <nav class="category-tabs" aria-label="Välj topplista">
        <button
          v-for="table in tables"
          :key="table.key"
          type="button"
          :aria-pressed="selectedKey === table.key"
          :class="{ active: selectedKey === table.key }"
          @click="selectedKey = table.key"
        >
          {{ table.title }}
        </button>
      </nav>

      <section class="leaderboard-panel" aria-live="polite">
        <header class="panel-heading">
          <div>
            <span class="eyebrow">TOPPLISTA</span>
            <h2>{{ activeTable.title }}</h2>
            <p>{{ activeTable.description }}</p>
            <p v-if="isAccuracy && minAnswers" class="requirement">
              Svara på minst {{ minAnswers }} frågor för att komma med på listan.
            </p>
          </div>
          <span class="metric-badge">{{ activeTable.kind === 'accuracy' ? 'Andel rätt' : activeTable.kind === 'xp' ? 'Erfarenhetspoäng' : 'Genomförda quiz' }}</span>
        </header>

        <p v-if="activeRows.length === 0" class="empty-message">
          <template v-if="isAccuracy && minAnswers">
            Ingen har svarat på {{ minAnswers }} frågor här än. Bli först på listan!
          </template>
          <template v-else>Inga resultat ännu. Bli först på listan!</template>
        </p>

        <template v-else>
          <div class="list-heading">
            <span>PLACERING</span>
            <span>SPELARE</span>
            <span>{{ activeTable.kind === 'accuracy' ? 'ANDEL RÄTT' : activeTable.kind === 'xp' ? 'XP' : 'QUIZ' }}</span>
          </div>
          <ol class="player-list">
            <li
              v-for="row in activeRows"
              :key="row.userId"
              class="player-row"
              :class="{ leader: row.place === 1 }"
            >
              <span class="rank" :class="getRankClass(row.place)">{{ row.place }}</span>
              <!-- Profilbilden, eller första bokstaven om bild saknas.
                   alt är tomt eftersom namnet står direkt bredvid. -->
              <img
                v-if="showPicture(row)"
                :src="row.pictureUrl"
                alt=""
                class="row-avatar row-picture"
                referrerpolicy="no-referrer"
                loading="lazy"
                @error="pictureFailed(row.userId)"
              />
              <span v-else class="row-avatar" aria-hidden="true">{{ initialOf(row.username) }}</span>
              <span class="row-name">{{ row.username }}</span>
              <span class="row-progress" aria-hidden="true">
                <span :style="{ width: `${getProgress(row)}%` }"></span>
              </span>
              <strong class="row-score">{{ formatScore(row) }}</strong>
            </li>
          </ol>
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.leaderboard-ex3 {
  --forest: var(--primary-green, #1b4d3e);
  --muted: #526359;
  width: min(100% - 2rem, 68rem);
  margin: 1.5rem auto 3rem;
  color: var(--forest);
}

.hero {
  position: relative;
  display: grid;
  min-height: 10rem;
  grid-template-columns: minmax(0, 1.15fr) minmax(15rem, 0.85fr);
  align-items: center;
  overflow: hidden;
  padding: clamp(1.5rem, 5vw, 3.25rem);
  border-radius: 1.6rem;
  background:
    radial-gradient(ellipse at 82% 30%, rgba(119, 165, 127, 0.3), transparent 38%),
    linear-gradient(120deg, #163f33, #24634b);
  color: #fff;
  box-shadow: 0 18px 38px rgba(27, 77, 62, 0.18);
}

.hero-copy {
  position: relative;
  z-index: 1;
}

.back-link {
  display: inline-block;
  margin-bottom: 1.25rem;
  color: #e2eee3;
  font-size: 0.85rem;
  font-weight: 650;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.eyebrow,
.demo-label {
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.13em;
}

.eyebrow {
  display: block;
  color: #c5ddc8;
}

h1 {
  margin: 0.4rem 0 0;
  font-size: clamp(2.4rem, 5.5vw, 4rem);
  font-weight: 650;
  letter-spacing: -0.065em;
  line-height: 0.98;
}

.hero-copy > p {
  max-width: 27rem;
  margin: 0.8rem 0 0;
  color: #d3e3d6;
  font-size: 0.98rem;
  line-height: 1.6;
}

.demo-label {
  display: inline-block;
  padding: 0.42rem 0.6rem;
  border: 1px solid rgba(226, 238, 227, 0.32);
  border-radius: 999px;
  color: #e2eee3;
  font-size: 0.61rem;
  letter-spacing: 0.08em;
}

.category-tabs {
  display: flex;
  gap: 0.4rem;
  margin: 1.25rem 0 1rem;
  padding: 0.35rem;
  overflow-x: auto;
  border: 1px solid rgba(27, 77, 62, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.78);
  scrollbar-width: thin;
}

.category-tabs button {
  flex: 0 0 auto;
  padding: 0.7rem 1rem;
  border: 0;
  border-radius: 0.7rem;
  background: transparent;
  color: #60766b;
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 650;
  transition: background 0.15s ease, color 0.15s ease;
}

.category-tabs button:hover {
  background: #f0f6f1;
}

.category-tabs button.active {
  background: var(--forest);
  color: #fff;
  box-shadow: 0 3px 8px rgba(27, 77, 62, 0.18);
}

.category-tabs button:focus-visible,
.back-link:focus-visible {
  outline: 3px solid #78b795;
  outline-offset: 3px;
}

.leaderboard-panel {
  padding: clamp(1.1rem, 4vw, 2rem);
  border: 1px solid rgba(27, 77, 62, 0.08);
  border-radius: 1.6rem;
  background: #fff;
  box-shadow: 0 18px 50px rgba(27, 77, 62, 0.1);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.panel-heading h2 {
  margin: 0.2rem 0 0;
  font-size: 1.35rem;
  letter-spacing: -0.025em;
}

.panel-heading p {
  margin: 0.3rem 0 0;
  color: var(--muted);
  font-size: 0.86rem;
}

.panel-heading .eyebrow {
  color: var(--muted);
}

.metric-badge {
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  background: #f1f7f2;
  color: #577365;
  font-size: 0.76rem;
  font-weight: 650;
  white-space: nowrap;
}

.row-avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #d6e9da;
  color: var(--forest);
  font-weight: 750;
}

.list-heading,
.player-row {
  display: grid;
  grid-template-columns: 2.2rem 2.2rem minmax(0, 1fr) minmax(4rem, 8rem) auto;
  align-items: center;
  column-gap: 0.75rem;
}

.list-heading {
  padding: 0.8rem 0.75rem;
  border-bottom: 1px solid #e9efea;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.list-heading span:first-child {
  grid-column: 1 / 3;
}

.list-heading span:nth-child(2) {
  grid-column: 3;
}

.list-heading span:last-child {
  grid-column: 5;
  text-align: right;
}

.player-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.player-row {
  min-height: 3.8rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid #edf1ed;
}

.player-row:last-child {
  border-bottom: 0;
}

.player-row.leader {
  border-radius: 0.7rem;
  background: #f7faf6;
}

.rank {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.rank.gold {
  color: #855a15;
}

.rank.silver {
  color: #5b6667;
}

.rank.bronze {
  color: #7d4d29;
}

.row-avatar {
  width: 2rem;
  height: 2rem;
  font-size: 0.78rem;
}

/* Profilbilden fyller den runda rutan utan att bli utdragen */
.row-picture {
  object-fit: cover;
}

.row-name {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-progress {
  display: block;
  height: 0.25rem;
  overflow: hidden;
  border-radius: 999px;
  background: #edf2ed;
}

.row-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #84b98b, #347b55);
}

.row-score {
  font-size: 0.88rem;
  text-align: right;
  white-space: nowrap;
}

.panel-heading .requirement {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--muted);
}

.empty-message,
.state-message {
  margin: 1rem 0;
  padding: 1rem;
  color: var(--muted);
  text-align: center;
}

.state-message {
  border-radius: 0.9rem;
  background: #fff;
}

.error-message {
  color: #9e2929;
}

@media (max-width: 680px) {
  .hero {
    min-height: 15rem;
    grid-template-columns: minmax(0, 1fr) minmax(10rem, 0.7fr);
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-heading,
  .player-row {
    grid-template-columns: 1.6rem 1.8rem minmax(0, 1fr) auto;
    column-gap: 0.5rem;
  }

  .list-heading span:nth-child(2) {
    grid-column: 3;
  }

  .list-heading span:last-child {
    grid-column: 4;
  }

  .row-progress {
    display: none;
  }
}

@media (max-width: 480px) {
  .leaderboard-ex3 {
    width: min(100% - 1.25rem, 68rem);
    margin-top: 0.75rem;
  }

  .hero {
    min-height: 0;
    grid-template-columns: 1fr;
    padding: 1.4rem;
  }

  .back-link {
    margin-bottom: 1rem;
  }

  .hero-art {
    position: absolute;
    right: -3.4rem;
    bottom: 0.3rem;
    width: 13rem;
    min-height: 0;
    opacity: 0.43;
  }

  .hero-art svg {
    width: 100%;
  }

  .art-caption {
    display: none;
  }

  .hero-copy > p {
    max-width: 17rem;
    font-size: 0.9rem;
  }

  .category-tabs {
    margin-top: 0.9rem;
  }

  .category-tabs button {
    padding: 0.65rem 0.8rem;
  }

}
</style>

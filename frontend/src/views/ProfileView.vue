<script setup>

import { ref, onMounted, computed } from 'vue'
import { getResults } from '../services/results.js'
import { getProgress } from '../services/progress.js'
import XpBar from '../components/XpBar.vue'
import { getTrophyStats, loadTrophyWorld, buildTrophies } from '../services/trophies.js'
import { useAuthStore } from '@/services/auth'

const authStore = useAuthStore()

// Första bokstaven i namnet, visas om inte användaren har något bild
const initial = computed(() =>
    [...(authStore.user?.username ?? '?')][0].toUpperCase())

// Blir true om profilbilden inte gick att ladda, då visas bokstaven i stället
const imageFailed = ref(false)

const result = ref([])
const progress = ref(null)


// Alla troféer, upplåsta och låsta (null tills de har hämtats)
const trophies = ref(null)

// Hur stor del av en trofé man har klarat, mellan 0 och 1
function progressShare(trophy) {
  return trophy.progress.current / trophy.progress.total
}

// Nästa trofé att sikta på: den låsta trofé man har kommit längst på
const nextTrophy = computed(() => {
  if (!trophies.value) return null
  const locked = trophies.value.filter((trophy) => !trophy.unlocked && trophy.progress)
  if (locked.length === 0) return null
  return locked.reduce((best, trophy) => (progressShare(trophy) > progressShare(best) ? trophy : best))
})

const quizMap = {
    flag: 'Flaggquiz',
    shape: 'Konturquiz',
    capital: 'Huvudstadsquiz'
}

const regionMap = {
    World: 'Hela världen',
    Europe: 'Europa',
    Asia: 'Asien',
    Africa: 'Afrika',
    'North America': 'Nordamerika',
    'South America': 'Sydamerika',
    Oceania: 'Oceanien'
}

const currentPage = ref(1)
const itemsPerPage = ref(6)

// Statistik och bläddring räknas ut från result och uppdateras automatiskt
const totalCorrect = computed(() =>
    result.value.reduce((accumulator, currentItem) => accumulator + currentItem.correct_count, 0))
const totalAnswers = computed(() =>
    result.value.reduce((accumulator, currentItem) => accumulator + currentItem.total, 0))
// Andel rätt i procent (0 om man inte har spelat något än)
const percentCorrect = computed(() =>
  totalAnswers.value > 0 ? Math.round((totalCorrect.value / totalAnswers.value) * 100) : 0)
const totalPages = computed(() => Math.max(1, Math.ceil(result.value.length / itemsPerPage.value)))
const paginatedResult = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return result.value.slice(start, end)
})

// Navigation methods
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// Hämtar troféernas siffror och kartdatan, och räknar ut troféerna
async function loadTrophies() {
  const [stats, world] = await Promise.all([getTrophyStats(), loadTrophyWorld()])
  return buildTrophies(stats, world)
}

onMounted(async () => {
  const [resultRes, progressRes, trophiesRes] = await Promise.allSettled([
    getResults(),
    getProgress(),
    loadTrophies()
  ])

  if (resultRes.status === 'fulfilled') {
    result.value = resultRes.value
  } else {
    console.error('Failed to load results:', resultRes.reason)
  }

  if (progressRes.status === 'fulfilled') {
    progress.value = progressRes.value
  } else {
    console.error('Failed to load progress:', progressRes.reason)
  }

  if (trophiesRes.status === 'fulfilled') {
    trophies.value = trophiesRes.value
  } else {
    console.error('Failed to load trophies:', trophiesRes.reason)
  }
})
</script>

<template>
    <section class="profile">
      <div class="profile-header">
        <img
            v-if="authStore.user?.picture_url && !imageFailed"
            :src="authStore.user.picture_url"
            alt="Profilbild"
            class="avatar"
            referrerpolicy="no-referrer"
            @error="imageFailed = true"
        />
        <span v-else class="avatar avatar-initial" aria-hidden="true">{{ initial }}</span>
        <h2 class="profile-name">{{ authStore.user?.username }}</h2>
      </div>
      <!-- XP och nivå -->
        <XpBar v-if="progress"
            :level="progress.level"
            :xp-into-level="progress.xpIntoLevel"
            :xp-per-level="progress.xpPerLevel"
        />

      <!-- Nästa trofé att låsa upp -->
      <div class="boxes">
        <div class="box">
        <h3>Nästa trofé</h3>
        <template v-if="nextTrophy">
          <p class="trophy-name">
            <span aria-hidden="true">{{ nextTrophy.icon }}</span> {{ nextTrophy.name }}
          </p>
          <p class="muted">{{ nextTrophy.description }}</p>

          <div
              class="track"
              role="progressbar"
              :aria-valuenow="nextTrophy.progress.current"
              aria-valuemin="0"
              :aria-valuemax="nextTrophy.progress.total"
              :aria-label="`${nextTrophy.name}: ${nextTrophy.progress.current} av ${nextTrophy.progress.total}`"
          >
            <div class="fill" :style="{ width: Math.round(progressShare(nextTrophy) * 100) + '%' }"></div>
          </div>

        </template>
        <p v-else-if="trophies">Du har låst upp alla troféer du kan sikta på! 🎉</p>
        <RouterLink to="/menu/trophies" class="button">Visa mina troféer</RouterLink>
      </div>

      <!-- Statistik -->
      <div class="box">
        <h3>Statistik</h3>
        <p class="big-number">{{ percentCorrect }} %</p>
        <p class="muted">{{ totalCorrect }} av {{ totalAnswers }} rätt</p>
      </div>
      </div>

      <!-- Senaste quiz -->
        <h3>Senaste quiz</h3>
        <p v-if="result.length === 0" class="muted">Du har inte spelat något quiz än.</p>
        <ul v-else class="history">
          <li v-for="item in paginatedResult" :key="item.id">
            <span class="muted">{{ new Date(item.created_at).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</span>
            <span>
              {{ quizMap[item.quiz_type] || 'Okänt' }} · {{ regionMap[item.region] || 'Okänt' }}
              <span v-if="item.timed" title="Spelat på tid">⏱</span>
            </span>
            <strong>{{ item.correct_count }}/{{ item.total }}</strong>
          </li>
        </ul>
        <div v-if="totalPages > 1" class="pagination-controls">
          <button type="button" class="button" :disabled="currentPage === 1" @click="prevPage">Föregående</button>
          <span>Sida {{ currentPage }} av {{ totalPages }}</span>
          <button type="button" class="button" :disabled="currentPage >= totalPages" @click="nextPage">Nästa</button>
        </div>
    </section>
</template>

<style scoped>

/* Hela profilen är ett stort kort – samma mått och stil som Meny och Troféer */
.profile {
  max-width: 44rem;
  width: calc(100% - 2rem);
  margin: 1.5rem auto;
  padding: 2rem 1.5rem;
  text-align: center;
  background: var(--card-bg, #ffffff);
  border-radius: 1.75rem;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
}

/* Rubrikerna inuti kortet: Nästa trofé, Statistik och Senaste quiz */
.profile h3 {
  margin: 0 0 0.75rem;
  font-size: 1.2rem;
  color: var(--primary-green, #1b4d3e);
}

/* Nästa trofé: namnet med ikon */
.trophy-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

/* Stapeln för nästa trofé – samma utseende som XP-stapeln */
.track {
  height: 0.875rem;
  margin: 0.5rem 0 0.25rem;
  border-radius: 999px;
  background: #e3f1e6;
  border: 2px solid var(--primary-green, #1b4d3e);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: #41ac5a;
}


/* De två rutorna bredvid varandra – under varandra på smala skärmar */
.boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0;
}

@media (max-width: 520px) {
  .boxes {
    grid-template-columns: 1fr;
  }
}

/* En ruta med grön ram – samma stil som korten i menyn och quizvalet */
.box {
  padding: 1.25rem 1rem;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 1.25rem;
  box-shadow: 0 4px 10px rgba(27, 77, 62, 0.12);
}


/* Dämpad text, t.ex. datum och beskrivningar */
.muted {
  margin: 0.25rem 0;
  opacity: 0.75;
}

/* Den stora procentsiffran i statistikrutan */
.big-number {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--primary-green, #1b4d3e);
}

/* Historiken: en rad per quiz, med en tunn linje emellan */
.history {
  margin: 0;
  padding: 0;
  list-style: none;
}

.history li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(27, 77, 62, 0.12);
}

.history li:last-child {
  border-bottom: none;
}


/* Bläddringen under historiken */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* Knappar och länken till troféerna – samma stil som knapparna på quizsidorna */
.button {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.5rem 1.25rem;
  font: inherit;
  font-weight: 700;
  color: var(--primary-green, #1b4d3e);
  background: #ffffff;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Överst på profilsidan: bild och namn som sidans rubrik, centrerat */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

/* Runda profilbilden */
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

/* Rutan med första bokstaven när bild saknas */
.avatar-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-green, #1b4d3e);
  color: #ffffff;
  font-size: 1.75rem;
  font-weight: 700;
}

.profile-name {
  margin: 0;
  font-size: 1.75rem;
  color: var(--primary-green, #1b4d3e);
}
</style>

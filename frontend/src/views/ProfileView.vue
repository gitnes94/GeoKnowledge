<script setup>

import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getResults } from '../services/results.js'
import { updateUsername, deleteAccount } from '../services/users.js'
import { getProgress } from '../services/progress.js'
import XpBar from '../components/XpBar.vue'
import { getTrophyStats, loadTrophyWorld, buildTrophies } from '../services/trophies.js'
import { useAuthStore } from '@/services/auth'

const authStore = useAuthStore()
const router = useRouter()

// ---- Byta visningsnamn ----

// true när formuläret för nytt namn visas
const editingName = ref(false)
// Det som står i textrutan
const nameDraft = ref('')
// Felmeddelande från servern, t.ex. "Namnet är redan upptaget"
const nameError = ref(null)
// true medan namnet sparas, så att man inte kan klicka två gånger
const savingName = ref(false)
// Textrutan – får fokus när formuläret öppnas
const nameInput = ref(null)

async function startEditingName() {
  nameDraft.value = authStore.user?.username || ''
  nameError.value = null
  editingName.value = true
  await nextTick()
  nameInput.value?.select()
}

function cancelEditingName() {
  editingName.value = false
  nameError.value = null
}

async function saveName() {
  if (savingName.value) return
  savingName.value = true
  nameError.value = null
  try {
    // Servern kontrollerar namnet och svarar med det sparade (snyggade) namnet.
    // setUser uppdaterar både profilen och "Inloggad som" i headern direkt.
    const user = await updateUsername(nameDraft.value)
    authStore.setUser(user)
    editingName.value = false
  } catch (e) {
    // 400 och 409 är vanliga svar (för kort namn, upptaget) – inget att logga
    if (e.status !== 400 && e.status !== 409) console.error(e)
    nameError.value = e.status === 401
      ? 'Din inloggning har gått ut. Logga in igen för att byta namn.'
      : e.status === 400 || e.status === 409
        ? e.message
        : 'Namnet kunde inte sparas just nu. Försök igen.'
  } finally {
    savingName.value = false
  }
}

// ---- Ta bort konto ----

// true när frågan "Är du säker?" visas
const confirmingDelete = ref(false)
const deleting = ref(false)
const deleteError = ref(null)

async function removeAccount() {
  if (deleting.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await deleteAccount()
    // Kontot finns inte längre – logga ut och visa ett meddelande på startsidan
    authStore.logout()
    router.push({ path: '/', query: { konto: 'borttaget' } })
  } catch (e) {
    console.error(e)
    deleteError.value = e.status === 401
      ? 'Din inloggning har gått ut. Logga in igen för att ta bort kontot.'
      : 'Kontot kunde inte tas bort just nu. Försök igen.'
    deleting.value = false
  }
}

// Första bokstaven i namnet, visas om inte användaren har något bild
const initial = computed(() =>
    [...(authStore.user?.username || '?')][0].toUpperCase())

// Blir true om profilbilden inte gick att ladda, då visas bokstaven i stället
const imageFailed = ref(false)

const result = ref([])
// Blir true om resultaten inte gick att hämta, så att vi inte visar en falsk tom historik
const resultsError = ref(false)
// true medan resultaten hämtas, så att vi inte visar "inga quiz" innan de har kommit
const resultsLoading = ref(true)

const progress = ref(null)
// Blir true om XP:n inte gick att hämta
const progressError = ref(false)


// Alla troféer, upplåsta och låsta (null tills de har hämtats)
const trophies = ref(null)
// Blir bara truer om troféerna inte gick att hämta
const trophiesError = ref(false)

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
// Texten i statistikrutan: … medan den laddar, – vid fel, annars procenten
const percentText = computed(() => {
  if (resultsLoading.value) return '…'
  if (resultsError.value) return '–'
  return percentCorrect.value + ' %'
})
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

// Varje del hämtas för sig och visas så fort dess data har kommit.
// De långsamma troféerna gör alltså inte att historiken och XP:n väntar.
onMounted(() => {
  getResults()
      .then((data) => { result.value = data })
      .catch((error) => {
        resultsError.value = true
        console.error('Failed to load results:', error)
      })
      .finally(() => { resultsLoading.value = false })

  getProgress()
      .then((data) => { progress.value = data })
      .catch((error) => {
        progressError.value = true
        console.error('Failed to load progress:', error)
      })

  loadTrophies()
      .then((data) => { trophies.value = data })
      .catch((error) => {
        trophiesError.value = true
        console.error('Failed to load trophies:', error)
      })
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

        <!-- Namnet, eller formuläret för att byta det -->
        <form v-if="editingName" class="name-form" @submit.prevent="saveName" @keydown.esc="cancelEditingName">
          <label for="new-name" class="visually-hidden">Nytt visningsnamn</label>
          <input
              id="new-name"
              ref="nameInput"
              v-model="nameDraft"
              class="name-input"
              type="text"
              maxlength="30"
              autocomplete="nickname"
              :aria-invalid="nameError ? 'true' : 'false'"
              aria-describedby="name-help"
              :disabled="savingName"
          />
          <p id="name-help" class="muted name-help">2–30 tecken. Namnet syns på topplistan.</p>
          <p v-if="nameError" class="form-error" role="alert">{{ nameError }}</p>
          <div class="form-actions">
            <button type="submit" class="button primary" :disabled="savingName">
              {{ savingName ? 'Sparar…' : 'Spara' }}
            </button>
            <button type="button" class="button" :disabled="savingName" @click="cancelEditingName">Avbryt</button>
          </div>
        </form>
        <template v-else>
          <h2 class="profile-name">{{ authStore.user?.username }}</h2>
          <button v-if="authStore.isLoggedIn" type="button" class="link-button" @click="startEditingName">
            ✏️ Ändra namn
          </button>
        </template>
      </div>
      <!-- XP och nivå -->
        <XpBar v-if="progress"
            :level="progress.level"
            :xp-into-level="progress.xpIntoLevel"
            :xp-per-level="progress.xpPerLevel"
        />
      <p v-else-if="progressError" class="muted">Kunde inte hämta din XP just nu.</p>


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
          <p v-else-if="trophiesError" class="muted">Kunde inte hämta troféerna just nu.</p>
          <p v-else-if="trophies">Du har låst upp alla troféer du kan sikta på! 🎉</p>
        <RouterLink to="/menu/trophies" class="button">Visa mina troféer</RouterLink>
      </div>

        <!-- Statistik -->
        <div class="box">
          <h3>Statistik</h3>
          <p class="big-number">{{ percentText }}</p>
          <p v-if="!resultsLoading && !resultsError" class="muted">{{ totalCorrect }} av {{ totalAnswers }} rätt</p>
          <RouterLink to="/menu/leaderboard" class="button">Visa topplistan</RouterLink>
        </div>
      </div>

      <!-- Senaste quiz -->
      <h3>Senaste quiz</h3>
      <p v-if="resultsLoading" class="muted">Laddar…</p>
      <p v-else-if="resultsError" class="muted">Kunde inte hämta dina resultat just nu.</p>
      <p v-else-if="result.length === 0" class="muted">Du har inte spelat något quiz än.</p>
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

      <!-- Ta bort konto – längst ner, och man måste bekräfta först -->
      <div v-if="authStore.isLoggedIn" class="danger-zone">
        <button
            v-if="!confirmingDelete"
            type="button"
            class="button danger"
            @click="confirmingDelete = true"
        >
          Ta bort konto
        </button>

        <div v-else class="confirm-delete" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-text">
          <h3 id="confirm-title">Vill du ta bort ditt konto?</h3>
          <p id="confirm-text">
            Alla dina resultat, din XP och dina troféer tas bort och går inte att få tillbaka.
            Du kan logga in med Google igen senare, men börjar då om från noll.
          </p>
          <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
          <div class="form-actions">
            <button type="button" class="button danger filled" :disabled="deleting" @click="removeAccount">
              {{ deleting ? 'Tar bort…' : 'Ja, ta bort mitt konto' }}
            </button>
            <button type="button" class="button" :disabled="deleting" @click="confirmingDelete = false; deleteError = null">
              Avbryt
            </button>
          </div>
        </div>
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

.box {
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1rem;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 1.25rem;
  box-shadow: 0 4px 10px rgba(27, 77, 62, 0.12);
}

/* Knappen längst ner i rutan, så att knapparna i båda rutorna hamnar på samma höjd */
.box .button {
  margin-top: auto;
  align-self: center;
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

/* Hover: samma effekt som korten och knapparna i resten av appen */
.button:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #f0f8f1;
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

/* Knappen "Ändra namn" under namnet – ser ut som en länk */
.link-button {
  padding: 0.25rem 0.5rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--primary-green, #1b4d3e);
  background: none;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.link-button:hover {
  background: #f0f8f1;
}

/* Formuläret för nytt namn */
.name-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  max-width: 22rem;
}

.name-input {
  width: 100%;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
  color: var(--primary-green, #1b4d3e);
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 999px;
}

.name-input:focus-visible {
  outline: 3px solid #41ac5a;
  outline-offset: 2px;
}

.name-input[aria-invalid='true'] {
  border-color: var(--color-wrong, #c62828);
}

.name-help {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
}

.form-error {
  margin: 0.25rem 0 0;
  color: var(--color-wrong, #c62828);
  font-weight: 700;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

/* Spara: fylld grön, som "Spela igen" på quizsidorna */
.button.primary {
  color: #ffffff;
  background: var(--primary-green, #1b4d3e);
}

.button.primary:hover:not(:disabled) {
  background: #24614f;
}

/* Ta bort konto: längst ner, avskild från resten */
.danger-zone {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed rgba(27, 77, 62, 0.2);
}

.button.danger {
  color: var(--color-wrong, #c62828);
  border-color: var(--color-wrong, #c62828);
}

.button.danger:hover:not(:disabled) {
  background: #fdecea;
}

.button.danger.filled {
  color: #ffffff;
  background: var(--color-wrong, #c62828);
}

.button.danger.filled:hover:not(:disabled) {
  background: #a51f1f;
}

.confirm-delete {
  padding: 1.25rem;
  border: 2px solid var(--color-wrong, #c62828);
  border-radius: 1.25rem;
  background: #fff6f5;
}

.profile .confirm-delete h3 {
  color: var(--color-wrong, #c62828);
}

.confirm-delete p {
  margin: 0 0 0.5rem;
}

/* Text som bara skärmläsare läser upp */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>

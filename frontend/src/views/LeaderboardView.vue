<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getLeaderboard } from '@/services/leaderboard'
import { useAuthStore } from '@/services/auth'
import PlayerAvatar from '@/components/PlayerAvatar.vue'

const authStore = useAuthStore()

// Listorna. noun används i "Du har svarat på 12 av 30 flaggfrågor".
const tables = [
  { key: 'allQuizzes', title: 'Alla quiz', kind: 'accuracy', description: 'Bäst genomsnittlig träffsäkerhet', noun: 'frågor' },
  { key: 'contour', title: 'Konturquiz', kind: 'accuracy', description: 'Känn igen länder på deras form', noun: 'konturfrågor' },
  { key: 'flags', title: 'Flaggquiz', kind: 'accuracy', description: 'Världens flaggor', noun: 'flaggfrågor' },
  { key: 'capitals', title: 'Huvudstadsquiz', kind: 'accuracy', description: 'Hitta huvudstäderna', noun: 'huvudstadsfrågor' },
  { key: 'geoMaster', title: 'GeoMaster', kind: 'accuracy', description: 'En geografisk resa med blandade frågor', noun: 'GeoMaster-frågor' },
  { key: 'xp', title: 'Mest XP', kind: 'xp', description: 'Samla erfarenhet på alla quiz' },
  { key: 'quizCount', title: 'Flest quiz', kind: 'quiz-count', description: 'Vem har spelat allra mest?' },
]

// Rubriken på poängkolumnen
const SCORE_HEADINGS = { accuracy: 'ANDEL RÄTT', xp: 'XP', 'quiz-count': 'QUIZ' }

const leaderboard = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const selectedKey = ref('allQuizzes')

const activeTable = computed(() => tables.find((table) => table.key === selectedKey.value))
const activeRows = computed(() => leaderboard.value?.[selectedKey.value] ?? [])
const isAccuracy = computed(() => activeTable.value.kind === 'accuracy')

// Hur många frågor man måste ha svarat på för att komma med på listorna för
// andel rätt (bestäms i backenden, leaderboard.js)
const minAnswers = computed(() => leaderboard.value?.minAnswers ?? 0)

// Prispallen: alla med placering 1–3, grupperade per placering. Backenden
// avgör lika resultat (den som kom dit först vinner), så det står i praktiken
// en spelare per pall – men skulle två ändå dela en placering hamnar de på
// samma pall i stället för att en av dem trillar ner i listan.
//   [{ place: 1, rows: [...] }, { place: 3, rows: [..., ...] }]
const podiumGroups = computed(() => {
  const groups = []
  for (const row of activeRows.value) {
    if (row.place > 3) break
    const last = groups[groups.length - 1]
    if (last && last.place === row.place) last.rows.push(row)
    else groups.push({ place: row.place, rows: [row] })
  }
  return groups
})

// Listan under pallen: alla med placering 4 och nedåt
const listRows = computed(() => activeRows.value.filter((row) => row.place > 3))

// ---- Siffror på svenska: 93,3 %, 1 180 XP ----
const decimal = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('sv-SE')
//   = mellanslag som inte bryts, så att "93,3 %" hålls ihop
const percent = (value) => `${decimal.format(value)} %`

function scoreValue(row) {
  if (activeTable.value.kind === 'accuracy') return row.percentage
  if (activeTable.value.kind === 'xp') return row.xp
  return row.quiz_count
}

function formatScore(row) {
  if (activeTable.value.kind === 'accuracy') return percent(row.percentage)
  if (activeTable.value.kind === 'xp') return `${whole.format(row.xp)} XP`
  return whole.format(row.quiz_count)
}

// Stapelns längd i procent av ettans poäng
function getProgress(row) {
  const score = Number(scoreValue(row))
  const leaderScore = Number(activeRows.value[0] ? scoreValue(activeRows.value[0]) : 0)
  if (!Number.isFinite(score) || !Number.isFinite(leaderScore) || leaderScore <= 0) return 0
  return Math.min(100, Math.max(0, (score / leaderScore) * 100))
}

// Medalj efter placering. Delad placering ger samma medalj.
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

// Pallarna (första, andra, tredje) i ordning. Ettan står i mitten och
// högst – det sköts med CSS (order och höjd).
const SPOTS = ['first', 'second', 'third']

// Profilbildens storlek: störst för ettan, mindre när flera delar en pall
function podiumAvatarSize(index, playersOnSpot) {
  const size = index === 0 ? 4.5 : 3.5
  return playersOnSpot > 1 ? size * 0.75 : size
}

// ---- Din egen placering ----

const isMe = (row) => authStore.isLoggedIn && row.userId === authStore.user?.id

// Det som visas längst ner om man inte syns på listan:
//   { kind: 'progress', answered, left } – för få frågor för att komma med
//   { kind: 'place', place, score }      – med, men utanför topp 10
//   { kind: 'none' }                     – har inte spelat något
const myStatus = computed(() => {
  if (!authStore.isLoggedIn || !leaderboard.value?.me) return null
  if (activeRows.value.some(isMe)) return null

  const mine = leaderboard.value.me[selectedKey.value]
  if (!mine) return null

  if (isAccuracy.value && mine.place === null) {
    if (mine.answered === 0 && !leaderboard.value.me.quizCount.place) return { kind: 'none' }
    return { kind: 'progress', answered: mine.answered, left: minAnswers.value - mine.answered }
  }
  if (mine.place === null) return { kind: 'none' }

  const score = activeTable.value.kind === 'accuracy'
    ? percent(mine.score)
    : activeTable.value.kind === 'xp'
      ? `${whole.format(mine.score)} XP`
      : `${whole.format(mine.score)} quiz`
  return { kind: 'place', place: mine.place, score }
})

// Statistiken i rubrikrutan
const stats = computed(() => leaderboard.value?.stats ?? null)

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

      <!-- Några siffror om hela GeoKnowledge -->
      <dl v-if="stats" class="hero-stats">
        <div class="stat">
          <dt>Spelare</dt>
          <dd>{{ whole.format(stats.players) }}</dd>
        </div>
        <div class="stat">
          <dt>Besvarade frågor</dt>
          <dd>{{ whole.format(stats.answered) }}</dd>
        </div>
        <div class="stat stat-week">
          <dt>Veckans flitigaste</dt>
          <dd v-if="stats.weekTop" class="week-player">
            <PlayerAvatar :name="stats.weekTop.username" :picture-url="stats.weekTop.pictureUrl" :size="2" />
            <span>
              <span class="week-name">{{ stats.weekTop.username }}</span>
              <span class="week-count">{{ whole.format(stats.weekTop.answered) }} frågor</span>
            </span>
          </dd>
          <dd v-else class="week-empty">Ingen har spelat den här veckan än</dd>
        </div>
      </dl>
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
          <h2>{{ activeTable.title }}</h2>
          <p>{{ activeTable.description }}</p>
          <p v-if="isAccuracy && minAnswers" class="requirement">
            Svara på minst {{ minAnswers }} frågor för att komma med på listan.
          </p>
          <p class="tiebreak">Vid lika resultat vinner den som kom dit först.</p>
        </header>

        <p v-if="activeRows.length === 0" class="empty-message">
          <template v-if="isAccuracy && minAnswers">
            Ingen har svarat på {{ minAnswers }} frågor här än. Bli först på listan!
          </template>
          <template v-else>Inga resultat ännu. Bli först på listan!</template>
        </p>

        <template v-else>
          <!-- Prispallen. Ordningen i koden är 1, 2, 3 (så läser skärmläsare
               upp den), men CSS ställer ettan i mitten: 2 – 1 – 3. -->
          <ol class="podium" aria-label="Topp 3">
            <li
              v-for="(group, index) in podiumGroups"
              :key="group.place"
              class="podium-spot"
              :class="[SPOTS[index], { shared: group.rows.length > 1 }]"
            >
              <span class="medal" aria-hidden="true">{{ MEDALS[group.place] }}</span>
              <div class="podium-players">
                <div
                  v-for="row in group.rows"
                  :key="row.userId"
                  class="podium-player"
                  :class="{ me: isMe(row) }"
                >
                  <PlayerAvatar
                    class="podium-avatar"
                    :name="row.username"
                    :picture-url="row.pictureUrl"
                    :size="podiumAvatarSize(index, group.rows.length)"
                  />
                  <span class="podium-name">
                    {{ row.username }}<span v-if="isMe(row)" class="you"> (du)</span>
                  </span>
                </div>
              </div>
              <!-- Samma poäng för alla på samma pall (det är därför de delar platsen) -->
              <strong class="podium-score">{{ formatScore(group.rows[0]) }}</strong>
              <span class="podium-block">
                <span class="visually-hidden">Plats </span>{{ group.place }}
              </span>
            </li>
          </ol>

          <!-- Plats 4 och nedåt -->
          <template v-if="listRows.length > 0">
            <div class="list-heading" aria-hidden="true">
              <span>PLATS</span>
              <span>SPELARE</span>
              <span>{{ SCORE_HEADINGS[activeTable.kind] }}</span>
            </div>
            <ol class="player-list">
              <li
                v-for="row in listRows"
                :key="row.userId"
                class="player-row"
                :class="{ me: isMe(row) }"
              >
                <span class="rank">{{ row.place }}</span>
                <PlayerAvatar :name="row.username" :picture-url="row.pictureUrl" :size="2" />
                <span class="row-name">
                  {{ row.username }}<span v-if="isMe(row)" class="you"> (du)</span>
                </span>
                <span class="row-progress" aria-hidden="true">
                  <span :style="{ width: `${getProgress(row)}%` }"></span>
                </span>
                <strong class="row-score">{{ formatScore(row) }}</strong>
              </li>
            </ol>
          </template>
        </template>

        <!-- Din egen placering, om du inte syns på listan -->
        <div v-if="myStatus" class="my-status" :class="myStatus.kind">
          <template v-if="myStatus.kind === 'progress'">
            <p>
              Du har svarat på <strong>{{ myStatus.answered }} av {{ minAnswers }}</strong>
              {{ activeTable.noun }}. <strong>{{ myStatus.left }} kvar</strong> till listan!
            </p>
            <span
              class="my-progress"
              role="progressbar"
              :aria-valuenow="myStatus.answered"
              aria-valuemin="0"
              :aria-valuemax="minAnswers"
              :aria-label="`${myStatus.answered} av ${minAnswers} ${activeTable.noun}`"
            >
              <span :style="{ width: `${(myStatus.answered / minAnswers) * 100}%` }"></span>
            </span>
            <RouterLink to="/quiz" class="my-link">Spela ett quiz →</RouterLink>
          </template>
          <p v-else-if="myStatus.kind === 'place'">
            Du ligger på <strong>plats {{ myStatus.place }}</strong> med <strong>{{ myStatus.score }}</strong>.
          </p>
          <template v-else>
            <p>Du har inte spelat något quiz än.</p>
            <RouterLink to="/quiz" class="my-link">Spela ditt första quiz →</RouterLink>
          </template>
        </div>

        <p v-if="!authStore.isLoggedIn" class="guest-hint">
          <RouterLink to="/login">Logga in</RouterLink> för att se din egen placering.
        </p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.leaderboard-ex3 {
  --forest: var(--primary-green, #1b4d3e);
  --muted: #526359;
  /* Orange som combo-räknaren i quizet – markerar "du" */
  --you: #f08c00;
  --you-bg: #fff4e0;
  width: min(100% - 2rem, 68rem);
  margin: 1.5rem auto 3rem;
  color: var(--forest);
}

/* ---- Rubrikrutan ---- */

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 25rem);
  align-items: center;
  gap: 1.5rem 2rem;
  padding: clamp(1.4rem, 4vw, 2.5rem);
  border-radius: 1.6rem;
  background:
    radial-gradient(ellipse at 82% 30%, rgba(119, 165, 127, 0.3), transparent 38%),
    linear-gradient(120deg, #163f33, #24634b);
  color: #fff;
  box-shadow: 0 18px 38px rgba(27, 77, 62, 0.18);
}

h1 {
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 3.5rem);
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

/* Tre rutor: Spelare och Besvarade frågor bredvid varandra,
   Veckans flitigaste över hela bredden under */
.hero-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin: 0;
}

.stat {
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(226, 238, 227, 0.18);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.08);
}

.stat dt {
  color: #c5ddc8;
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.stat dd {
  margin: 0.2rem 0 0;
  font-size: 1.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.stat-week {
  grid-column: 1 / -1;
}

.stat dd.week-player {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
  font-size: 1rem;
}

.week-name {
  display: block;
  font-weight: 700;
}

.week-count {
  display: block;
  color: #c5ddc8;
  font-size: 0.8rem;
  font-weight: 600;
}

.stat dd.week-empty {
  color: #d3e3d6;
  font-size: 0.9rem;
  font-weight: 600;
}

/* ---- Flikarna ---- */

/* Radbryts i stället för att scrolla i sidled, så att alla listor syns */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 1.25rem 0 1rem;
  padding: 0.35rem;
  border: 1px solid rgba(27, 77, 62, 0.08);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.78);
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
.my-link:focus-visible,
.guest-hint a:focus-visible {
  outline: 3px solid #78b795;
  outline-offset: 3px;
}

/* ---- Listans kort ---- */

.leaderboard-panel {
  padding: clamp(1.1rem, 4vw, 2rem);
  border: 1px solid rgba(27, 77, 62, 0.08);
  border-radius: 1.6rem;
  background: #fff;
  box-shadow: 0 18px 50px rgba(27, 77, 62, 0.1);
}

.panel-heading {
  margin-bottom: 1rem;
}

.panel-heading h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.025em;
}

.panel-heading p {
  margin: 0.3rem 0 0;
  color: var(--muted);
  font-size: 0.86rem;
}

.panel-heading .requirement {
  margin-top: 0.25rem;
  font-weight: 650;
}

.panel-heading .tiebreak {
  margin-top: 0.15rem;
  font-size: 0.8rem;
}

/* ---- Prispallen ---- */

.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin: 0.5rem 0 1.75rem;
  padding: 0;
  list-style: none;
}

.podium-spot {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  max-width: 12rem;
  text-align: center;
}

/* En pall som flera delar får mer plats, så att namnen får plats */
.podium-spot.shared {
  flex-grow: 1.6;
  max-width: 19rem;
}

/* Ettan i mitten, tvåan till vänster, trean till höger */
.podium-spot.first { order: 2; }
.podium-spot.second { order: 1; }
.podium-spot.third { order: 3; }

.medal {
  font-size: 1.6rem;
  line-height: 1;
}

.first .medal {
  font-size: 2.1rem;
}

/* Spelarna på en pall – flera bredvid varandra om de delar placeringen */
.podium-players {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 0.6rem;
  max-width: 100%;
}

.podium-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  max-width: 100%;
}

.podium-avatar {
  border: 3px solid #fff;
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.18);
}

.first .podium-avatar {
  border-color: #e8c35a;
}

.podium-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium-score {
  color: var(--muted);
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}

/* Själva pallen: högst för ettan */
.podium-block {
  display: grid;
  place-items: center;
  width: 100%;
  margin-top: 0.35rem;
  border-radius: 0.9rem 0.9rem 0.35rem 0.35rem;
  color: #fff;
  font-size: 1.4rem;
  font-weight: 750;
}

.first .podium-block {
  height: 6rem;
  background: linear-gradient(180deg, #2c7a55, #1b4d3e);
  font-size: 1.8rem;
}

.second .podium-block {
  height: 4.5rem;
  background: linear-gradient(180deg, #4f9a6c, #2f6e50);
}

.third .podium-block {
  height: 3.5rem;
  background: linear-gradient(180deg, #7bb68a, #4b8a63);
}

/* Du på pallen: orange ring runt bilden */
.podium-player.me .podium-avatar {
  border-color: var(--you);
}

/* ---- Listan, plats 4 och nedåt ---- */

.list-heading,
.player-row {
  display: grid;
  /* Fast bredd på poängkolumnen så att staplarna börjar på samma ställe */
  grid-template-columns: 2.2rem 2.2rem minmax(0, 1fr) minmax(4rem, 8rem) 5.5rem;
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
  min-height: 3.6rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid #edf1ed;
}

.player-row:last-child {
  border-bottom: 0;
}

/* Din rad */
.player-row.me {
  border-radius: 0.7rem;
  border-bottom-color: transparent;
  background: var(--you-bg);
  box-shadow: inset 3px 0 0 var(--you);
}

.rank {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.row-name {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.you {
  color: #a65d00;
  font-weight: 750;
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
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

/* ---- Din placering längst ner ---- */

.my-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1rem;
  margin-top: 1.25rem;
  padding: 0.9rem 1.1rem;
  border: 2px solid var(--you);
  border-radius: 1rem;
  background: var(--you-bg);
}

.my-status p {
  flex: 1 1 16rem;
  margin: 0;
  font-size: 0.92rem;
}

.my-progress {
  display: block;
  flex: 1 1 100%;
  order: 3;
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: #ffe2b3;
}

.my-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--you);
}

.my-link {
  padding: 0.45rem 0.9rem;
  border: 2px solid var(--forest);
  border-radius: 999px;
  background: #fff;
  color: var(--forest);
  font-size: 0.86rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.my-link:hover {
  background: #f0f8f1;
}

.guest-hint {
  margin: 1.25rem 0 0;
  color: var(--muted);
  font-size: 0.88rem;
  text-align: center;
}

.guest-hint a {
  color: var(--forest);
  font-weight: 700;
}

/* ---- Meddelanden ---- */

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

/* Text som bara skärmläsare läser upp */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---- Smala skärmar ---- */

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .list-heading,
  .player-row {
    grid-template-columns: 1.8rem 2rem minmax(0, 1fr) auto;
    column-gap: 0.5rem;
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
    padding: 1.3rem;
  }

  .hero-copy > p {
    font-size: 0.9rem;
  }

  .stat dd {
    font-size: 1.35rem;
  }

  .category-tabs button {
    padding: 0.6rem 0.75rem;
  }

  .podium-name {
    font-size: 0.85rem;
  }

  .first .podium-block { height: 4.5rem; }
  .second .podium-block { height: 3.5rem; }
  .third .podium-block { height: 2.75rem; }
}

@media (prefers-reduced-motion: reduce) {
  .category-tabs button {
    transition: none;
  }
}
</style>

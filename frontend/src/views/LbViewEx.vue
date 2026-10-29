<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const categories = [
  { key: 'all', label: 'Alla quiz' },
  { key: 'contour', label: 'Kontur' },
  { key: 'flags', label: 'Flaggor' },
  { key: 'capitals', label: 'Huvudstäder' },
]

const results = {
  all: {
    metric: 'XP',
    rows: [
      { name: 'Alexandra', score: 2450 },
      { name: 'Samir', score: 2180 },
      { name: 'Elin', score: 1940 },
      { name: 'Noah', score: 1720 },
      { name: 'Maja', score: 1590 },
      { name: 'Kim', score: 1430 },
    ],
  },
  contour: {
    metric: '% rätt',
    rows: [
      { name: 'Elin', score: 98 },
      { name: 'Alexandra', score: 95 },
      { name: 'Kim', score: 92 },
      { name: 'Samir', score: 89 },
      { name: 'Noah', score: 86 },
      { name: 'Maja', score: 82 },
    ],
  },
  flags: {
    metric: '% rätt',
    rows: [
      { name: 'Samir', score: 100 },
      { name: 'Maja', score: 96 },
      { name: 'Alexandra', score: 94 },
      { name: 'Elin', score: 91 },
      { name: 'Kim', score: 88 },
      { name: 'Noah', score: 84 },
    ],
  },
  capitals: {
    metric: '% rätt',
    rows: [
      { name: 'Noah', score: 97 },
      { name: 'Kim', score: 93 },
      { name: 'Samir', score: 90 },
      { name: 'Elin', score: 88 },
      { name: 'Maja', score: 85 },
      { name: 'Alexandra', score: 81 },
    ],
  },
}

const selectedCategory = ref('all')
const activeCategory = computed(() => categories.find((category) => category.key === selectedCategory.value))
const activeResults = computed(() => results[selectedCategory.value])
const podium = computed(() => [
  { ...activeResults.value.rows[1], place: 2 },
  { ...activeResults.value.rows[0], place: 1 },
  { ...activeResults.value.rows[2], place: 3 },
])

function formatScore(score) {
  return activeResults.value.metric === 'XP' ? `${score.toLocaleString('sv-SE')} XP` : `${score}%`
}
</script>

<template>
  <main class="leaderboard-experiment">
    <header class="page-header">
      <RouterLink to="/menu/leaderboard" class="back-link">← Till riktiga topplistan</RouterLink>
      <span class="experiment-label">DESIGNPROV · EXEMPELDATA</span>
      <div class="title-block">
        <span class="eyebrow">GEOKNOWLEDGE · SPELARSTATISTIK</span>
        <h1>Topplistan</h1>
        <p>Små steg, stora upptäckter. Se vem som leder just nu.</p>
      </div>
    </header>

    <nav class="category-tabs" aria-label="Välj topplista">
      <button
        v-for="category in categories"
        :key="category.key"
        type="button"
        :aria-pressed="selectedCategory === category.key"
        :class="{ active: selectedCategory === category.key }"
        @click="selectedCategory = category.key"
      >
        {{ category.label }}
      </button>
    </nav>

    <section class="leaderboard-panel" aria-live="polite">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">DEN HÄR VECKAN</span>
          <h2>{{ activeCategory.label }}</h2>
        </div>
        <span class="live-indicator"><span></span> Exempelresultat</span>
      </div>

      <ol class="podium" aria-label="Topp tre">
        <li
          v-for="player in podium"
          :key="player.place"
          class="podium-card"
          :class="`place-${player.place}`"
        >
          <span class="medal" aria-hidden="true">{{ player.place === 1 ? '★' : player.place === 2 ? '✦' : '✧' }}</span>
          <span class="avatar">{{ player.name.slice(0, 1) }}</span>
          <span class="player-name">{{ player.name }}</span>
          <strong class="player-score">{{ formatScore(player.score) }}</strong>
          <span class="place-label">#{{ player.place }}</span>
        </li>
      </ol>

      <div class="list-heading">
        <span>PLACERING</span>
        <span>SPELARE</span>
        <span>{{ activeResults.metric.toUpperCase() }}</span>
      </div>
      <ol class="player-list" start="4">
        <li v-for="(player, index) in activeResults.rows.slice(3)" :key="player.name" class="player-row">
          <span class="rank">{{ index + 4 }}</span>
          <span class="row-avatar">{{ player.name.slice(0, 1) }}</span>
          <span class="row-name">{{ player.name }}</span>
          <strong class="row-score">{{ formatScore(player.score) }}</strong>
        </li>
      </ol>

      <p class="sample-note">Mockup med påhittade resultat – visas bara för att testa utseendet.</p>
    </section>
  </main>
</template>

<style scoped>
.leaderboard-experiment {
  --green: var(--primary-green, #1b4d3e);
  --mint: #e8f4eb;
  --muted: #70857b;
  width: min(100% - 2rem, 58rem);
  margin: 1.5rem auto 3rem;
  color: var(--green);
}

.page-header {
  position: relative;
  padding: 0.25rem 0 1.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--green);
  font-size: 0.9rem;
  font-weight: 650;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.experiment-label {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.45rem 0.7rem;
  border: 1px solid #cfe2d4;
  border-radius: 999px;
  background: #f3f8f3;
  color: #527362;
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.title-block {
  padding: 2.4rem 1rem 1.5rem;
  text-align: center;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.13em;
}

h1 {
  margin: 0.35rem 0 0;
  font-size: clamp(2.2rem, 6vw, 3.25rem);
  letter-spacing: -0.055em;
}

.title-block p {
  margin: 0.55rem 0 0;
  color: #60766b;
}

.category-tabs {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0.35rem;
  overflow-x: auto;
  border: 1px solid rgba(27, 77, 62, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
}

.category-tabs button {
  flex: 0 0 auto;
  padding: 0.7rem 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #60766b;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.category-tabs button:hover {
  background: #f0f6f1;
}

.category-tabs button.active {
  background: var(--green);
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

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  background: #f1f7f2;
  color: #577365;
  font-size: 0.76rem;
  font-weight: 650;
  white-space: nowrap;
}

.live-indicator span {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #55a775;
}

.podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: 0.8rem;
  margin: 0;
  padding: 0 0 1.7rem;
  list-style: none;
}

.podium-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 10.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 1.15rem 0.5rem;
  border: 1px solid #e5eee7;
  border-radius: 1.15rem;
  background: linear-gradient(160deg, #f8fbf8, #f0f6f1);
}

.podium-card.place-1 {
  min-height: 12.25rem;
  border-color: #b6d2be;
  background: linear-gradient(160deg, #f0f8f1, #e1efe4);
  box-shadow: 0 9px 22px rgba(27, 77, 62, 0.1);
}

.medal {
  position: absolute;
  top: 0.7rem;
  color: #8da799;
  font-size: 1rem;
}

.place-1 .medal {
  color: #c28a2e;
  font-size: 1.2rem;
}

.avatar,
.row-avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #d6e9da;
  color: var(--green);
  font-weight: 750;
}

.avatar {
  width: 2.8rem;
  height: 2.8rem;
  margin-top: 0.5rem;
  font-size: 1.1rem;
}

.place-1 .avatar {
  width: 3.25rem;
  height: 3.25rem;
  background: var(--green);
  color: #fff;
}

.player-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-score {
  font-size: 0.85rem;
}

.place-label {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.list-heading,
.player-row {
  display: grid;
  grid-template-columns: 2.2rem 2.2rem minmax(0, 1fr) auto;
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

.list-heading span:last-child {
  grid-column: 4;
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

.rank {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.row-avatar {
  width: 2rem;
  height: 2rem;
  font-size: 0.78rem;
}

.row-name {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-score {
  font-size: 0.88rem;
  text-align: right;
  white-space: nowrap;
}

.sample-note {
  margin: 1.15rem 0 0;
  color: var(--muted);
  font-size: 0.76rem;
  text-align: center;
}

@media (max-width: 520px) {
  .experiment-label {
    top: 2.3rem;
    font-size: 0.6rem;
  }

  .title-block {
    padding-top: 3.2rem;
  }

  .category-tabs {
    justify-content: flex-start;
    border-radius: 1rem;
  }

  .category-tabs button {
    padding: 0.65rem 0.8rem;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .podium {
    gap: 0.45rem;
  }

  .podium-card {
    min-height: 9.5rem;
    padding-inline: 0.25rem;
  }

  .podium-card.place-1 {
    min-height: 11rem;
  }

  .list-heading,
  .player-row {
    grid-template-columns: 1.5rem 1.8rem minmax(0, 1fr) auto;
    column-gap: 0.5rem;
  }
}
</style>

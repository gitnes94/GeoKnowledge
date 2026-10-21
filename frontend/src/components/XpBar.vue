<script setup>
import { computed, onMounted } from 'vue'
import confetti from 'canvas-confetti'

// Visar användarens nivå och hur långt det är kvar till nästa nivå.
// Kan användas både på slutskärmen (med gained/leveledUp) och på profilsidan.
const props = defineProps({
  level: { type: Number, required: true },
  xpIntoLevel: { type: Number, required: true },
  xpPerLevel: { type: Number, required: true },
  // XP från quizet som nyss spelades (visas bara om det skickas in)
  gained: { type: Number, default: null },
  // true om användaren gick upp en nivå av quizet
  leveledUp: { type: Boolean, default: false },
})

// Hur stor del av stapeln som ska vara fylld, i procent
const percent = computed(() => Math.round((props.xpIntoLevel / props.xpPerLevel) * 100))

// Skjuter konfetti från båda sidorna av skärmen
function celebrate() {
  // Färger som matchar appens gröna tema
  const colors = ['#41ac5a', '#1b4d3e', '#bcebb4', '#f6d743', '#ffffff']

  confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, disableForReducedMotion: true })
  confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, disableForReducedMotion: true })
}

// XpBar visas först när resultatet är sparat – gick man upp en nivå firar vi direkt
onMounted(() => {
  if (props.leveledUp) {
    celebrate()
  }
})
</script>

<template>
  <div class="xp-bar">
    <p v-if="leveledUp" class="level-up">🎉 Nivå upp!</p>
    <p v-if="gained !== null" class="gained">+{{ gained }} XP</p>

    <div class="row">
      <span class="level">Nivå {{ level }}</span>
      <span class="numbers">{{ xpIntoLevel }} / {{ xpPerLevel }} XP</span>
    </div>

    <!-- role="progressbar" och aria-värdena gör att skärmläsare kan läsa upp stapeln -->
    <div
      class="track"
      role="progressbar"
      :aria-valuenow="xpIntoLevel"
      aria-valuemin="0"
      :aria-valuemax="xpPerLevel"
      :aria-label="`Nivå ${level}, ${xpIntoLevel} av ${xpPerLevel} XP`"
    >
      <div class="fill" :style="{ width: percent + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.xp-bar {
  max-width: 22rem;
  margin: 1rem auto 0;
  text-align: left;
}

.level-up {
  margin: 0 0 0.25rem;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  animation: pop 0.5s ease-out;
}

/* Texten "Nivå upp!" växer fram lite studsigt */
@keyframes pop {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}

/* Den som har valt "minska rörelse" i sitt operativsystem slipper animationen */
@media (prefers-reduced-motion: reduce) {
  .level-up {
    animation: none;
  }
}

.gained {
  margin: 0 0 0.75rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2f9e4f;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.375rem;
  font-size: 0.95rem;
}

.level {
  font-weight: 700;
}

.track {
  height: 0.875rem;
  border-radius: 999px;
  background: #e3f1e6;
  border: 2px solid var(--primary-green, #1b4d3e);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: #41ac5a;
  border-radius: 999px;
  transition: width 0.6s ease;
}
</style>

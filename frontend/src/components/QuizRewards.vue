<script setup>
// Slutskärmens nedre del, gemensam för alla quiz: om resultatet sparades,
// XP-stapeln och nya troféer.
import { RouterLink } from 'vue-router'
import XpBar from './XpBar.vue'
import NewTrophies from './NewTrophies.vue'

defineProps({
  // 'idle' | 'saving' | 'saved' | 'not-logged-in' | 'expired' | 'error'
  saveStatus: { type: String, required: true },
  // XP från servern, eller null
  xp: { type: Object, default: null },
  newTrophies: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="quiz-rewards">
    <p v-if="saveStatus === 'saving'" class="save-status">Sparar resultatet…</p>
    <p v-else-if="saveStatus === 'saved'" class="save-status success">✓ Resultatet är sparat</p>
    <p v-else-if="saveStatus === 'not-logged-in'" class="save-status">
      <RouterLink to="/login">Logga in</RouterLink> för att spara dina resultat.
    </p>
    <p v-else-if="saveStatus === 'expired'" class="save-status warning">
      Din inloggning har gått ut. <RouterLink to="/login">Logga in igen</RouterLink> för att spara.
    </p>
    <p v-else-if="saveStatus === 'error'" class="save-status warning">
      Resultatet kunde inte sparas just nu.
    </p>

    <!-- XP och nivå, visas när resultatet har sparats -->
    <XpBar
        v-if="xp"
        :level="xp.level"
        :xp-into-level="xp.xpIntoLevel"
        :xp-per-level="xp.xpPerLevel"
        :gained="xp.gained"
        :bonus="xp.bonus"
        :timed-bonus="xp.timedBonus"
        :leveled-up="xp.leveledUp"
    />

    <!-- Troféer som låstes upp av det här quizet -->
    <NewTrophies :trophies="newTrophies" />
  </div>
</template>

<style scoped>
.save-status {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
}

.save-status.success {
  color: #2f9e4f;
  font-weight: 700;
}

.save-status.warning {
  color: #b5452f;
}

.save-status a {
  color: inherit;
  font-weight: 700;
}
</style>

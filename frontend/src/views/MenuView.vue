<script setup>
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/services/auth'

const authStore = useAuthStore()
</script>

<template>
  <section class="page menu-view">
    <h2>Meny</h2>
    <p class="intro">Välj vad du vill göra.</p>

    <div class="menu-items">
      <RouterLink to="/menu/leaderboard" class="card menu-card">
        <span class="icon" aria-hidden="true">🏆</span>
        <span class="name">Topplistor</span>
        <span class="description">Se vilka spelare som har högst resultat.</span>
      </RouterLink>

      <RouterLink v-if="authStore.isLoggedIn" to="/menu/profile" class="card menu-card">
        <span class="icon" aria-hidden="true">👤</span>
        <span class="name">Profil</span>
        <span class="description">Se din statistik och klarade utmaningar!</span>
      </RouterLink>

      <RouterLink to="/menu/trophies" class="card menu-card">
        <span class="icon" aria-hidden="true">🎖️</span>
        <span class="name">Troféer</span>
        <span class="description">Se dina troféer och vad som är kvar.</span>
      </RouterLink>
    </div>

  </section>
</template>

<style scoped>
/* Panelen kommer från .page i style.css – här bara centreringen */
.menu-view {
  text-align: center;
}

h2 {
  margin: 0;
  font-size: 1.75rem;
}

.intro {
  margin: 0.5rem 0 1.5rem;
}

.menu-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Utseende och hover kommer från .card i style.css – här bara innehållets layout */
.menu-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  /* Alla kort lika breda, oavsett hur lång beskrivningen är.
     Utan width blir varje kort bara så brett som sin text. */
  width: 100%;
  max-width: 21rem;
  margin: 0 auto;
}

.icon {
  font-size: 2rem;
}

.name {
  font-size: 1.15rem;
  font-weight: 700;
}

.description {
  font-size: 0.9rem;
}
</style>

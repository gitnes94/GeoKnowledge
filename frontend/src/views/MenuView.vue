<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="menu-view">
    <h2>Meny</h2>
    <p class="intro">Välj vad du vill göra.</p>

    <RouterLink to="/menu/leaderboard" class="menu-card">
      <span class="icon" aria-hidden="true">🏆</span>
      <span class="name">Topplista</span>
      <span class="description">Se vilka spelare som har högst resultat.</span>
    </RouterLink>
  </section>
</template>

<style scoped>
.menu-view {
  max-width: 44rem;
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

.intro {
  margin: 0.5rem 0 1.5rem;
}

.menu-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  max-width: 21rem;
  margin: 0 auto;
  padding: 1.25rem 1rem;
  color: var(--primary-green, #1b4d3e);
  background: #ffffff;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 1.25rem;
  box-shadow: 0 4px 10px rgba(27, 77, 62, 0.12);
  text-decoration: none;
  transition: transform 0.15s ease, background 0.15s ease;
}

.menu-card:hover {
  transform: translateY(-2px);
  background: #f0f8f1;
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
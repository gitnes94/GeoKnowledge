<script setup>
import { RouterLink } from 'vue-router'

// Visar troféer som låstes upp av quizet som nyss spelades.
// Används på quizens slutskärm. Visas inte alls om listan är tom.
defineProps({
  // Troféerna från findNewTrophies i services/trophies.js
  trophies: { type: Array, required: true },
})
</script>

<template>
  <!-- role="status" gör att skärmläsare läser upp troféerna när de dyker upp -->
  <div v-if="trophies.length > 0" class="new-trophies" role="status">
    <p class="heading">🏆 {{ trophies.length === 1 ? 'Ny trofé!' : `${trophies.length} nya troféer!` }}</p>

    <ul>
      <li v-for="trophy in trophies" :key="trophy.id" class="trophy">
        <span class="icon" aria-hidden="true">{{ trophy.icon }}</span>
        <span class="text">
          <span class="name">{{ trophy.name }}</span>
          <span class="description">{{ trophy.description }}</span>
        </span>
      </li>
    </ul>

    <RouterLink to="/menu/trophies" class="link">Se alla troféer</RouterLink>
  </div>
</template>

<style scoped>
.new-trophies {
  max-width: 22rem;
  margin: 1.25rem auto 0;
  padding: 1rem 1.25rem;
  text-align: left;
  background: #fff8e6;
  border: 3px solid #f0b400;
  border-radius: 1.25rem;
  animation: pop 0.5s ease-out;
}

/* Rutan studsar fram, som "Nivå upp!" */
@keyframes pop {
  0% { transform: scale(0.85); opacity: 0; }
  70% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .new-trophies {
    animation: none;
  }
}

.heading {
  margin: 0 0 0.5rem;
  text-align: center;
  font-size: 1.15rem;
  font-weight: 700;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.trophy {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0;
}

.icon {
  font-size: 1.75rem;
}

.text {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 700;
}

.description {
  font-size: 0.85rem;
  opacity: 0.8;
}

.link {
  display: block;
  margin-top: 0.5rem;
  text-align: center;
  font-weight: 700;
  color: inherit;
}
</style>

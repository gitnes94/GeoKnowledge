<script setup>
// Visar själva frågan: en kontur, en flagga eller en huvudstad.
// Allt kommer från servern – inget här avslöjar vilket land det är.
import CountryShape from './CountryShape.vue'

defineProps({
  // En fråga från servern: { kind, shape?, flag?, capital? }
  question: { type: Object, required: true },
  // Mindre ruta, t.ex. i GeoMaster där kartan också tar plats
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="question-prompt" :class="[`kind-${question.kind}`, { compact }]">
    <!-- shape är en GeoJSON-geometri, som d3 kan rita direkt -->
    <CountryShape v-if="question.kind === 'shape'" :feature="question.shape" />
    <img
        v-else-if="question.kind === 'flag'"
        class="flag"
        :src="question.flag"
        alt="Flagga för landet som ska gissas"
    />
    <p v-else class="capital">{{ question.capital }}</p>
  </div>
</template>

<style scoped>
/* Fast höjd så att knapparna inte hoppar mellan frågorna */
.question-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0 1.5rem;
}

.question-prompt.kind-shape { height: 16rem; }
.question-prompt.kind-flag { height: 14rem; }
.question-prompt.kind-capital { height: 10rem; }

/* GeoMaster: samma höjd för alla typer, och lite mindre */
.question-prompt.compact {
  height: 12rem;
  margin: 0.75rem 0 1.25rem;
}

/* object-fit gör att hela flaggan alltid syns, utan att bli utdragen */
.flag {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid var(--line);
  border-radius: 0.375rem;
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.15);
}

/* Huvudstaden är själva frågan, så den ska vara stor och tydlig */
.capital {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-green);
  overflow-wrap: break-word;
}

.compact .capital {
  font-size: 2.25rem;
}

@media (max-width: 600px) {
  .question-prompt.compact {
    height: 9rem;
  }

  .compact .capital {
    font-size: 1.75rem;
  }
}
</style>

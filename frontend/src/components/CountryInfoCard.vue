<script setup>
import { computed } from 'vue'
import { CONTINENTS } from '../services/quiz.js'

// Kortet får landets egenskaper från kartdatan:
// { id, name, name_sv, continent, iso2 }
const props = defineProps({
  country: { type: Object, required: true },
  // Huvudstaden, t.ex. 'Köpenhamn' (undefined om den saknas, t.ex. för Antarktis)
  capital: { type: String, default: null },
})

const emit = defineEmits(['close'])

// Svenska namn på världsdelarna. CONTINENTS saknar Antarktis och
// "öppet hav", så de läggs till här.
const CONTINENT_NAMES = {
  ...CONTINENTS,
  Antarctica: 'Antarktis',
  'Seven seas (open ocean)': 'Öar i världshaven',
}

// Svenskt namn i första hand, annars det engelska
const name = computed(() => props.country.name_sv || props.country.name)

const continentName = computed(
  () => CONTINENT_NAMES[props.country.continent] || props.country.continent
)

// Flaggan finns bara för områden med en riktig landskod ('-99' = saknas)
const flagUrl = computed(() =>
  props.country.iso2 && props.country.iso2 !== '-99'
    ? `/flags/${props.country.iso2.toLowerCase()}.svg`
    : null
)
</script>

<template>
  <article class="country-card" aria-live="polite">
    <button class="close" aria-label="Stäng" @click="emit('close')">×</button>

    <img v-if="flagUrl" class="flag" :src="flagUrl" :alt="`Flagga för ${name}`" />

    <h2>{{ name }}</h2>

    <dl>
      <div v-if="capital">
        <dt>Huvudstad</dt>
        <dd>{{ capital }}</dd>
      </div>
      <div>
        <dt>Världsdel</dt>
        <dd>{{ continentName }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.country-card {
  position: relative;
  margin: 0 auto;
  padding: 1.5rem;
  width: calc(100% - 40px);
  max-width: 420px;
  text-align: center;
  background: var(--card-bg, #ffffff);
  border-radius: 24px;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
  animation: appear 0.25s ease-out;
}

@keyframes appear {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .country-card {
    animation: none;
  }
}

.close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--primary-green, #1b4d3e);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close:hover {
  background: #f0f8f1;
}

.flag {
  width: 9rem;
  max-width: 60%;
  border: 1px solid rgba(27, 77, 62, 0.2);
  border-radius: 0.375rem;
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.15);
}

h2 {
  margin: 0.75rem 0 1rem;
  font-size: 1.6rem;
}

dl {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 0;
}

dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

dd {
  margin: 0.125rem 0 0;
  font-weight: 700;
}
</style>

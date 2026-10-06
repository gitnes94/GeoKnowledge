<script setup>
import { computed } from 'vue'
import { geoOrthographic, geoPath, geoCentroid } from 'd3'

// Komponenten får ETT land (en GeoJSON-feature) och ritar det stort
const props = defineProps({
  feature: { type: Object, required: true },
})

// Ritytans storlek i SVG-enheter, och luft runt landet
const width = 800
const height = 600
const margin = 20

// Landets SVG-form. computed – räknas om när ett annat land skickas in.
const shapePath = computed(() => {
  // 1. Landets mittpunkt på jorden
  const [longitude, latitude] = geoCentroid(props.feature)

  // 2. En glob-projektion, vriden så att mittpunkten hamnar mitt framför oss,
  //    och skalad så att landet fyller ytan
  const projection = geoOrthographic()
    .rotate([-longitude, -latitude])
    .fitExtent([[margin, margin], [width - margin, height - margin]], props.feature)

  return geoPath(projection)(props.feature)
})
</script>

<template>
  <svg class="country-shape" :viewBox="`0 0 ${width} ${height}`">
    <path class="shape" :d="shapePath" />
  </svg>
</template>

<style scoped>
.country-shape {
  display: block;
  width: 100%;
  height: 100%;
}

.shape {
  fill: var(--color-country);
  stroke: var(--color-accent);
  stroke-width: 1.5;
  stroke-linejoin: round;
}
</style>
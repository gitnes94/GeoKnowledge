<script setup>
import { computed } from 'vue';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3';

// Kartan får sin data utifårn
const props = defineProps({
    world: { type: Object, required: true },
    selectedId: { type: String, default: null },
})

// Events som kartan skickar uppåt till föräldern
const emit = defineEmits(['hover', 'select'])

// Ritytans storlek i SVG-enheter
// SVG:n skalas sedan automatiskt till skärmen - se viewBox
const width = 960
const height = 500

// Hela jordklotet. D3 förstår { type: 'Sphere' } som en färdig form.
const sphere = { type: 'Sphere' }

// Projektionen. fitSize skalar och centrerar så att hela klotet precis får plats
const projection =  geoNaturalEarth1().fitSize([width, height], sphere)

// En funktion som gör om ett land (GeoJSON) till en SVG-sträng
const pathGenerator = geoPath(projection)

// Havets SVG-form. Ändras aldrig, så vi räknar ut den en gång.
const spherePath = pathGenerator(sphere)

// Rutnätets SVG-form (linjer var 10:e grad). Ändras aldrig.
const graticulePath = pathGenerator(geoGraticule10())

// Räkna ut en SVG-form för varje land. SVG = Scalable Vector Graphics
// computed = räkas om automatiskt om props.world ändras
const countries = computed(() => {
    
    // 3. Plocka ut det Vue behöver för att rita varje land
    return props.world.features.map((feature) => ({
        id: feature.properties.id,
        name: feature.properties.name,
        d: pathGenerator(feature),
    }))
})
</script>

<template>
  <svg class="world-map" :viewBox="`0 0 ${width} ${height}`">
    <path class="ocean" :d="spherePath" />
    <path class="graticule" :d="graticulePath" />
    <path
      v-for="country in countries"
      :key="country.id"
      :d="country.d"
      class="country"
      :class="{ selected: country.id === selectedId }"
      @mouseenter="emit('hover', country)"
      @mouseleave="emit('hover', null)"
      @click="emit('select', country)"
    />
  </svg>
</template>


<style scoped>
.world-map {
  display: block;
  width: 100%;
  height: 100%;
}

.country {
  fill: var(--color-country);
  stroke: var(--color-border);
  stroke-width: 0.5;
  transition: fill 0.2s ease;
  cursor: pointer;
}

.country:hover {
  fill: var(--color-country-hover);
}

.country.selected {
  fill: var(--color-accent);
}

.ocean {
  fill: var(--color-ocean);
}

.graticule {
  fill: none;
  stroke: var(--color-graticule);
  stroke-width: 0.5;
}
</style>
<script setup>
import { computed } from 'vue'
import { geoNaturalEarth1, geoPath, geoCentroid } from 'd3'

// Ritar GeoMaster-resan på en karta: länderna man har besökt (grönt = rätt,
// rött = fel) och en linje mellan dem i den ordning man reste.
const props = defineProps({
  // Kartdatan från loadWorld()
  world: { type: Object, required: true },
  // Alla länder i resan (id), så att kartan zoomar in på rätt område
  journeyIds: { type: Array, required: true },
  // De länder man har svarat på hittills, i ordning: [{ id: 'SWE', correct: true }, ...]
  visited: { type: Array, required: true },
})

const width = 800
const height = 360
const padding = 24

// Länder vars mittpunkt hamnar fel för en resa: Rysslands mittpunkt ligger
// i Sibirien, men resan går oftast genom europeiska Ryssland. [longitud, latitud]
const POSITION_OVERRIDES = {
  RUS: [37.6, 55.75], // Moskva
}

// Minsta område kartan visar, i grader, så att den inte zoomar in för mycket
// när resan går genom små länder
const MIN_SPAN_LON = 30
const MIN_SPAN_LAT = 16

// Antarktis visas inte, precis som på startsidan
const features = computed(() =>
  props.world.features.filter((feature) => feature.properties.id !== 'ATA')
)

const featuresById = computed(() =>
  new Map(features.value.map((feature) => [feature.properties.id, feature]))
)

// Var på jorden ett land "ligger" på resan: [longitud, latitud]
function positionOf(id) {
  return POSITION_OVERRIDES[id] || geoCentroid(featuresById.value.get(id))
}

// Projektionen zoomar in på resans länder. Vi utgår från ländernas
// mittpunkter (inte hela länderna), annars skulle t.ex. Ryssland eller
// Grönland göra att kartan alltid visar halva jorden.
const projection = computed(() => {
  const points = props.journeyIds.filter((id) => featuresById.value.has(id)).map(positionOf)
  let lons = points.map(([lon]) => lon)
  const lats = points.map(([, lat]) => lat)

  // Datumlinjen: går resan över ±180° (t.ex. Fiji i Oceanien) skulle rutan
  // annars bli hela jorden bred. Då räknar vi västliga längder som +360°.
  if (Math.max(...lons) - Math.min(...lons) > 180) {
    lons = lons.map((lon) => (lon < 0 ? lon + 360 : lon))
  }

  // Rutan runt alla mittpunkter, minst MIN_SPAN stor, plus lite marginal
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const halfLon = Math.max(Math.max(...lons) - Math.min(...lons), MIN_SPAN_LON) / 2 * 1.2
  const halfLat = Math.max(Math.max(...lats) - Math.min(...lats), MIN_SPAN_LAT) / 2 * 1.2
  const corners = {
    type: 'MultiPoint',
    coordinates: [
      [centerLon - halfLon, Math.max(-85, centerLat - halfLat)],
      [centerLon + halfLon, Math.min(85, centerLat + halfLat)],
      [centerLon - halfLon, Math.min(85, centerLat + halfLat)],
      [centerLon + halfLon, Math.max(-85, centerLat - halfLat)],
    ],
  }

  // rotate vrider jorden så att resan hamnar mitt i kartan
  return geoNaturalEarth1()
    .rotate([-centerLon, 0])
    .fitExtent([[padding, padding], [width - padding, height - padding]], corners)
})

const pathGenerator = computed(() => geoPath(projection.value))

// Besökta länder som uppslag: { SWE: true, NOR: false, ... }
const visitedById = computed(() =>
  Object.fromEntries(props.visited.map((stop) => [stop.id, stop.correct]))
)

// Alla länder som SVG-former, med färg efter om de är besökta
const countries = computed(() =>
  features.value.map((feature) => {
    const id = feature.properties.id
    let state = 'idle'
    if (id in visitedById.value) state = visitedById.value[id] ? 'correct' : 'wrong'
    return { id, d: pathGenerator.value(feature), state }
  })
)

// Mittpunkten på skärmen för varje besökt land, i resordning
const stops = computed(() =>
  props.visited
    .filter((stop) => featuresById.value.has(stop.id))
    .map((stop) => {
      const [x, y] = projection.value(positionOf(stop.id))
      return { ...stop, x, y }
    })
)

// Linjen mellan stoppen som en SVG-sträng: "x1,y1 x2,y2 ..."
const routePoints = computed(() => stops.value.map((stop) => `${stop.x},${stop.y}`).join(' '))
</script>

<template>
  <svg
    class="route-map"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="`Karta över resan: ${visited.length} av ${journeyIds.length} länder besökta`"
  >
    <path v-for="country in countries" :key="country.id" :d="country.d" class="country" :class="country.state" />
    <polyline v-if="stops.length > 1" :points="routePoints" class="route" />
    <circle
      v-for="(stop, index) in stops"
      :key="stop.id"
      :cx="stop.x"
      :cy="stop.y"
      :r="index === stops.length - 1 ? 7 : 4"
      class="stop"
      :class="{ latest: index === stops.length - 1 }"
    />
  </svg>
</template>

<style scoped>
.route-map {
  display: block;
  width: 100%;
  height: auto;
}

.country {
  fill: #e3f1e6;
  stroke: #ffffff;
  stroke-width: 0.75;
  transition: fill 0.3s ease;
}

.country.correct {
  fill: #41ac5a;
}

.country.wrong {
  fill: #e57373;
}

/* Resvägen: streckad linje mellan länderna */
.route {
  fill: none;
  stroke: var(--primary-green, #1b4d3e);
  stroke-width: 2.5;
  stroke-dasharray: 6 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stop {
  fill: var(--primary-green, #1b4d3e);
  stroke: #ffffff;
  stroke-width: 1.5;
}

/* Landet man senast svarade på pulserar lite */
.stop.latest {
  fill: #f08c00;
  animation: pulse 1.2s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.35); }
}

@media (prefers-reduced-motion: reduce) {
  .country {
    transition: none;
  }

  .stop.latest {
    animation: none;
  }
}
</style>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import WorldMap from '../components/WorldMap.vue'
import CountryInfoCard from '../components/CountryInfoCard.vue'
import { loadWorld, loadCapitals } from '../services/countries.js'

const world = ref(null)

// Huvudstäderna, { 'SWE': 'Stockholm', ... }. Tomt objekt tills de är laddade.
const capitals = ref({})

// id på landet användaren klickat på (t.ex. 'FRA'), eller null
const selectedId = ref(null)

// Infokortet – används för att scrolla fram det på små skärmar
const infoCard = ref(null)

// Hela landets egenskaper ({ id, name_sv, continent, iso2, ... }) för det valda landet
const selectedCountry = computed(() => {
  if (!world.value || !selectedId.value) return null
  const feature = world.value.features.find((f) => f.properties.id === selectedId.value)
  return feature ? feature.properties : null
})

// WorldMap skickar 'select' när man klickar på ett land.
// Klick på samma land igen stänger kortet.
async function onSelect(country) {
  selectedId.value = country.id === selectedId.value ? null : country.id

  // Vänta tills kortet har ritats, och scrolla sedan fram det om det inte syns
  if (selectedId.value) {
    await nextTick()
    infoCard.value?.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function closeCard() {
  selectedId.value = null
}

onMounted(async () => {
  world.value = await loadWorld()

  // Huvudstäderna laddas efter kartan. Går det inte visas kortet ändå, utan huvudstad.
  try {
    capitals.value = await loadCapitals()
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <div class="home-container">
    <div class="map-wrapper">
      <WorldMap v-if="world" :world="world" :selected-id="selectedId" @select="onSelect" />
    </div>
  </div>

  <CountryInfoCard
    v-if="selectedCountry"
    ref="infoCard"
    :country="selectedCountry"
    :capital="capitals[selectedCountry.id]"
    @close="closeCard"
  />
  <p v-else-if="world" class="map-hint">Klicka på ett land för att se mer om det</p>

  <article class="home-info">
    <h2>Välkommen till GeoKnowledge!</h2>
    <p>Här kan du klicka in på "Välj Quiz" och utmana dig själv i något av våra geografi-quiz, varför inte testa vårt kontur-quiz och se hur bra du är på länders konturer. Du kan också klicka in på "Meny" och utforska vad du mer kan göra på den här sidan.</p>
  </article>
</template>

<style scoped>

.home-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 20px;
  padding: 10px;
}

.home-info{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 20px auto;
  padding: 24px;
  width: calc(100% - 40px);
  max-width: 550px;
 
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 24px; 
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12); 
  
  text-align: center;
}

.map-wrapper {
  width: 100%;
  max-width: 1000px; 
  
  --color-ocean: transparent;       
  --color-country: #41ac5a;      
  --color-country-hover: #4dbd67;
  --color-graticule: transparent; 
  --color-border: #1B4D3E;
  --color-accent: #1B4D3E;          /* färgen på det land man klickat på */
  /*--color-ocean-border: rgba(27, 77, 62, 0.12)     */  

}

.map-hint {
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  opacity: 0.75;
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import WorldMap from '../components/WorldMap.vue'
import { loadWorld } from '../services/countries.js'

const world = ref(null)

onMounted(async () => {
  world.value = await loadWorld()
})
</script>

<template>
  <div class="home-container">
    <div class="map-wrapper">
      <WorldMap v-if="world" :world="world" />
    </div>
  </div>

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
  /*--color-ocean-border: rgba(27, 77, 62, 0.12)     */  

}
</style>

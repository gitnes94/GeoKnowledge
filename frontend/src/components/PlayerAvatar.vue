<script setup>
// En spelares runda profilbild. Saknas bilden, eller går den inte att ladda,
// visas första bokstaven i namnet i stället. Används på topplistan.
import { ref, computed, watch } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  pictureUrl: { type: String, default: null },
  // Storlek i rem
  size: { type: Number, default: 2 },
})

// Blir true om bilden inte gick att ladda
const failed = ref(false)
// En ny bild (t.ex. när man byter flik) ska få en ny chans
watch(() => props.pictureUrl, () => { failed.value = false })

// Första bokstaven. [...namn] så att t.ex. Å inte delas på mitten.
// (props.name || '') så att komponenten aldrig kraschar om namnet saknas.
const initial = computed(() => ([...(props.name || '')][0] || '?').toUpperCase())
</script>

<template>
  <!-- alt är tomt: namnet står alltid direkt bredvid bilden -->
  <img
    v-if="pictureUrl && !failed"
    :src="pictureUrl"
    alt=""
    class="player-avatar"
    :style="{ width: `${size}rem`, height: `${size}rem` }"
    referrerpolicy="no-referrer"
    loading="lazy"
    @error="failed = true"
  />
  <span
    v-else
    class="player-avatar initial"
    :style="{ width: `${size}rem`, height: `${size}rem`, fontSize: `${size * 0.4}rem` }"
    aria-hidden="true"
  >{{ initial }}</span>
</template>

<style scoped>
.player-avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  object-fit: cover;
}

.initial {
  background: #d6e9da;
  color: var(--primary-green);
  font-weight: 750;
}
</style>

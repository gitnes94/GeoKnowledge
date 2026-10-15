  <script setup>
import { ref, computed } from 'vue'

// Komponenten får en lista med frågor från createQuestions i quiz.js
const props = defineProps({
  questions: {type: Array, required: true},
})

// Events som komponenten skickar till föräldern
const emit = defineEmits(['finished'])

// Vilken fråga är vi på (0 = första frågan)
const currentIndex = ref(0)

// Antal rätta svar hittills
const correctCount = ref(0)

// Id på svaret användaren valt på frågan (null = inget svar)
const selectedId = ref(null)

// Blir true när quizet är slut, så att resultatet bara skickas en gång
const isFinished = ref(false)

// Frågan som visas just nu
const currentQuestion = computed(() => props.questions[currentIndex.value])

// Körs när användaren klickar på ett svarsalternativ
function selectAnswer(option) {
  if (selectedId.value !== null) {
    return
  }
  selectedId.value = option.id
  if (option.id === currentQuestion.value.correct.id) {
    correctCount.value++
  }
}

// Körs när användaren klickar på "Nästa"
function nextQuestion() {
  if (isFinished.value) {
    return
  }
  if (currentIndex.value === props.questions.length - 1) {
    isFinished.value = true
    emit('finished', {
      correct_count: correctCount.value,
      total: props.questions.length,
    })
    return
  }

  currentIndex.value++
  selectedId.value = null
}

</script>
<template>
  <div class="quiz-runner">
    <p v-if="!currentQuestion">Inga frågor att visa.</p>
    <template v-else>
      <p class="progress">Fråga {{ currentIndex + 1 }} av {{ questions.length }}</p>

      <slot :question="currentQuestion"/>
      <div class="options">
        <button
            v-for="option in currentQuestion.options"
            :key="option.id"
            class="option"
            :class="{ selected: option.id === selectedId }"
            :disabled="selectedId !== null"
            @click="selectAnswer(option)"
        >
          {{ option.name }}
        </button>
      </div>

      <button class="next"
              :disabled="selectedId === null || isFinished"
              @click="nextQuestion">
        Nästa
      </button>
    </template>
  </div>
</template>

<style scoped>
/* Gemensam stil för alla quiztyper (kontur, flagga, ...) */
.progress {
  display: inline-block;
  margin: 0;
  padding: 0.25rem 0.875rem;
  border-radius: 999px;
  background: #41ac5a;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Svarsknapparna: två kolumner, en kolumn på smala skärmar */
.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
}

@media (max-width: 480px) {
  .options {
    grid-template-columns: 1fr;
  }
}

button {
  font: inherit;
  font-weight: 700;
  border: 3px solid var(--primary-green, #1b4d3e);
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.option {
  padding: 0.875rem 1rem;
  color: var(--primary-green, #1b4d3e);
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(27, 77, 62, 0.12);
}

.option:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #f0f8f1;
}

/* Efter svar: det valda alternativet markeras, de andra tonas ned */
.option:disabled {
  cursor: default;
  opacity: 0.5;
}

.option.selected {
  opacity: 1;
  background: #e3f1e6;
  box-shadow: 0 0 0 4px rgba(65, 172, 90, 0.3);
}

.next {
  margin-top: 1.5rem;
  padding: 0.75rem 2rem;
  color: #ffffff;
  background: var(--primary-green, #1b4d3e);
}

.next:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

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

<style scoped></style>

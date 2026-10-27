<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Komponenten får en lista med frågor från createQuestions i quiz.js
const props = defineProps({
  questions: {type: Array, required: true},
  // Tidsgräns för hela quizet i sekunder (null = ingen tidsgräns)
  timeLimit: { type: Number, default: null }
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

// Sekunder kvar på tidsgränsen (null = ingen tidsgräns)
const secondsLeft = ref(props.timeLimit)

// Id på timern, så att den kan stoppas
let timerId = null

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

// Grönt: rätt svar (efter att användaren har svarat)
function isCorrect(option) {
  return selectedId.value !== null && option.id === currentQuestion.value.correct.id
}

// Rött: användarens svar, om det var fel (efter att användaren har svarat)
function isWrong(option) {
  return option.id === selectedId.value && option.id !== currentQuestion.value.correct.id
}

// Avslutar quizet och skickar resultatet.
// Används både när sista frågan är klar och när tiden tar slut.
function finishQuiz() {
  if (isFinished.value) {
    return
  }
  isFinished.value = true
  stopTimer()
  emit('finished', {
    correct_count: correctCount.value,
    total: props.questions.length,
  })
}

// Körs när användaren klickar på "Nästa"
function nextQuestion() {
  if (isFinished.value) {
    return
  }
  if (currentIndex.value === props.questions.length - 1) {
    finishQuiz()
    return
  }

  currentIndex.value++
  selectedId.value = null
}

// Räknar ner en sekund. När tiden är slut avslutas quizet.
function tick() {
  secondsLeft.value--
  if (secondsLeft.value <= 0) {
    finishQuiz()
  }
}

// Stoppar nedräkningen
function stopTimer() {
  clearInterval(timerId)
  timerId = null
}

// Starta nedräkningen när quizet visas, om det finns en tidsgräns
onMounted(() => {
  if (props.timeLimit) {
    timerId = setInterval(tick, 1000)
  }
})

// Stoppa nedräkningen när komponenten tas bort (ny omgång eller annan sida)
onUnmounted(stopTimer)

</script>
<template>
  <div class="quiz-runner">
    <p v-if="!currentQuestion">Inga frågor att visa.</p>
    <template v-else>
      <p class="progress">Fråga {{ currentIndex + 1 }} av {{ questions.length }}</p>

      <slot :question="currentQuestion"/>

      <p v-if="timeLimit" class="timer" :class="{ urgent: secondsLeft <= 10 }" role="timer">
        ⏱ {{ secondsLeft }} s
      </p>

      <div class="options">
        <button
            v-for="option in currentQuestion.options"
            :key="option.id"
            class="option"
            :class="{ selected: option.id === selectedId, correct: isCorrect(option), wrong: isWrong(option) }"
            :disabled="selectedId !== null"
            @click="selectAnswer(option)"
        >
          {{ option.name }}
        </button>
      </div>

      <button v-if="selectedId !== null"
              class="next"
              :disabled="isFinished"
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


/* Nedräkningen, visas bara när quizet har en tidsgräns */
.timer {
  display: inline-block;
  margin: 0 0 1.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  background: var(--primary-green, #1b4d3e);
  color: #ffffff;
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* De sista 10 sekunderna blir den röd, så att man ser att tiden snart är slut */
.timer.urgent {
  background: var(--color-wrong);
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

/* Feedback efter svar: rätt svar grönt, fel svar rött */
.option.correct {
  opacity: 1;
  color: #ffffff;
  background: var(--color-correct);
  border-color: var(--color-correct);
}

.option.wrong {
  opacity: 1;
  color: #ffffff;
  background: var(--color-wrong);
  border-color: var(--color-wrong);
  box-shadow: 0 0 0 4px rgba(198, 40, 40, 0.3);
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

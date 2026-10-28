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

// Combo: från 5 rätt i rad ger varje rätt svar 20 % extra XP.
// Själva XP:n räknas ut i backenden (xp.js) – här visas bara combon.
// Ändras reglerna där ska siffrorna ändras här också.
const COMBO_START = 5
const COMBO_BONUS_PERCENT = 20

// Vilken fråga är vi på (0 = första frågan)
const currentIndex = ref(0)

// Antal rätta svar hittills
const correctCount = ref(0)

// Id på svaret användaren valt på frågan (null = inget svar)
const selectedId = ref(null)

// Blir true när quizet är slut, så att resultatet bara skickas en gång
const isFinished = ref(false)

// Ett svar per besvarad fråga, i ordning: true = rätt, false = fel
const answers = ref([])

// Antal rätt i rad just nu (räknas bakifrån tills första felet)
const streak = computed(() => {
  let count = 0
  for (let i = answers.value.length - 1; i >= 0 && answers.value[i]; i--) {
    count++
  }
  return count
})

// true när combon är igång och rätta svar ger bonus
const comboActive = computed(() => streak.value >= COMBO_START)
// Sekunder kvar på tidsgränsen (null = ingen tidsgräns)
const secondsLeft = ref(props.timeLimit)

// Id på timern, så att den kan stoppas
let timerId = null

// Tidpunkten då tiden tar slut (i millisekunder), sätts när timern startar
let deadline = null

// Frågan som visas just nu
const currentQuestion = computed(() => props.questions[currentIndex.value])

// Körs när användaren klickar på ett svarsalternativ
function selectAnswer(option) {
  if (selectedId.value !== null || isFinished.value) {
    return
  }
  // Tiden kan ha tagit slut mellan två tick – då räknas inte svaret
  if (deadline && Date.now() >= deadline) {
    finishQuiz()
    return
  }
  selectedId.value = option.id
  const isRight = option.id === currentQuestion.value.correct.id
  answers.value.push(isRight)
  if (isRight) {
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
    // Tar tiden slut räknas obesvarade frågor som fel, så att listan
    // alltid har ett svar per fråga (det kontrollerar backenden)
    answers: [
      ...answers.value,
      ...Array(props.questions.length - answers.value.length).fill(false),
    ],
    // Hann användaren svara på alla frågor? Blir false om tiden tog slut innan.
    completed: answers.value.length === props.questions.length,
    // Sekunder kvar när quizet tog slut. Bara när quizet har en tidsgräns,
    // annars undefined, och då skickas fältet inte alls till backend.
    seconds_left: props.timeLimit
        ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        : undefined,
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

// Räknar ut hur lång tid som är kvar. När tiden är slut avslutas quizet.
function tick() {
  const msLeft = deadline - Date.now()
  secondsLeft.value = Math.max(0, Math.ceil(msLeft / 1000))
  if (msLeft <= 0) {
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
    deadline = Date.now() + props.timeLimit * 1000
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
      <div class="status-row">
        <p class="progress">Fråga {{ currentIndex + 1 }} av {{ questions.length }}</p>

        <!-- Combo-räknaren syns från 2 rätt i rad. aria-live läser upp ändringar. -->
        <p v-if="streak >= 2" class="streak" :class="{ active: comboActive }" aria-live="polite">
          🔥 {{ streak }} i rad<template v-if="comboActive"> · +{{ COMBO_BONUS_PERCENT }} % XP</template>
          <template v-else-if="streak === COMBO_START - 1"> · en till för combo!</template>
        </p>
      </div>

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
            :disabled="selectedId !== null || isFinished"
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

/* Frågeräknaren och combo-räknaren bredvid varandra */
.status-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.streak {
  margin: 0;
  padding: 0.25rem 0.875rem;
  border-radius: 999px;
  border: 2px solid #f08c00;
  color: #a65d00;
  background: #fff4e0;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Combon är igång: fylld orange och en liten puls */
.streak.active {
  color: #ffffff;
  background: #f08c00;
  animation: pulse 0.4s ease-out;
}

@keyframes pulse {
  from { transform: scale(1.15); }
  to { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .streak.active {
    animation: none;
  }
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

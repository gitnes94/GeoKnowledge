<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Komponenten visar frågorna en i taget. Den vet INTE vilket svar som är rätt –
// den frågar servern via checkAnswer och färgar knapparna efter svaret.
const props = defineProps({
  // Frågorna från servern: [{ kind, options: [{ id, name }], shape?, flag?, capital? }, ...]
  questions: { type: Array, required: true },
  // Rättar ett svar: (index, optionId) => Promise<{ correct, correct_id }>
  checkAnswer: { type: Function, required: true },
  // Tidsgräns för hela quizet i sekunder (null = ingen tidsgräns)
  timeLimit: { type: Number, default: null },
  // Antal liv: så många fel får man göra innan quizet tar slut (null = inga liv)
  lives: { type: Number, default: null },
})

// Events som komponenten skickar till föräldern
//   finished – quizet är slut: { correct_count, total }
//   answered – en fråga är besvarad: { index, correct, correctId } (t.ex. för GeoMaster-kartan)
const emit = defineEmits(['finished', 'answered'])

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

// Id på rätt svar, när servern har berättat det (null = inte rättat än)
const correctId = ref(null)

// true medan vi väntar på att servern ska rätta svaret
const checking = ref(false)

// Felmeddelande om svaret inte kom fram till servern
const answerError = ref(null)

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

// Liv kvar (null om quizet inte har liv)
const livesLeft = computed(() =>
  props.lives === null ? null : props.lives - answers.value.filter((answer) => !answer).length
)

// true när alla liv är slut – då avslutas quizet när man klickar vidare
const outOfLives = computed(() => livesLeft.value !== null && livesLeft.value <= 0)

// true när combon är igång och rätta svar ger bonus
const comboActive = computed(() => streak.value >= COMBO_START)

// Sekunder kvar på tidsgränsen (null = ingen tidsgräns)
const secondsLeft = ref(props.timeLimit)

// Id på timern, så att den kan stoppas
let timerId = null

// Tidpunkten då tiden tar slut (i millisekunder), sätts när timern startar.
// Servern har sin egen klocka – den här visar bara nedräkningen.
let deadline = null

// Frågan som visas just nu
const currentQuestion = computed(() => props.questions[currentIndex.value])

// true när frågan är besvarad och rättad
const isAnswered = computed(() => correctId.value !== null)

// Körs när användaren klickar på ett svarsalternativ
async function selectAnswer(option) {
  if (selectedId.value !== null || checking.value || isFinished.value) {
    return
  }
  // Tiden kan ha tagit slut mellan två tick – då räknas inte svaret
  if (deadline && Date.now() >= deadline) {
    finishQuiz()
    return
  }

  const index = currentIndex.value
  selectedId.value = option.id
  checking.value = true
  answerError.value = null

  try {
    const graded = await props.checkAnswer(index, option.id)
    if (isFinished.value) return // tiden tog slut medan vi väntade

    // Visa svaret servern har sparat. Det är oftast det man klickade på, men
    // om ett tidigare försök hann sparas innan nätet bröts gäller det i stället.
    selectedId.value = graded.option_id ?? option.id
    correctId.value = graded.correct_id
    answers.value.push(graded.correct)
    if (graded.correct) {
      correctCount.value++
    }
    emit('answered', { index, correct: graded.correct, correctId: graded.correct_id })
  } catch (e) {
    console.error(e)
    if (isFinished.value) return
    // 409 = servern tar inte emot fler svar: tiden är slut, livet är slut eller
    // quizet är redan avslutat. Avsluta här också.
    if (e.status === 409) {
      finishQuiz()
      return
    }
    // Annars gick svaret inte fram – låt användaren försöka igen
    selectedId.value = null
    answerError.value = 'Svaret kom inte fram. Försök igen.'
  } finally {
    checking.value = false
  }
}

// Grönt: rätt svar (efter att servern har rättat)
function isCorrect(option) {
  return isAnswered.value && option.id === correctId.value
}

// Rött: användarens svar, om det var fel (efter att servern har rättat)
function isWrong(option) {
  return isAnswered.value && option.id === selectedId.value && option.id !== correctId.value
}

// Avslutar quizet och skickar resultatet till föräldern, som avslutar
// quizet på servern. Används både när sista frågan är klar och när tiden tar slut.
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
  // Sista frågan, eller slut på liv: avsluta
  if (currentIndex.value === props.questions.length - 1 || outOfLives.value) {
    finishQuiz()
    return
  }

  currentIndex.value++
  selectedId.value = null
  correctId.value = null
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

        <!-- Liv, bara om quizet har liv: fyllda hjärtan för liv kvar, tomma för förlorade -->
        <p v-if="lives !== null" class="lives" :aria-label="`${livesLeft} av ${lives} liv kvar`">
          <span v-for="n in lives" :key="n" aria-hidden="true">{{ n <= livesLeft ? '❤️' : '🤍' }}</span>
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
            class="btn option"
            :class="{ selected: option.id === selectedId, checking: checking && option.id === selectedId, correct: isCorrect(option), wrong: isWrong(option) }"
            :disabled="selectedId !== null || checking || isFinished"
            @click="selectAnswer(option)"
        >
          {{ option.name }}
        </button>
      </div>

      <p v-if="answerError" class="answer-error" role="alert">{{ answerError }}</p>

      <button v-if="isAnswered"
              class="btn btn-primary next"
              :disabled="isFinished"
              @click="nextQuestion">
        {{ outOfLives || currentIndex === questions.length - 1 ? 'Se resultat' : 'Nästa' }}
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
  border-radius: var(--radius-pill);
  background: var(--green-bright);
  color: var(--white);
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
  border-radius: var(--radius-pill);
  border: 2px solid var(--orange);
  color: var(--orange-dark);
  background: var(--orange-bg);
  font-size: 0.875rem;
  font-weight: 700;
}

/* Hjärtan för liv */
.lives {
  margin: 0;
  padding: 0.125rem 0.625rem;
  border-radius: var(--radius-pill);
  background: var(--card-bg);
  border: 2px solid var(--line);
  letter-spacing: 0.1em;
}

/* Combon är igång: fylld orange och en liten puls */
.streak.active {
  color: var(--white);
  background: var(--orange);
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
  border-radius: var(--radius-pill);
  background: var(--primary-green);
  color: var(--white);
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

/* Utseendet kommer från .btn i style.css – här bara storlek och skugga */
.option {
  padding: 0.875rem 1rem;
  box-shadow: var(--shadow-card);
}

.option:hover:not(:disabled) {
  transform: translateY(-2px);
}

/* Efter svar: det valda alternativet markeras, de andra tonas ned */
.option:disabled {
  cursor: default;
  opacity: 0.5;
}

.option.selected {
  opacity: 1;
  background: var(--track-bg);
  box-shadow: var(--ring-selected);
}

/* Feedback efter svar: rätt svar grönt, fel svar rött */
.option.correct {
  opacity: 1;
  color: var(--white);
  background: var(--color-correct);
  border-color: var(--color-correct);
}

.option.wrong {
  opacity: 1;
  color: var(--white);
  background: var(--color-wrong);
  border-color: var(--color-wrong);
  box-shadow: 0 0 0 4px rgba(198, 40, 40, 0.3);
}

/* Medan servern rättar svaret pulserar det valda alternativet lite */
.option.checking {
  animation: checking 0.8s ease-in-out infinite alternate;
}

@keyframes checking {
  from { box-shadow: 0 0 0 2px rgba(65, 172, 90, 0.2); }
  to { box-shadow: 0 0 0 6px rgba(65, 172, 90, 0.45); }
}

@media (prefers-reduced-motion: reduce) {
  .option.checking {
    animation: none;
  }
}

.answer-error {
  margin: 1rem 0 0;
  color: var(--color-wrong);
  font-weight: 700;
}

/* Nästa-knappen är lite större än en vanlig .btn */
.next {
  margin-top: 1.5rem;
  padding: 0.75rem 2rem;
}

</style>

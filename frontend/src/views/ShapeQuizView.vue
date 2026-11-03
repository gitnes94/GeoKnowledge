<script setup>
import QuizPage from '../components/QuizPage.vue'
</script>

<template>
  <!-- QuizPage sköter frågorna, sparandet och slutskärmen.
       Frågan (konturen) kommer från servern och visas av QuestionPrompt. -->
  <QuizPage title="Vilket land är detta?" quiz-type="shape" />
</template>

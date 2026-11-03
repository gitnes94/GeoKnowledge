<script setup>
import QuizPage from '../components/QuizPage.vue'
</script>

<template>
  <!-- QuizPage sköter frågorna, sparandet och slutskärmen.
       Frågan (flaggan) kommer från servern och visas av QuestionPrompt. -->
  <QuizPage title="Vilket land har den här flaggan?" quiz-type="flag" />
</template>

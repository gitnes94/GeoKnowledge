<script setup>
import QuizPage from '../components/QuizPage.vue'
</script>

<template>
  <!-- QuizPage sköter frågorna, sparandet och slutskärmen.
       Frågan (huvudstaden) kommer från servern och visas av QuestionPrompt. -->
  <QuizPage title="Vilket land har den här huvudstaden?" quiz-type="capital" />
</template>

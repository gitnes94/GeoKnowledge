import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import QuizSelectView from '../views/QuizSelectView.vue';
import ShapeQuizView from '../views/ShapeQuizView.vue';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/quiz',
      name: 'quiz-select',
      component: QuizSelectView,
    },
    {
      path: '/quiz/shape',
      name: 'shape-quiz',
      component: ShapeQuizView,
    },
  ]
});

export default router;

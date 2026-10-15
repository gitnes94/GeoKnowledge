import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import QuizSelectView from '../views/QuizSelectView.vue';
import ShapeQuizView from '../views/ShapeQuizView.vue';
import FlagQuizView from '../views/FlagQuizView.vue';


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
    {
      path: '/quiz/flag',
      name: 'flag-quiz',
      component: FlagQuizView,
    },
  ]
});

export default router;

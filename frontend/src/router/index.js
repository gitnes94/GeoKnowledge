import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import QuizSelectView from '../views/QuizSelectView.vue';
import ShapeQuizView from '../views/ShapeQuizView.vue';
import FlagQuizView from '../views/FlagQuizView.vue';
import CapitalQuizView from '../views/CapitalQuizView.vue';
import AuthSuccess from '../views/AuthSuccess.vue';
import Login from '../views/Login.vue';
import ContinentSelectView from '../views/ContinentSelectView.vue';
import ProfileView from '@/views/ProfileView.vue';
import MenuView from '@/views/MenuView.vue';
import LeaderboardView from '@/views/LeaderboardView.vue';

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
      path: '/quiz/:type/select',
      name: 'continent-select',
      component: ContinentSelectView,
    },
    {
      path: '/quiz/shape/play',
      name: 'shape-quiz',
      component: ShapeQuizView,
    },
    {
      path: '/quiz/flag/play',
      name: 'flag-quiz',
      component: FlagQuizView,
    },
    {
      path: '/quiz/capital/play',
      name: 'capital-quiz',
      component: CapitalQuizView,
    },
    {  
      path: '/auth/success',
      name: 'auth-success',
      component: AuthSuccess 
    },
    {
      path: '/login',
      name: 'login',
      component: Login 
    },
    {
      path: '/menu',
      name: 'menu',
      component: MenuView
    },
    {
      path: '/menu/leaderboard',
      name: 'leaderboard',
      component: LeaderboardView
    },
    {
      path: '/menu/profile',
      name: 'profile',
      component: ProfileView
    }
  ]
});

export default router;

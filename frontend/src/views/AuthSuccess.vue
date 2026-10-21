<script setup>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/services/auth';
import { apiFetch } from '@/services/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
    const token = route.query.token;

    if (typeof token !== 'string' || !token) {
        await router.replace('/login?error=AuthenticationFailed');
        return;
    }

    authStore.setToken(token);

    try {
        const response = await apiFetch('/api/auth/me');

        if (!response.ok) {
            throw new Error(`Kunde inte hämta användarprofilen (${response.status})`);
        }

        const user = await response.json();
        authStore.setUser(user);

        await router.replace('/');
    } catch (error) {
        console.error('Inloggningen kunde inte slutföras:', error);
        authStore.logout();
        await router.replace('/login?error=AuthenticationFailed');
    }
});
</script>

<template>
    <div class="auth-loading-container">
        <div class="spinner"></div>
        <h2>Logging you in...</h2>
        <p>Please wait while we complete your authentication.</p>
    </div>
</template>

<style scoped>
.auth-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: Arial, sans-serif;
}
.spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #42b883;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
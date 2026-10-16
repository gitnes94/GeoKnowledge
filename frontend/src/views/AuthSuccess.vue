<script setup>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/services/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
    const token = route.query.token;

    if (token) {
        // Save token to Pinia/LocalStorage
        authStore.setToken(token);

        // (Optional) Decode token or fetch user profile from backend using the token

        // Redirect to main page
        router.push('/');
    } else {
        // Handle missing token error
        router.push('/login?error=AuthenticationFailed');
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
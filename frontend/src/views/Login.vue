<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const isLoading = ref(false);

// Adressen innehåller ?error=... när inloggningen misslyckades
const route = useRoute();

// Felmeddelande utifrån ?error=... i adressen (null = inget fel)
const errorMessage = computed(() => {
  if (!route.query.error) {
    return null;
  }
  if (route.query.error === 'server') {
    return 'Något gick fel hos oss. Försök igen om en stund.';
  }
  return 'Inloggningen misslyckades eller avbröts. Försök igen.'
});

const loginWithGoogle = () => {
    isLoading.value = true;
    window.location.href = 'http://localhost:3000/api/auth/google';
};
</script>

<template>
    <div class="login-container">
        <div class="login-card">
            <h2>Welcome!</h2>
            <p>Please sign in to your profile.</p>

            <p v-if="errorMessage" class="login-error" role="alert">
              {{ errorMessage }}
            </p>
            
            <button @click="loginWithGoogle" :disabled="isLoading" class="google-btn">
                <span v-if="isLoading" class="google-text">Redirecting...</span>
                <span v-else class="google-text">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google Logo" class="google-logo" />
                    Sign in with Google
                </span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 50px;
}

.login-card {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    width: 100%;
    max-width: 400px;
}

.login-card h2 {
    margin-bottom: 0.5rem;
    color: #333;
}

.login-card p {
    color: #666;
    margin-bottom: 2rem;
}

.google-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background-color: white;
    color: #444;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, box-shadow 0.2s;
}

.google-btn:hover {
    background-color: #f8f9fa;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.google-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.google-logo {
    width: 20px;
    height: 20px;
}

.google-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 25px;
    width: 100%;
    gap: 12px;
}

.login-card .login-error {
  color: var(--color-wrong);
  font-weight: 600;
  margin-bottom: 1rem;
}

</style>

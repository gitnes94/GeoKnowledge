<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { API_URL } from '@/services/api';
import googleLogo from '@/assets/google-logo.svg';

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
    window.location.href = `${API_URL}/api/auth/google`;
};
</script>

<template>
    <div class="login-container">
        <div class="login-card">
            <h2>Välkommen!</h2>
            <p>Logga in för att spara dina resultat och samla XP.</p>

            <p v-if="errorMessage" class="login-error" role="alert">
              {{ errorMessage }}
            </p>
            
            <button @click="loginWithGoogle" :disabled="isLoading" class="google-btn">
              <span v-if="isLoading" class="google-text">Skickar dig till Google…</span>
              <span v-else class="google-text">
                    <img :src="googleLogo" alt="" class="google-logo" />
                Logga in med Google
                </span>
            </button>
          <!-- Vilka uppgifter vi sparar om den som loggar in -->
          <p class="privacy">
            När du loggar in sparar vi din e-postadress, ditt namn och din profilbild från Google,
            och dina quizresultat. Ditt namn och din profilbild syns på topplistan. Uppgifterna används
            bara i det här skolprojektet och raderas när kursen är slut.
            På profilsidan kan du byta namn och ta bort ditt konto med alla dina uppgifter.
          </p>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 1.5rem 1rem;
}

.login-card {
  background: var(--card-bg, #ffffff);
  padding: 2rem 1.5rem;
  border-radius: 1.75rem;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
  text-align: center;
  width: 100%;
  max-width: 26rem;
}

.login-card h2 {
  margin: 0;
  font-size: 1.75rem;
}

.login-card p {
  margin: 0.5rem 0 1.5rem;
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
    font-family: inherit;
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

/* Texten om personuppgifter – mindre och dämpad, som en fotnot */
.login-card .privacy {
  margin: 1.5rem 0 0;
  font-size: 0.85rem;
  opacity: 0.75;
}

</style>

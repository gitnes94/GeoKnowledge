import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') || null);
    const user = ref(JSON.parse(localStorage.getItem('user')) || null);

    // Inloggad = det finns en användbar token
    const isLoggedIn = computed(() => Boolean(token.value));

    // Set token and optionally user profile after successful login
    function setToken(newToken) {
        token.value = newToken;
        localStorage.setItem('token', newToken);
    }

    function setUser(userData) {
        user.value = userData;
        localStorage.setItem('user', JSON.stringify(userData));
    }

    // Clear session on logout
    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    return {
        token,
        user,
        isLoggedIn,
        setToken,
        setUser,
        logout
    };
});

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/services/auth'

const router = useRouter()
const authStore = useAuthStore()
console.log("Kollar authStore.user:", authStore.user)
// Loggar ut och skickar användaren till startsidan
function logout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
    
    <header class="app-header">
        
        <router-link to="/" class = "logo-container">
            <img src="../assets/geoknowledge.png" alt="Logo" />
            <h1>GeoKnowledge</h1>
        </router-link>

        <nav class="main-nav">
          
            <router-link to="/menu" class="nav-button">
            <span class="icon">≡</span> Meny
            </router-link>
            <router-link to="/quiz" class="nav-button">
            Välj Quiz
            </router-link>

          <router-link v-if="!authStore.isLoggedIn" to="/login" class="nav-button">
            Logga in
          </router-link>

            
          <button v-else class="nav-button" @click="logout">
            Logga ut
          </button>
          
           
        </nav>
        <span
              v-if="authStore.isLoggedIn && authStore.user && authStore.user.username"
              class="user-name"
            >
                Inloggad som {{ authStore.user.username }}
              </span>

    </header>

</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Knewave&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');

.app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  font-family: "Knewave", system-ui;
  font-style: normal;
  font-size: x-large;
  text-shadow: 1px 1px 0px rgba(182, 241, 171, 0.5);
}

img {
  height: 60px;
  width: auto;
  transition: transform 0.3s ease;
}
.logo-container:hover img {
  transform: rotate(15deg) scale(1.1);
}

.main-nav {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 400px;
  justify-content: center;
}

.nav-button {
  flex: 1; /* Gör så att knapparna tar lika mycket plats */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  max-width: 250px;
  min-width: min-content;
  white-space: nowrap;
  background-color: var(--card-bg, #ffffff);
  color: var(--primary-green, #1B4D3E); 
  border: 3px solid var(--primary-green, #1B4D3E);
  border-radius: 50px; 
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  box-shadow: 0 4px 10px rgba(27, 77, 62, 0.12);
  transition: all 0.2s ease;
}
.nav-button:hover {
  background-color: #f0f8f1; 
  transform: translateY(-2px); 
  box-shadow: 0 6px 14px rgba(27, 77, 62, 0.2);
}.nav-button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 5px rgba(27, 77, 62, 0.15);
}
.nav-button .icon {
  font-size: 1.3rem;
}
button.nav-button {
  font-family: inherit;
  cursor: pointer;
}.user-info-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  align-self: center;
  white-space: nowrap;
}

/* Desktop*/
@media screen and (min-width: 1024px)  {
  .app-header{
  flex-direction: row;
  flex-wrap: wrap;
  gap: 25px;
  justify-content: center;
  align-items: center;
  }
  .main-nav {
    margin-bottom: 0;
  }
}

</style>

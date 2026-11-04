<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/services/auth'

const router = useRouter()
const authStore = useAuthStore()

// Blir true en kort stund efter utloggning, så att meddelandet syns
const showLoggedOut = ref(false)

console.log("Kollar authStore.user:", authStore.user)
// Loggar ut, skickar användaren till startsidan och visar ett kort meddelande
function logout() {
  authStore.logout()
  router.push('/')

  // Visa "Du är nu utloggad" i 3 sekunder
  showLoggedOut.value = true
  setTimeout(() => {
    showLoggedOut.value = false
  }, 3000)
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
    <p v-if="showLoggedOut" class="logout-message" role="status">
      Du är nu utloggad
    </p>

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
  max-width: 600px;
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
  background-color: var(--card-bg);
  color: var(--primary-green);
  border: var(--border);
  border-radius: var(--radius-pill);
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}
.nav-button:hover {
  background-color: var(--hover-bg);
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

/* Kort meddelande efter utloggning. Ligger fast högst upp i fönstret,
   så att det syns på alla sidor och inte knuffar ner innehållet */
.logout-message {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  margin: 0;
  padding: 0.75rem 1.5rem;
  background: var(--primary-green);
  color: var(--white);
  font-weight: bold;
  border-radius: var(--radius-pill);
  box-shadow: 0 6px 16px rgba(27, 77, 62, 0.25);
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

/* Mobil: luft på sidorna, mindre knappar och mindre logga så att inget sticker ut */
@media (max-width: 600px) {
  .main-nav {
    gap: 0.5rem;
    padding: 0 1rem;
    margin-bottom: 0.75rem;
  }

  .nav-button {
    padding: 8px 12px;
    font-size: 1rem;
  }

  .logo-container {
    font-size: large;
  }

  img {
    height: 44px;
  }
}

</style>

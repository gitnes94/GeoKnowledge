<script setup></script>

<template>
    <div class="app-container">
    <header>
        
        <router-link to="/" class = "logo-container">
            <img src="..jordglob?" alt="Logo" />
            <h1>GeoKnowledge</h1>
        </router-link>

        <nav class="main-nav">
            <router-link to="/menu" class="nav-button">
            <span class="icon">≡</span> Meny
            </router-link>
            <router-link to="/quiz" class="nav-button">
            Välj Quiz
            </router-link>
        </nav>

    </header>

    </div>
</template>

<style scoped>
.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}
/* Ett smakprov på hur du kan styla navigeringen */
.main-nav {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.nav-button {
  flex: 1; /* Gör så att knapparna tar lika mycket plats */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: white;
  color: #1b5e20; 
  border: 3px solid #1b5e20;
  border-radius: 50px; 
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
}
</style>
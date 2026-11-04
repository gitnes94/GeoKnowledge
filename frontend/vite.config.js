import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Starta alltid på 5173. Är porten upptagen stannar Vite med ett fel i
  // stället för att tyst välja 5174 – backenden släpper bara in FRONTEND_URL
  // (http://localhost:5173) via CORS, så på en annan port fungerar inga anrop.
  server: {
    port: 5173,
    strictPort: true,
  },
})

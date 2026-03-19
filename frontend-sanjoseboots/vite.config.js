// frontend-sanjoseboots/vite.config.js — CORREGIDO
// Eliminado open: true para evitar que abra el navegador automáticamente
// (el IniciarSistema.bat ya lo abre con un delay apropiado)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,   // ← CAMBIADO: el .bat abre el navegador manualmente
  }
})

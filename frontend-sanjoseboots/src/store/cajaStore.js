// src/store/cajaStore.js — VERSIÓN CORREGIDA
// Cambios:
//  1. Nuevo flag cajaDeOtroUsuario para mostrar aviso en el UI
//  2. clearCaja ya NO se llama en logout (solo en cierre real de caja)

import { create } from 'zustand';

const useCajaStore = create((set, get) => ({
  cajaActual:          null,   // objeto completo de la caja abierta
  hasCajaAbierta:      false,  // boolean rápido para guards
  cajaDeOtroUsuario:   false,  // true si la caja pertenece a otro usuario
  loadingCaja:         false,  // durante la verificación inicial
  initialized:         false,  // true cuando ya se consultó el backend al menos 1 vez

  // ── Setters ────────────────────────────────────────────────
  setCajaActual: (caja, esDeOtroUsuario = false) =>
    set({
      cajaActual:        caja,
      hasCajaAbierta:    !!caja,
      cajaDeOtroUsuario: esDeOtroUsuario,
    }),

  clearCaja: () =>
    set({
      cajaActual:        null,
      hasCajaAbierta:    false,
      cajaDeOtroUsuario: false,
    }),

  setLoadingCaja:  (v) => set({ loadingCaja: v }),
  setInitialized:  (v) => set({ initialized: v }),

  // ── Helpers de lectura ─────────────────────────────────────
  getCajaID: () => get().cajaActual?.CajaID ?? null,

  getMontoEsperado: () => {
    const c = get().cajaActual;
    if (!c) return 0;
    return (
      parseFloat(c.MontoInicial        || 0) +
      parseFloat(c.TotalVentasEfectivo || 0)
    );
  },
}));

export default useCajaStore;

// src/store/cajaStore.js
import { create } from 'zustand';

const useCajaStore = create((set, get) => ({
  cajaActual:     null,   // objeto completo de la caja abierta
  hasCajaAbierta: false,  // boolean rápido para guards
  loadingCaja:    false,  // durante la verificación inicial
  initialized:    false,  // true cuando ya se consultó el backend al menos 1 vez

  // ── Setters ────────────────────────────────────────────
  setCajaActual: (caja) =>
    set({ cajaActual: caja, hasCajaAbierta: !!caja }),

  clearCaja: () =>
    set({ cajaActual: null, hasCajaAbierta: false }),

  setLoadingCaja:  (v) => set({ loadingCaja: v }),
  setInitialized:  (v) => set({ initialized: v }),

  // ── Helpers de lectura ─────────────────────────────────
  getCajaID: () => get().cajaActual?.CajaID ?? null,

  // Efectivo esperado = Inicial + ventas en efectivo
  getMontoEsperado: () => {
    const c = get().cajaActual;
    if (!c) return 0;
    return (
      parseFloat(c.MontoInicial           || 0) +
      parseFloat(c.TotalVentasEfectivo    || 0)
    );
  },
}));

export default useCajaStore;
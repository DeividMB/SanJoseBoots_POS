// src/routes/caja.routes.js — VERSIÓN COMPLETA FASE 6
// Reemplaza tu archivo actual

const express = require('express');
const router = express.Router();
const {
  obtenerCajaActual,
  abrirCaja,
  cerrarCaja,
  obtenerVentasCaja,
  historialCajas,
  ultimoCierre,
  registrarMovimiento,
  obtenerMovimientos,
  resumenCompleto,
} = require('../controllers/caja.controller');
const { authenticateToken: authMiddleware } = require('../middlewares/auth.middleware');

router.get('/actual',                  authMiddleware, obtenerCajaActual);
router.post('/abrir',                  authMiddleware, abrirCaja);
router.put('/cerrar/:id',              authMiddleware, cerrarCaja);
router.get('/historial',               authMiddleware, historialCajas);
router.get('/ultimo-cierre',           authMiddleware, ultimoCierre);
router.post('/movimiento',             authMiddleware, registrarMovimiento);
router.get('/:id/ventas',              authMiddleware, obtenerVentasCaja);
router.get('/:id/movimientos',         authMiddleware, obtenerMovimientos);
router.get('/:id/resumen-completo',    authMiddleware, resumenCompleto);

module.exports = router;
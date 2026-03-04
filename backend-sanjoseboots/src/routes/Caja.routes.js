// src/routes/caja.routes.js
const express         = require('express');
const router          = express.Router();
const { authenticateToken, checkRole } = require('../middlewares/auth.middleware');
const cajaController  = require('../controllers/Caja.controller');

router.use(authenticateToken);

// Estado actual de la caja (todos los autenticados)
router.get('/actual', cajaController.getCajaActual);

// Historial de cortes (solo Administrador y Gerente)
router.get('/historial', checkRole('Administrador', 'Gerente'), cajaController.getHistorialCortes);

// Abrir caja (Administrador y Gerente)
router.post('/abrir', checkRole('Administrador', 'Gerente'), cajaController.abrirCaja);

// Realizar corte (Administrador y Gerente)
router.post('/corte', checkRole('Administrador', 'Gerente'), cajaController.realizarCorte);

module.exports = router;
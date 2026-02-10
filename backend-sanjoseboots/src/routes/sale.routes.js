// src/routes/sale.routes.js
const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const { authenticateToken, checkPermission } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Crear venta
router.post('/', 
  checkPermission('ventas', 'create'),
  saleController.createSale
);

// Obtener venta por ID
router.get('/:id',
  checkPermission('ventas', 'read'),
  saleController.getSaleById
);

// Obtener ventas por período
router.get('/',
  checkPermission('ventas', 'read'),
  saleController.getSalesByPeriod
);

// Cancelar venta
router.post('/:id/cancel',
  checkPermission('ventas', 'create'),
  saleController.cancelSale
);

// Obtener resumen diario
router.get('/daily-summary',
  checkPermission('ventas', 'read'),
  saleController.getDailySummary
);

module.exports = router;
// ============================================
// NUEVAS RUTAS DE REPORTES
// Este es NUEVO - crear como archivo nuevo
// backend/src/routes/reports.routes.js (con S)
// ============================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  getSalesReport,
  getSaleDetail,
  getSalesSummary,
  getInventoryReport,
  getTopProducts,
  getSalesByPeriod,
  exportSalesToExcel,
  exportInventoryToExcel
} = require('../controllers/reports.controller');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// REPORTES DE VENTAS
router.get('/sales', getSalesReport);
router.get('/sales/summary', getSalesSummary);
router.get('/sales/:id', getSaleDetail);
router.get('/sales-by-period', getSalesByPeriod);

// REPORTES DE INVENTARIO
router.get('/inventory', getInventoryReport);

// TOP PRODUCTOS
router.get('/top-products', getTopProducts);

// EXPORTACIONES
router.get('/export/sales', exportSalesToExcel);
router.get('/export/inventory', exportInventoryToExcel);

module.exports = router;
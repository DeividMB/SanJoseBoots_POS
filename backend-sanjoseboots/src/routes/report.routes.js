/**
 * Rutas de Reportes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken, checkPermission } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/v1/reports/dashboard
router.get('/dashboard', reportController.getDashboard);

// GET /api/v1/reports/top-products
router.get('/top-products', checkPermission('reportes', 'ver'), reportController.getTopProducts);

// GET /api/v1/reports/sales-by-category
router.get('/sales-by-category', checkPermission('reportes', 'ver'), reportController.getSalesByCategory);

// GET /api/v1/reports/daily-sales
router.get('/daily-sales', checkPermission('reportes', 'ver'), reportController.getDailySales);

// GET /api/v1/reports/inventory
router.get('/inventory', checkPermission('reportes', 'ver'), reportController.getInventoryReport);

// GET /api/v1/reports/sellers-performance
router.get('/sellers-performance', checkPermission('reportes', 'ver'), reportController.getSellersPerformance);

module.exports = router;
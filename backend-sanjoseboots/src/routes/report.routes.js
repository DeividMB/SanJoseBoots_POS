// src/routes/report.routes.js
const express          = require('express');
const router           = express.Router();
const { authenticateToken, checkPermission } = require('../middlewares/auth.middleware');
const reportController = require('../controllers/report.controller');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Dashboard — accesible para todos los roles autenticados
router.get('/dashboard', reportController.getDashboard);

// Reportes — requieren permiso 'reportes'
router.get('/top-products',    checkPermission('reportes', 'ver'), reportController.getTopProducts);
router.get('/by-category',     checkPermission('reportes', 'ver'), reportController.getSalesByCategory);
router.get('/daily-sales',     checkPermission('reportes', 'ver'), reportController.getDailySales);
router.get('/inventory',       checkPermission('reportes', 'ver'), reportController.getInventoryReport);
router.get('/sellers',         checkPermission('reportes', 'ver'), reportController.getSellersPerformance);
router.get('/payment-methods', checkPermission('reportes', 'ver'), reportController.getPaymentMethods);

module.exports = router;
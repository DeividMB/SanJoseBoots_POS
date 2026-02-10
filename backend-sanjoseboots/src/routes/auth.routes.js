/**
 * Rutas de Autenticación
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// POST /api/v1/auth/login
router.post('/login', authController.login);

// POST /api/v1/auth/register (protegido - solo admin)
router.post('/register', authenticateToken, authController.register);

// GET /api/v1/auth/profile (protegido)
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
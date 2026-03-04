// src/routes/user.routes.js
const express        = require('express');
const router         = express.Router();
const { authenticateToken, checkRole } = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ── IMPORTANTE: rutas estáticas ANTES que las rutas con :id ──────────────────

// Roles disponibles (debe ir antes de /:id para que no se confunda)
router.get('/roles', userController.getRoles);

// ── CRUD usuarios (solo Administrador) ───────────────────────────────────────
router.get('/',     checkRole('Administrador'), userController.getAllUsers);
router.post('/',    checkRole('Administrador'), userController.createUser);

router.get('/:id',  checkRole('Administrador'), userController.getUserById);
router.put('/:id',  checkRole('Administrador'), userController.updateUser);

// ── Estado ────────────────────────────────────────────────────────────────────
router.patch('/:id/toggle-status',  checkRole('Administrador'), userController.toggleUserStatus);

// ── Contraseñas ───────────────────────────────────────────────────────────────
router.patch('/:id/change-password', userController.changePassword);
router.patch('/:id/reset-password',  checkRole('Administrador'), userController.resetPassword);

module.exports = router;
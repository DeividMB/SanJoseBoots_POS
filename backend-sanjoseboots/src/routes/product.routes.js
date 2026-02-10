const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getSuppliers
} = require('../controllers/product.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// ==================== RUTAS DE PRODUCTOS ====================

// GET /api/v1/products - Listar todos los productos
router.get('/', getAllProducts);

// GET /api/v1/products/search - Buscar productos (DEBE IR ANTES de /:id)
router.get('/search', searchProducts);

// GET /api/v1/products/:id - Obtener un producto por ID
router.get('/:id', getProductById);

// POST /api/v1/products - Crear un nuevo producto
router.post('/', createProduct);

// PUT /api/v1/products/:id - Actualizar un producto
router.put('/:id', updateProduct);

// DELETE /api/v1/products/:id - Eliminar un producto
router.delete('/:id', deleteProduct);

// ==================== RUTAS DE CATEGORÍAS ====================

// GET /api/v1/products/categories/list - Obtener todas las categorías
router.get('/categories/list', getCategories);

// ==================== RUTAS DE PROVEEDORES ====================

// GET /api/v1/products/suppliers/list - Obtener todos los proveedores
router.get('/suppliers/list', getSuppliers);

module.exports = router;
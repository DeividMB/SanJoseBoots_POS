const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

// Crear proveedor
router.post('/', async (req, res) => {
  try {
    const {
      NombreProveedor,
      NombreContacto,
      Telefono,
      Email,
      Direccion,
      RFC,
      Activo = 1
    } = req.body;

    if (!NombreProveedor) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del proveedor es obligatorio'
      });
    }

    const result = await executeQuery(
      `INSERT INTO proveedores 
       (NombreProveedor, NombreContacto, Telefono, Email, Direccion, RFC, Activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [NombreProveedor, NombreContacto, Telefono, Email, Direccion, RFC, Activo]
    );

    res.status(201).json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: {
        ProveedorID: result.insertId,
        NombreProveedor
      }
    });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
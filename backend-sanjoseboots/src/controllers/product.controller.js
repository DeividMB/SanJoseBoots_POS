const { executeQuery, executeTransaction } = require('../config/database');

// ==================== LISTAR PRODUCTOS ====================
const getAllProducts = async (req, res) => {
  try {
    console.log('📦 Obteniendo todos los productos...');
    
    const products = await executeQuery(
      `SELECT 
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        p.Descripcion,
        p.PrecioBase,
        p.Activo,
        c.NombreCategoria,
        pr.NombreProveedor
      FROM productos p
      LEFT JOIN categorias c ON p.CategoriaID = c.CategoriaID
      LEFT JOIN proveedores pr ON p.ProveedorID = pr.ProveedorID
      WHERE p.Activo = 1
      ORDER BY p.NombreProducto`
    );

    // Obtener stock para cada producto
    for (let product of products) {
      const stock = await executeQuery(
        `SELECT 
           COALESCE(SUM(StockActual), 0) AS StockTotal,
           COUNT(*) AS TotalVariantes
         FROM productovariantes
         WHERE ProductoID = ? AND Activo = 1`,
        [product.ProductoID]
      );

      product.StockTotal = stock[0].StockTotal;
      product.TotalVariantes = stock[0].TotalVariantes;
    }

    console.log(`✅ Se obtuvieron ${products.length} productos`);

    res.json({ success: true, data: products });

  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PRODUCTO POR ID ====================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Obteniendo producto ID: ${id}`);

    const product = await executeQuery(
      `SELECT 
        p.*,
        c.NombreCategoria,
        pr.NombreProveedor
      FROM productos p
      LEFT JOIN categorias c ON p.CategoriaID = c.CategoriaID
      LEFT JOIN proveedores pr ON p.ProveedorID = pr.ProveedorID
      WHERE p.ProductoID = ?`,
      [id]
    );

    if (!product || product.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const variantes = await executeQuery(
      `SELECT 
        VarianteID,
        CodigoVariante,
        Talla,
        Color,
        Estilo,
        PrecioVenta,
        StockActual,
        StockMinimo,
        Activo
      FROM productovariantes
      WHERE ProductoID = ?
      ORDER BY Color, Talla`,
      [id]
    );

    console.log(`✅ Producto encontrado: ${product[0].NombreProducto}`);

    res.json({
      success: true,
      data: { ...product[0], variantes }
    });

  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== BUSCAR ====================
const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    console.log(`🔍 Buscando productos: "${q}"`);
    
    const term = `%${q}%`;

    const products = await executeQuery(
      `SELECT 
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        p.PrecioBase,
        c.NombreCategoria,
        v.VarianteID,
        v.CodigoVariante,
        v.Color,
        v.Talla,
        v.StockActual,
        v.PrecioVenta
      FROM productos p
      LEFT JOIN categorias c ON p.CategoriaID = c.CategoriaID
      LEFT JOIN productovariantes v ON p.ProductoID = v.ProductoID
      WHERE p.Activo = 1 AND (
          p.NombreProducto LIKE ?
          OR p.CodigoProducto LIKE ?
          OR v.CodigoVariante LIKE ?
      )
      ORDER BY p.NombreProducto`,
      [term, term, term]
    );

    console.log(`✅ Se encontraron ${products.length} resultados`);

    res.json({ success: true, data: products });

  } catch (error) {
    console.error('❌ Error al buscar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CREAR PRODUCTO ====================
const createProduct = async (req, res) => {
  try {
    const {
      CodigoProducto,
      NombreProducto,
      Descripcion,
      CategoriaID,
      ProveedorID,
      PrecioBase,
      variantes = []
    } = req.body;

    console.log('📝 Creando producto:', { CodigoProducto, NombreProducto });

    // Validaciones
    if (!CodigoProducto || !NombreProducto || !CategoriaID || !PrecioBase) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campos obligatorios faltantes: CodigoProducto, NombreProducto, CategoriaID, PrecioBase' 
      });
    }

    if (!variantes.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe agregar al menos una variante' 
      });
    }

    const ProductoID = await executeTransaction(async (connection) => {
      // Verificar código duplicado
      const [exist] = await connection.query(
        'SELECT ProductoID FROM productos WHERE CodigoProducto = ?',
        [CodigoProducto]
      );

      if (exist.length) {
        throw new Error('El código de producto ya existe');
      }

      // Insertar producto
      const [prod] = await connection.query(
        `INSERT INTO productos 
        (CodigoProducto, NombreProducto, Descripcion, CategoriaID, ProveedorID, PrecioBase, Activo)
        VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [CodigoProducto, NombreProducto, Descripcion, CategoriaID, ProveedorID, PrecioBase]
      );

      const id = prod.insertId;
      console.log(`✅ Producto creado con ID: ${id}`);

      // Insertar variantes
      for (const v of variantes) {
        // Generar CodigoVariante si no viene
        const codigoVariante = v.CodigoVariante || 
          `${CodigoProducto}-${(v.Color || 'S/C').substring(0, 3).toUpperCase()}-${v.Talla || 'U'}`;

        await connection.query(
          `INSERT INTO productovariantes
          (ProductoID, CodigoVariante, Talla, Color, Estilo, PrecioVenta, StockActual, StockMinimo, Activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            id,
            codigoVariante,
            v.Talla || null,
            v.Color || null,
            v.Estilo || null,
            v.PrecioVenta || PrecioBase, // Si no hay precio de venta, usar precio base
            v.StockActual || 0,
            v.StockMinimo || 0
          ]
        );
      }

      console.log(`✅ ${variantes.length} variantes creadas`);

      return id;
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado correctamente',
      ProductoID
    });

  } catch (error) {
    console.error('❌ Error crear producto:', error);
    
    if (error.message === 'El código de producto ya existe') {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ACTUALIZAR ====================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    console.log(`📝 Actualizando producto ID: ${id}`);

    await executeTransaction(async (connection) => {
      // Actualizar producto
      await connection.query(
        `UPDATE productos SET
          CodigoProducto = ?,
          NombreProducto = ?,
          Descripcion = ?,
          CategoriaID = ?,
          ProveedorID = ?,
          PrecioBase = ?,
          Activo = ?
        WHERE ProductoID = ?`,
        [
          data.CodigoProducto,
          data.NombreProducto,
          data.Descripcion,
          data.CategoriaID,
          data.ProveedorID,
          data.PrecioBase,
          data.Activo !== undefined ? data.Activo : 1,
          id
        ]
      );

      console.log('✅ Información básica actualizada');

      // Actualizar variantes
      if (data.variantes && data.variantes.length > 0) {
        // Eliminar variantes existentes
        await connection.query(
          'DELETE FROM productovariantes WHERE ProductoID = ?', 
          [id]
        );

        // Insertar variantes nuevas/actualizadas
        for (const v of data.variantes) {
          // Generar CodigoVariante si no viene
          const codigoVariante = v.CodigoVariante || 
            `${data.CodigoProducto}-${(v.Color || 'S/C').substring(0, 3).toUpperCase()}-${v.Talla || 'U'}`;

          await connection.query(
            `INSERT INTO productovariantes
            (ProductoID, CodigoVariante, Talla, Color, Estilo, PrecioVenta, StockActual, StockMinimo, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              codigoVariante,
              v.Talla || null,
              v.Color || null,
              v.Estilo || null,
              v.PrecioVenta || data.PrecioBase, // Si no hay precio de venta, usar precio base
              v.StockActual || 0,
              v.StockMinimo || 0,
              v.Activo !== undefined ? v.Activo : 1
            ]
          );
        }

        console.log(`✅ ${data.variantes.length} variantes actualizadas`);
      }
    });

    res.json({ success: true, message: 'Producto actualizado correctamente' });

  } catch (error) {
    console.error('❌ Error actualizar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ELIMINAR (SOFT DELETE) ====================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.body;

    console.log(`🗑️ Eliminando producto ID: ${id} (Hard delete: ${hardDelete})`);

    // Verificar si tiene ventas asociadas
    const sales = await executeQuery(
      `SELECT COUNT(*) as total 
       FROM detalleventas dv
       JOIN productovariantes v ON dv.VarianteID = v.VarianteID
       WHERE v.ProductoID = ?`,
      [id]
    );

    const hasSales = sales[0].total > 0;

    if (hasSales && hardDelete) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar permanentemente un producto con ventas asociadas'
      });
    }

    if (hardDelete && !hasSales) {
      // Hard delete
      await executeTransaction(async (connection) => {
        await connection.query('DELETE FROM productovariantes WHERE ProductoID = ?', [id]);
        await connection.query('DELETE FROM productos WHERE ProductoID = ?', [id]);
      });

      console.log('✅ Producto eliminado permanentemente');
      res.json({ success: true, message: 'Producto eliminado permanentemente' });
    } else {
      // Soft delete
      await executeQuery(
        'UPDATE productos SET Activo = 0 WHERE ProductoID = ?',
        [id]
      );

      console.log('✅ Producto desactivado');
      res.json({ success: true, message: 'Producto desactivado correctamente' });
    }

  } catch (error) {
    console.error('❌ Error eliminar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CATEGORÍAS ====================
const getCategories = async (req, res) => {
  try {
    console.log('📂 Obteniendo categorías...');
    
    const data = await executeQuery(
      'SELECT CategoriaID, NombreCategoria FROM categorias WHERE Activo = 1 ORDER BY NombreCategoria'
    );
    
    console.log(`✅ Se obtuvieron ${data.length} categorías`);
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PROVEEDORES ====================
const getSuppliers = async (req, res) => {
  try {
    console.log('🏭 Obteniendo proveedores...');
    
    const data = await executeQuery(
      'SELECT ProveedorID, NombreProveedor FROM proveedores WHERE Activo = 1 ORDER BY NombreProveedor'
    );
    
    console.log(`✅ Se obtuvieron ${data.length} proveedores`);
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error al obtener proveedores:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getSuppliers
};
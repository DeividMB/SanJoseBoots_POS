// src/controllers/sale.controller.js
const { executeProcedure, executeQuery } = require('../config/database');

// Crear venta
exports.createSale = async (req, res) => {
  try {
    const {
      numeroTicket,
      subtotal,
      descuento,
      iva,
      total,
      metodoPago,
      observaciones,
      detalles
    } = req.body;

    const usuarioId = req.user.usuarioId;

    console.log('📦 Registrando venta:', {
      numeroTicket,
      usuarioId,
      total,
      metodoPago,
      cantidadProductos: detalles.length
    });

    // Validar que vengan detalles
    if (!detalles || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron productos para la venta'
      });
    }

    // ✅ TRANSFORMAR campos de minúscula a PascalCase
    const detallesTransformados = detalles.map(detalle => ({
      VarianteID: detalle.varianteId || detalle.VarianteID,
      Cantidad: detalle.cantidad || detalle.Cantidad,
      PrecioUnitario: detalle.precioUnitario || detalle.PrecioUnitario,
      Descuento: detalle.descuento || detalle.Descuento || 0
    }));

    console.log('🔄 Detalles transformados:', JSON.stringify(detallesTransformados));

    // Convertir detalles a JSON
    const detallesJSON = JSON.stringify(detallesTransformados);

    // Ejecutar procedimiento
    const result = await executeProcedure('sp_RegistrarVenta', [
      numeroTicket,
      usuarioId,
      subtotal,
      descuento || 0,
      iva,
      total,
      metodoPago,
      observaciones || null,
      detallesJSON
    ]);

    console.log('✅ Resultado procedimiento completo:', JSON.stringify(result, null, 2));

    // ✅ CORRECCIÓN: El procedimiento puede retornar en diferentes formatos
    // Necesitamos manejar: result[0][0] o result[0] dependiendo de cómo venga
    
    let ventaData;
    
    if (Array.isArray(result) && result.length > 0) {
      // Si result[0] es un array, tomar el primer elemento
      if (Array.isArray(result[0]) && result[0].length > 0) {
        ventaData = result[0][0];
      } 
      // Si result[0] es un objeto directamente
      else if (typeof result[0] === 'object') {
        ventaData = result[0];
      }
    }

    console.log('📦 Datos de venta extraídos:', ventaData);
    
    // Verificar si hubo error
    if (!ventaData) {
      console.error('❌ No se pudo extraer datos de venta del resultado');
      return res.status(500).json({
        success: false,
        message: 'Error al procesar respuesta del servidor'
      });
    }

    if (ventaData.Estado === 'ERROR' || ventaData.VentaID === 0) {
      console.error('❌ Error reportado por procedimiento:', ventaData.Mensaje);
      
      // Verificar si es error de stock
      if (ventaData.Mensaje && ventaData.Mensaje.includes('Stock insuficiente')) {
        return res.status(400).json({
          success: false,
          message: ventaData.Mensaje
        });
      }
      
      return res.status(500).json({
        success: false,
        message: ventaData.Mensaje || 'Error al registrar venta'
      });
    }

    console.log('✅ Venta registrada exitosamente:', {
      ventaId: ventaData.VentaID,
      numeroTicket: ventaData.NumeroTicket
    });

    res.status(201).json({
      success: true,
      message: ventaData.Mensaje || 'Venta registrada exitosamente',
      data: {
        ventaId: ventaData.VentaID,
        numeroTicket: ventaData.NumeroTicket
      }
    });
  } catch (error) {
    console.error('❌ Error creando venta:', error);
    
    // Manejar errores específicos de stock
    if (error.message && error.message.includes('Stock insuficiente')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar venta',
      error: error.message
    });
  }
};

// Obtener venta por ID
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const queryVenta = `
      SELECT 
        v.*,
        u.NombreCompleto as NombreUsuario
      FROM ventas v
      LEFT JOIN usuarios u ON v.UsuarioID = u.UsuarioID
      WHERE v.VentaID = ?
    `;

    const queryDetalles = `
      SELECT 
        dv.*,
        p.NombreProducto,
        pv.Color,
        pv.Talla,
        pv.CodigoVariante
      FROM detalleventas dv
      INNER JOIN productovariantes pv ON dv.VarianteID = pv.VarianteID
      INNER JOIN productos p ON pv.ProductoID = p.ProductoID
      WHERE dv.VentaID = ?
    `;

    const [venta] = await executeQuery(queryVenta, [id]);
    const detalles = await executeQuery(queryDetalles, [id]);

    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        ...venta,
        detalles: detalles || []
      }
    });
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener venta',
      error: error.message
    });
  }
};

// Obtener ventas por período
exports.getSalesByPeriod = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuarioId, estado } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    let query = `
      SELECT 
        v.VentaID,
        v.NumeroTicket,
        v.FechaVenta,
        v.Subtotal,
        v.Descuento,
        v.IVA,
        v.Total,
        v.MetodoPago,
        v.Estado,
        u.NombreCompleto as NombreUsuario
      FROM ventas v
      LEFT JOIN usuarios u ON v.UsuarioID = u.UsuarioID
      WHERE DATE(v.FechaVenta) BETWEEN ? AND ?
    `;

    const params = [fechaInicio, fechaFin];

    if (usuarioId) {
      query += ' AND v.UsuarioID = ?';
      params.push(usuarioId);
    }

    if (estado) {
      query += ' AND v.Estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY v.FechaVenta DESC';

    const ventas = await executeQuery(query, params);

    res.json({
      success: true,
      data: ventas || []
    });
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas',
      error: error.message
    });
  }
};

// Cancelar venta
exports.cancelSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user.usuarioId;

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de cancelación requerido'
      });
    }

    const [venta] = await executeQuery(
      'SELECT * FROM ventas WHERE VentaID = ?',
      [id]
    );

    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    if (venta.Estado === 'CANCELADA') {
      return res.status(400).json({
        success: false,
        message: 'La venta ya está cancelada'
      });
    }

    await executeQuery(
      `UPDATE ventas 
       SET Estado = 'CANCELADA', 
           Observaciones = CONCAT(IFNULL(Observaciones, ''), ' | CANCELADA: ', ?)
       WHERE VentaID = ?`,
      [motivo, id]
    );

    res.json({
      success: true,
      message: 'Venta cancelada exitosamente'
    });
  } catch (error) {
    console.error('Error cancelando venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar venta',
      error: error.message
    });
  }
};

// Obtener resumen del día
exports.getDailySummary = async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha requerida'
      });
    }

    const [resumen] = await executeQuery(
      `SELECT 
        COUNT(*) as TotalVentas,
        COALESCE(SUM(Total), 0) as TotalIngresos,
        COALESCE(AVG(Total), 0) as TicketPromedio
       FROM ventas
       WHERE DATE(FechaVenta) = ? AND Estado = 'COMPLETADA'`,
      [fecha]
    );

    const ventasPorHora = await executeQuery(
      `SELECT 
        HOUR(FechaVenta) as Hora,
        COUNT(*) as CantidadVentas,
        SUM(Total) as TotalVentas
       FROM ventas
       WHERE DATE(FechaVenta) = ? AND Estado = 'COMPLETADA'
       GROUP BY HOUR(FechaVenta)
       ORDER BY Hora`,
      [fecha]
    );

    const topVendedores = await executeQuery(
      `SELECT 
        u.NombreCompleto,
        COUNT(*) as CantidadVentas,
        SUM(v.Total) as TotalVendido
       FROM ventas v
       LEFT JOIN usuarios u ON v.UsuarioID = u.UsuarioID
       WHERE DATE(v.FechaVenta) = ? AND v.Estado = 'COMPLETADA'
       GROUP BY v.UsuarioID
       ORDER BY TotalVendido DESC
       LIMIT 5`,
      [fecha]
    );

    res.json({
      success: true,
      data: {
        resumenGeneral: resumen || {},
        ventasPorHora: ventasPorHora || [],
        topVendedores: topVendedores || []
      }
    });
  } catch (error) {
    console.error('Error obteniendo resumen diario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen diario',
      error: error.message
    });
  }
};
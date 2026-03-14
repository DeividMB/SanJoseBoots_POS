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
      detalles,
      cajaID
    } = req.body;

    const usuarioId = req.user.usuarioId;

    if (!cajaID) {
      return res.status(400).json({
        success: false,
        message: '❌ No hay caja abierta. Debes abrir la caja antes de realizar ventas.'
      });
    }

    if (!detalles || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron productos para la venta'
      });
    }

    console.log('📦 Registrando venta:', {
      numeroTicket, usuarioId, total, metodoPago,
      cajaID, cantidadProductos: detalles.length
    });

    const detallesTransformados = detalles.map(detalle => ({
      VarianteID:     detalle.varianteId     || detalle.VarianteID,
      Cantidad:       detalle.cantidad       || detalle.Cantidad,
      PrecioUnitario: detalle.precioUnitario || detalle.PrecioUnitario,
      Descuento:      detalle.descuento      || detalle.Descuento || 0
    }));

    const detallesJSON = JSON.stringify(detallesTransformados);

    // El SP ahora recibe cajaID como último parámetro
    const result = await executeProcedure('sp_RegistrarVenta', [
      numeroTicket,
      usuarioId,
      subtotal,
      descuento || 0,
      iva,
      total,
      metodoPago,
      observaciones || null,
      detallesJSON,
      cajaID        // ✅ nuevo parámetro — el SP lo guarda y actualiza la caja
    ]);

    console.log('✅ Resultado SP:', JSON.stringify(result, null, 2));

    let ventaData;
    if (Array.isArray(result) && result.length > 0) {
      ventaData = Array.isArray(result[0]) ? result[0][0] : result[0];
    }

    if (!ventaData) {
      return res.status(500).json({ success: false, message: 'Error al procesar respuesta del servidor' });
    }

    if (ventaData.Estado === 'ERROR' || ventaData.VentaID === 0) {
      const msg = ventaData.Mensaje || 'Error al registrar venta';
      return res.status(ventaData.Mensaje?.includes('Stock') ? 400 : 500).json({
        success: false, message: msg
      });
    }

    console.log('✅ Venta registrada:', { ventaId: ventaData.VentaID, numeroTicket: ventaData.NumeroTicket });

    res.status(201).json({
      success: true,
      message: ventaData.Mensaje || 'Venta registrada exitosamente',
      data: {
        ventaId:      ventaData.VentaID,
        numeroTicket: ventaData.NumeroTicket
      }
    });

  } catch (error) {
    console.error('❌ Error creando venta:', error);
    if (error.message?.includes('Stock insuficiente')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Error al registrar venta', error: error.message });
  }
};

// Obtener venta por ID
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const [venta]  = await executeQuery(
      `SELECT v.*, u.NombreCompleto as NombreUsuario
       FROM ventas v LEFT JOIN usuarios u ON v.UsuarioID = u.UsuarioID
       WHERE v.VentaID = ?`, [id]
    );
    const detalles = await executeQuery(
      `SELECT dv.*, p.NombreProducto, pv.Color, pv.Talla, pv.CodigoVariante
       FROM detalleventas dv
       INNER JOIN productovariantes pv ON dv.VarianteID = pv.VarianteID
       INNER JOIN productos p ON pv.ProductoID = p.ProductoID
       WHERE dv.VentaID = ?`, [id]
    );
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    res.json({ success: true, data: { ...venta, detalles: detalles || [] } });
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    res.status(500).json({ success: false, message: 'Error al obtener venta', error: error.message });
  }
};

// Obtener ventas por período
exports.getSalesByPeriod = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuarioId, estado } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, message: 'Fechas de inicio y fin requeridas' });
    }
    let query = `
      SELECT v.VentaID, v.NumeroTicket, v.FechaVenta,
             v.Subtotal, v.Descuento, v.IVA, v.Total, v.MetodoPago, v.Estado,
             u.NombreCompleto as NombreUsuario
      FROM ventas v LEFT JOIN usuarios u ON v.UsuarioID = u.UsuarioID
      WHERE DATE(v.FechaVenta) BETWEEN ? AND ?
    `;
    const params = [fechaInicio, fechaFin];
    if (usuarioId) { query += ' AND v.UsuarioID = ?'; params.push(usuarioId); }
    if (estado)    { query += ' AND v.Estado = ?';    params.push(estado); }
    query += ' ORDER BY v.FechaVenta DESC';
    const ventas = await executeQuery(query, params);
    res.json({ success: true, data: ventas || [] });
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ventas', error: error.message });
  }
};

// Cancelar venta
exports.cancelSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    if (!motivo) return res.status(400).json({ success: false, message: 'Motivo de cancelación requerido' });
    const [venta] = await executeQuery('SELECT * FROM ventas WHERE VentaID = ?', [id]);
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    if (venta.Estado === 'CANCELADA') return res.status(400).json({ success: false, message: 'La venta ya está cancelada' });
    await executeQuery(
      `UPDATE ventas SET Estado = 'CANCELADA',
       Observaciones = CONCAT(IFNULL(Observaciones, ''), ' | CANCELADA: ', ?)
       WHERE VentaID = ?`, [motivo, id]
    );
    res.json({ success: true, message: 'Venta cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando venta:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar venta', error: error.message });
  }
};

// Obtener resumen del día
exports.getDailySummary = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ success: false, message: 'Fecha requerida' });
    const [resumen] = await executeQuery(
      `SELECT COUNT(*) as TotalVentas,
              COALESCE(SUM(Total), 0) as TotalIngresos,
              COALESCE(AVG(Total), 0) as TicketPromedio
       FROM ventas WHERE DATE(FechaVenta) = ? AND Estado = 'COMPLETADA'`, [fecha]
    );
    const ventasPorHora = await executeQuery(
      `SELECT HOUR(FechaVenta) as Hora, COUNT(*) as CantidadVentas, SUM(Total) as TotalVentas
       FROM ventas WHERE DATE(FechaVenta) = ? AND Estado = 'COMPLETADA'
       GROUP BY HOUR(FechaVenta) ORDER BY Hora`, [fecha]
    );
    const topVendedores = await executeQuery(
      `SELECT u.NombreCompleto, COUNT(*) as CantidadVentas, SUM(v.Total) as TotalVendido
       FROM ventas v LEFT JOIN usuarios u ON v.UsuarioID = u.UsuarioID
       WHERE DATE(v.FechaVenta) = ? AND v.Estado = 'COMPLETADA'
       GROUP BY v.UsuarioID ORDER BY TotalVendido DESC LIMIT 5`, [fecha]
    );
    res.json({
      success: true,
      data: { resumenGeneral: resumen || {}, ventasPorHora: ventasPorHora || [], topVendedores: topVendedores || [] }
    });
  } catch (error) {
    console.error('Error obteniendo resumen diario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen diario', error: error.message });
  }
};
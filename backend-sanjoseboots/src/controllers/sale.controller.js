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

    // Convertir detalles a JSON
    const detallesJSON = JSON.stringify(detalles);

    // Ejecutar procedimiento SIN parámetro OUT
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

    // El procedimiento retorna VentaID y NumeroTicket en el SELECT final
    const ventaData = result[0];
    
    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: {
        ventaId: ventaData.VentaID,
        numeroTicket: ventaData.NumeroTicket
      }
    });
  } catch (error) {
    console.error('Error creando venta:', error);
    
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({
        success: false,
        message: 'Stock insuficiente para completar la venta'
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

    const [venta, detalles] = await executeProcedure('sp_ObtenerDetalleVenta', [
      parseInt(id)
    ]);

    if (!venta || venta.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        venta: venta[0],
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

    const ventas = await executeProcedure('sp_ObtenerVentasPorPeriodo', [
      fechaInicio,
      fechaFin,
      usuarioId || null,
      estado || null
    ]);

    res.json({
      success: true,
      data: ventas
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

    const result = await executeProcedure('sp_CancelarVenta', [
      parseInt(id),
      usuarioId,
      motivo
    ]);

    res.json({
      success: true,
      message: 'Venta cancelada exitosamente',
      data: result[0]
    });
  } catch (error) {
    console.error('Error cancelando venta:', error);
    
    if (error.message.includes('ya está cancelada')) {
      return res.status(400).json({
        success: false,
        message: 'La venta ya está cancelada'
      });
    }

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

    const [resumenGeneral, ventasPorHora, topVendedores] = await executeProcedure(
      'sp_ResumenVentasDia',
      [fecha]
    );

    res.json({
      success: true,
      data: {
        resumenGeneral: resumenGeneral[0],
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
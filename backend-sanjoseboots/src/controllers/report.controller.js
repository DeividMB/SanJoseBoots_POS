// src/controllers/report.controller.js
const { executeProcedure } = require('../config/database');

// Dashboard con KPIs
exports.getDashboard = async (req, res) => {
  try {
    // Obtener KPIs principales
    const kpisResult = await executeProcedure('sp_DashboardKPIs', []);
    
    // ✅ CORRECCIÓN: El resultado ya es un array con el objeto
    // kpisResult = [{ TotalVentasHoy: '2784.00', ... }]
    const data = kpisResult[0] || {};
    
    console.log('📊 Resultado completo de sp_DashboardKPIs:', kpisResult);
    console.log('📊 KPIs extraídos:', data);
    
    // Obtener top productos vendidos
    let topProductos = [];
    try {
      const topProductosResult = await executeProcedure('sp_TopProductosVendidos', []);
      console.log('📦 Resultado completo de sp_TopProductosVendidos:', topProductosResult);
      
      // ✅ El resultado ya es el array de productos
      topProductos = Array.isArray(topProductosResult) ? topProductosResult : [];
      
      console.log('📦 Top productos extraídos:', topProductos);
    } catch (error) {
      console.error('❌ Error obteniendo top productos:', error);
      topProductos = [];
    }
    
    // Convertir valores string a números
    const parseValue = (val) => {
      if (val === null || val === undefined) return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    const parseInt = (val) => {
      if (val === null || val === undefined) return 0;
      const parsed = Number(val);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    // Estructurar la respuesta
    const response = {
      success: true,
      data: {
        kpisHoy: {
          TotalVentasHoy: parseValue(data.TotalVentasHoy),
          NumeroVentasHoy: parseInt(data.NumeroVentasHoy),
          TicketPromedioHoy: parseValue(data.TicketPromedioHoy),
          ProductosVendidosHoy: parseInt(data.ProductosVendidosHoy)
        },
        kpisMes: {
          TotalVentasMes: parseValue(data.TotalVentasMes),
          NumeroVentasMes: parseInt(data.NumeroVentasMes),
          TicketPromedioMes: parseValue(data.TicketPromedioMes),
          ProductosVendidosMes: parseInt(data.ProductosVendidosMes)
        },
        stockBajo: {
          ProductosStockBajo: parseInt(data.ProductosStockBajo)
        },
        valorInventario: {
          ValorTotalInventario: parseValue(data.ValorTotalInventario),
          TotalProductos: parseInt(data.TotalProductos),
          TotalVariantes: parseInt(data.TotalVariantes),
          StockTotal: parseInt(data.StockTotal)
        },
        topProductos: topProductos.map(p => ({
          NombreProducto: p.NombreProducto,
          TotalVendido: parseInt(p.TotalVendido),
          TotalIngresos: parseValue(p.TotalIngresos)
        }))
      }
    };
    
    console.log('✅ Respuesta final enviada:', response);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error obteniendo dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dashboard',
      error: error.message
    });
  }
};

// Productos más vendidos (con filtro de fechas)
exports.getTopProducts = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, top } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    const productos = await executeProcedure('sp_ReporteProductosMasVendidos', [
      fechaInicio,
      fechaFin,
      parseInt(top) || 10
    ]);

    res.json({
      success: true,
      data: productos
    });
  } catch (error) {
    console.error('Error obteniendo productos más vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos más vendidos',
      error: error.message
    });
  }
};

// Ventas por categoría
exports.getSalesByCategory = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    const categorias = await executeProcedure('sp_ReporteVentasPorCategoria', [
      fechaInicio,
      fechaFin
    ]);

    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('Error obteniendo ventas por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas por categoría',
      error: error.message
    });
  }
};

// Ventas diarias
exports.getDailySales = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    const ventas = await executeProcedure('sp_ReporteVentasDiarias', [
      fechaInicio,
      fechaFin
    ]);

    res.json({
      success: true,
      data: ventas
    });
  } catch (error) {
    console.error('Error obteniendo ventas diarias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas diarias',
      error: error.message
    });
  }
};

// Inventario valorizado
exports.getInventoryReport = async (req, res) => {
  try {
    const [detalle, resumen] = await executeProcedure('sp_ReporteInventarioValorizado', []);

    res.json({
      success: true,
      data: {
        detalle: detalle || [],
        resumen: resumen || []
      }
    });
  } catch (error) {
    console.error('Error obteniendo reporte de inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reporte de inventario',
      error: error.message
    });
  }
};

// Rendimiento de vendedores
exports.getSellersPerformance = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    const vendedores = await executeProcedure('sp_ReporteRendimientoVendedores', [
      fechaInicio,
      fechaFin
    ]);

    res.json({
      success: true,
      data: vendedores
    });
  } catch (error) {
    console.error('Error obteniendo rendimiento de vendedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener rendimiento de vendedores',
      error: error.message
    });
  }
};

// Métodos de pago
exports.getPaymentMethods = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin requeridas'
      });
    }

    const metodos = await executeProcedure('sp_ReporteMetodosPago', [
      fechaInicio,
      fechaFin
    ]);

    res.json({
      success: true,
      data: metodos
    });
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métodos de pago',
      error: error.message
    });
  }
};
// src/controllers/report.controller.js
const { executeProcedure } = require('../config/database');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toFloat = (val) => (val == null ? 0 : parseFloat(val)   || 0);
const toInt   = (val) => (val == null ? 0 : parseInt(val, 10) || 0);

// Convierte "2026-02-01" → "2026-02-01 00:00:00" / "2026-02-28 23:59:59"
const toDateTimeStart = (date) => `${date} 00:00:00`;
const toDateTimeEnd   = (date) => `${date} 23:59:59`;

// Valida que vengan ambas fechas y responde 400 si faltan
const requireDates = (fechaInicio, fechaFin, res) => {
  if (!fechaInicio || !fechaFin) {
    res.status(400).json({
      success: false,
      message: 'fechaInicio y fechaFin son requeridas (formato YYYY-MM-DD)',
    });
    return false;
  }
  return true;
};

// ─── 1. Dashboard KPIs ───────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const kpisResult = await executeProcedure('sp_DashboardKPIs', []);
    const data       = kpisResult[0] || {};
    console.log('📊 KPIs:', data);

    let topProductos = [];
    try {
      const topResult = await executeProcedure('sp_TopProductosVendidos', []);
      topProductos = Array.isArray(topResult) ? topResult : [];
    } catch (err) {
      console.error('❌ Error top productos:', err.message);
    }

    res.json({
      success: true,
      data: {
        kpisHoy: {
          TotalVentasHoy:       toFloat(data.TotalVentasHoy),
          NumeroVentasHoy:      toInt(data.NumeroVentasHoy),
          TicketPromedioHoy:    toFloat(data.TicketPromedioHoy),
          ProductosVendidosHoy: toInt(data.ProductosVendidosHoy),
        },
        kpisMes: {
          TotalVentasMes:       toFloat(data.TotalVentasMes),
          NumeroVentasMes:      toInt(data.NumeroVentasMes),
          TicketPromedioMes:    toFloat(data.TicketPromedioMes),
          ProductosVendidosMes: toInt(data.ProductosVendidosMes),
        },
        stockBajo: {
          ProductosStockBajo: toInt(data.ProductosStockBajo),
        },
        valorInventario: {
          ValorTotalInventario: toFloat(data.ValorTotalInventario),
          TotalProductos:       toInt(data.TotalProductos),
          TotalVariantes:       toInt(data.TotalVariantes),
          StockTotal:           toInt(data.StockTotal),
        },
        topProductos: topProductos.map(p => ({
          NombreProducto: p.NombreProducto,
          TotalVendido:   toInt(p.TotalVendido),
          TotalIngresos:  toFloat(p.TotalIngresos),
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error dashboard:', error);
    res.status(500).json({ success: false, message: 'Error al obtener dashboard', error: error.message });
  }
};

// ─── 2. Top productos más vendidos ───────────────────────────────────────────
// SP: sp_ReporteProductosMasVendidos(p_FechaInicio DATETIME, p_FechaFin DATETIME, p_Top INT)
// Columnas retornadas: ProductoID, NombreProducto, NombreCategoria, CodigoVariante,
//                      Talla, Color, CantidadVendida, TotalVentas, StockActual
exports.getTopProducts = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, top = 10 } = req.query;
    if (!requireDates(fechaInicio, fechaFin, res)) return;

    console.log(`🔍 Top productos: ${fechaInicio} → ${fechaFin}, top=${top}`);

    const productos = await executeProcedure('sp_ReporteProductosMasVendidos', [
      toDateTimeStart(fechaInicio),
      toDateTimeEnd(fechaFin),
      toInt(top) || 10,
    ]);

    res.json({ success: true, data: productos });
  } catch (error) {
    console.error('❌ Error top productos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener top productos', error: error.message });
  }
};

// ─── 3. Ventas por categoría ─────────────────────────────────────────────────
// SP: sp_ReporteVentasPorCategoria(p_FechaInicio DATETIME, p_FechaFin DATETIME)
// Columnas retornadas: CategoriaID, NombreCategoria, TotalVentas, UnidadesVendidas,
//                      TotalIngresos, PrecioPromedio
exports.getSalesByCategory = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!requireDates(fechaInicio, fechaFin, res)) return;

    console.log(`🔍 Ventas por categoría: ${fechaInicio} → ${fechaFin}`);

    const categorias = await executeProcedure('sp_ReporteVentasPorCategoria', [
      toDateTimeStart(fechaInicio),
      toDateTimeEnd(fechaFin),
    ]);

    res.json({ success: true, data: categorias });
  } catch (error) {
    console.error('❌ Error ventas por categoría:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ventas por categoría', error: error.message });
  }
};

// ─── 4. Ventas diarias ───────────────────────────────────────────────────────
// SP: sp_ReporteVentasDiarias(p_FechaInicio DATE, p_FechaFin DATE) ← recibe DATE, no DATETIME
// Columnas retornadas: Fecha, TotalVentas, TotalIngresos, TicketPromedio,
//                      VentasCompletadas, VentasCanceladas, TotalArticulosVendidos
exports.getDailySales = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!requireDates(fechaInicio, fechaFin, res)) return;

    console.log(`🔍 Ventas diarias: ${fechaInicio} → ${fechaFin}`);

    // Este SP usa DATE directamente (WHERE DATE(FechaVenta) >= p_FechaInicio)
    const ventas = await executeProcedure('sp_ReporteVentasDiarias', [fechaInicio, fechaFin]);

    res.json({ success: true, data: ventas });
  } catch (error) {
    console.error('❌ Error ventas diarias:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ventas diarias', error: error.message });
  }
};

// ─── 5. Inventario valorizado ────────────────────────────────────────────────
// SP: sp_ReporteInventarioValorizado()  — sin parámetros
// Retorna 2 result sets:
//   [0] Detalle por variante: NombreCategoria, NombreProducto, CodigoProducto,
//       CodigoVariante, Talla, Color, Estilo, StockActual, StockMinimo,
//       PrecioVenta, ValorInventario, NivelStock  (BAJO / MEDIO / NORMAL)
//   [1] Resumen por categoría: NombreCategoria, TotalProductos, TotalVariantes,
//       TotalUnidades, ValorTotal
exports.getInventoryReport = async (req, res) => {
  try {
    console.log('📦 Obteniendo inventario valorizado...');

    const result = await executeProcedure('sp_ReporteInventarioValorizado', []);

    // executeProcedure: si hay múltiples result sets retorna [[...rs1], [...rs2]]
    // Si solo hay uno retorna [...rs1] directamente
    let detalle = [];
    let resumen = [];

    if (Array.isArray(result[0])) {
      // Múltiples result sets
      detalle = result[0] || [];
      resumen = result[1] || [];
    } else {
      // Solo el detalle
      detalle = result || [];
    }

    console.log(`✅ Inventario: ${detalle.length} variantes, ${resumen.length} categorías en resumen`);

    res.json({
      success: true,
      data: { detalle, resumen },
    });
  } catch (error) {
    console.error('❌ Error inventario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener inventario', error: error.message });
  }
};

// ─── 6. Rendimiento de vendedores ────────────────────────────────────────────
// SP: sp_ReporteRendimientoVendedores(p_FechaInicio DATETIME, p_FechaFin DATETIME)
// Columnas retornadas: UsuarioID, NombreCompleto, NombreRol, TotalVentas,
//                      VentasCompletadas, VentasCanceladas, TotalIngresos,
//                      TicketPromedio, TotalArticulosVendidos
exports.getSellersPerformance = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!requireDates(fechaInicio, fechaFin, res)) return;

    console.log(`🔍 Rendimiento vendedores: ${fechaInicio} → ${fechaFin}`);

    const vendedores = await executeProcedure('sp_ReporteRendimientoVendedores', [
      toDateTimeStart(fechaInicio),
      toDateTimeEnd(fechaFin),
    ]);

    res.json({ success: true, data: vendedores });
  } catch (error) {
    console.error('❌ Error rendimiento vendedores:', error);
    res.status(500).json({ success: false, message: 'Error al obtener rendimiento de vendedores', error: error.message });
  }
};

// ─── 7. Métodos de pago ──────────────────────────────────────────────────────
// SP: sp_ReporteMetodosPago(p_FechaInicio DATETIME, p_FechaFin DATETIME)
// Columnas retornadas: MetodoPago, TotalVentas, TotalIngresos, TicketPromedio,
//                      PorcentajeVentas
exports.getPaymentMethods = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!requireDates(fechaInicio, fechaFin, res)) return;

    console.log(`🔍 Métodos de pago: ${fechaInicio} → ${fechaFin}`);

    const metodos = await executeProcedure('sp_ReporteMetodosPago', [
      toDateTimeStart(fechaInicio),
      toDateTimeEnd(fechaFin),
    ]);

    res.json({ success: true, data: metodos });
  } catch (error) {
    console.error('❌ Error métodos de pago:', error);
    res.status(500).json({ success: false, message: 'Error al obtener métodos de pago', error: error.message });
  }
};
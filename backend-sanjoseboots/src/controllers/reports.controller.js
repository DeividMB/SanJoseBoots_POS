// ============================================
// NUEVO CONTROLADOR DE REPORTES
// Este es NUEVO - no reemplazar report.controller.js existente
// Guardar como: reports.controller.js (con S)
// backend/src/controllers/reports.controller.js
// ============================================

const { executeProcedure } = require('../config/database');
const ExcelJS = require('exceljs');

// 1. REPORTE DE VENTAS DETALLADO
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, userId, paymentMethod, status } = req.query;

    console.log('📊 Generando reporte de ventas:', { startDate, endDate, userId, paymentMethod, status });

    const result = await executeProcedure('sp_ReporteVentasDetallado', [
      startDate || null,
      endDate || null,
      userId || null,
      paymentMethod || null,
      status || null
    ]);

    const ventas = result[0];
    console.log(`✅ ${ventas.length} ventas encontradas`);

    res.json({ success: true, data: ventas });

  } catch (error) {
    console.error('❌ Error al generar reporte de ventas:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de ventas' });
  }
};

// 2. DETALLE DE VENTA ESPECÍFICA
const getSaleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo detalle de venta ID: ${id}`);

    const result = await executeProcedure('sp_DetalleVenta', [id]);
    const venta = result[0][0];
    const detalles = result[1];

    if (!venta) {
      return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    }

    console.log(`✅ Detalle obtenido: ${detalles.length} productos`);
    res.json({ success: true, data: { venta, detalles } });

  } catch (error) {
    console.error('❌ Error al obtener detalle de venta:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el detalle de la venta' });
  }
};

// 3. RESUMEN DE VENTAS
const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('📈 Generando resumen de ventas:', { startDate, endDate });

    const result = await executeProcedure('sp_ResumenVentas', [
      startDate || null,
      endDate || null
    ]);

    const resumen = result[0][0];
    console.log('✅ Resumen generado');

    res.json({ success: true, data: resumen });

  } catch (error) {
    console.error('❌ Error al generar resumen:', error);
    res.status(500).json({ success: false, message: 'Error al generar el resumen de ventas' });
  }
};

// 4. REPORTE DE INVENTARIO
const getInventoryReport = async (req, res) => {
  try {
    const { categoryId, supplierId, lowStockOnly } = req.query;
    console.log('📦 Generando reporte de inventario:', { categoryId, supplierId, lowStockOnly });

    const result = await executeProcedure('sp_ReporteInventario', [
      categoryId || null,
      supplierId || null,
      lowStockOnly === 'true' ? 1 : 0
    ]);

    const inventario = result[0];
    console.log(`✅ ${inventario.length} variantes en inventario`);

    res.json({ success: true, data: inventario });

  } catch (error) {
    console.error('❌ Error al generar reporte de inventario:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de inventario' });
  }
};

// 5. TOP PRODUCTOS MÁS VENDIDOS
const getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate, categoryId, limit = 10 } = req.query;
    console.log('🏆 Generando top productos:', { startDate, endDate, categoryId, limit });

    const result = await executeProcedure('sp_TopProductosVendidos', [
      startDate || null,
      endDate || null,
      categoryId || null,
      parseInt(limit)
    ]);

    const topProductos = result[0];
    console.log(`✅ Top ${topProductos.length} productos`);

    res.json({ success: true, data: topProductos });

  } catch (error) {
    console.error('❌ Error al generar top productos:', error);
    res.status(500).json({ success: false, message: 'Error al generar el top de productos' });
  }
};

// 6. VENTAS POR PERÍODO
const getSalesByPeriod = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'DIARIO' } = req.query;
    console.log('📅 Generando ventas por período:', { startDate, endDate, groupBy });

    const result = await executeProcedure('sp_VentasPorPeriodo', [
      startDate || null,
      endDate || null,
      groupBy
    ]);

    const ventas = result[0];
    console.log(`✅ ${ventas.length} períodos encontrados`);

    res.json({ success: true, data: ventas });

  } catch (error) {
    console.error('❌ Error al generar ventas por período:', error);
    res.status(500).json({ success: false, message: 'Error al generar las ventas por período' });
  }
};

// 7. EXPORTAR VENTAS A EXCEL
const exportSalesToExcel = async (req, res) => {
  try {
    const { startDate, endDate, userId, paymentMethod, status } = req.query;
    console.log('📥 Exportando reporte de ventas a Excel...');

    const result = await executeProcedure('sp_ReporteVentasDetallado', [
      startDate || null,
      endDate || null,
      userId || null,
      paymentMethod || null,
      status || null
    ]);

    const ventas = result[0];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Ventas');

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    worksheet.columns = [
      { header: 'No. Ticket', key: 'NumeroTicket', width: 15 },
      { header: 'Fecha', key: 'FechaVenta', width: 20 },
      { header: 'Vendedor', key: 'Vendedor', width: 25 },
      { header: 'Subtotal', key: 'Subtotal', width: 15 },
      { header: 'Descuento', key: 'Descuento', width: 12 },
      { header: 'IVA', key: 'IVA', width: 12 },
      { header: 'Total', key: 'Total', width: 15 },
      { header: 'Método Pago', key: 'MetodoPago', width: 15 },
      { header: 'Estado', key: 'Estado', width: 12 },
      { header: 'Artículos', key: 'TotalArticulos', width: 12 }
    ];

    worksheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });
    worksheet.getRow(1).height = 25;

    ventas.forEach(venta => {
      worksheet.addRow({
        NumeroTicket: venta.NumeroTicket,
        FechaVenta: new Date(venta.FechaVenta).toLocaleString('es-MX'),
        Vendedor: venta.Vendedor,
        Subtotal: venta.Subtotal,
        Descuento: venta.Descuento,
        IVA: venta.IVA,
        Total: venta.Total,
        MetodoPago: venta.MetodoPago,
        Estado: venta.Estado,
        TotalArticulos: venta.TotalArticulos
      });
    });

    worksheet.getColumn('Subtotal').numFmt = '$#,##0.00';
    worksheet.getColumn('Descuento').numFmt = '$#,##0.00';
    worksheet.getColumn('IVA').numFmt = '$#,##0.00';
    worksheet.getColumn('Total').numFmt = '$#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_ventas.xlsx');
    res.send(buffer);

    console.log('✅ Excel generado exitosamente');

  } catch (error) {
    console.error('❌ Error al exportar a Excel:', error);
    res.status(500).json({ success: false, message: 'Error al exportar el reporte a Excel' });
  }
};

// 8. EXPORTAR INVENTARIO A EXCEL
const exportInventoryToExcel = async (req, res) => {
  try {
    const { categoryId, supplierId, lowStockOnly } = req.query;
    console.log('📥 Exportando inventario a Excel...');

    const result = await executeProcedure('sp_ReporteInventario', [
      categoryId || null,
      supplierId || null,
      lowStockOnly === 'true' ? 1 : 0
    ]);

    const inventario = result[0];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    worksheet.columns = [
      { header: 'Código', key: 'CodigoProducto', width: 15 },
      { header: 'Producto', key: 'NombreProducto', width: 30 },
      { header: 'Categoría', key: 'Categoria', width: 20 },
      { header: 'SKU', key: 'CodigoVariante', width: 20 },
      { header: 'Color', key: 'Color', width: 15 },
      { header: 'Talla', key: 'Talla', width: 10 },
      { header: 'Precio', key: 'PrecioVenta', width: 12 },
      { header: 'Stock', key: 'StockActual', width: 10 },
      { header: 'Stock Mín', key: 'StockMinimo', width: 12 },
      { header: 'Valor', key: 'ValorStock', width: 15 },
      { header: 'Estado', key: 'EstadoStock', width: 15 }
    ];

    worksheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });
    worksheet.getRow(1).height = 25;

    inventario.forEach(item => {
      const row = worksheet.addRow({
        CodigoProducto: item.CodigoProducto,
        NombreProducto: item.NombreProducto,
        Categoria: item.Categoria,
        CodigoVariante: item.CodigoVariante,
        Color: item.Color,
        Talla: item.Talla,
        PrecioVenta: item.PrecioVenta,
        StockActual: item.StockActual,
        StockMinimo: item.StockMinimo,
        ValorStock: item.ValorStock,
        EstadoStock: item.EstadoStock
      });

      if (item.EstadoStock === 'Sin Stock') {
        row.getCell('EstadoStock').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        row.getCell('EstadoStock').font = { color: { argb: 'FFFFFFFF' } };
      } else if (item.EstadoStock === 'Stock Bajo') {
        row.getCell('EstadoStock').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };
      }
    });

    worksheet.getColumn('PrecioVenta').numFmt = '$#,##0.00';
    worksheet.getColumn('ValorStock').numFmt = '$#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_inventario.xlsx');
    res.send(buffer);

    console.log('✅ Inventario exportado exitosamente');

  } catch (error) {
    console.error('❌ Error al exportar inventario:', error);
    res.status(500).json({ success: false, message: 'Error al exportar el inventario' });
  }
};

module.exports = {
  getSalesReport,
  getSaleDetail,
  getSalesSummary,
  getInventoryReport,
  getTopProducts,
  getSalesByPeriod,
  exportSalesToExcel,
  exportInventoryToExcel
};
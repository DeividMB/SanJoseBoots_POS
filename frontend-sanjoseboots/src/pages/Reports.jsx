// frontend/src/pages/Reports.jsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Package, Users, CreditCard,
  Download, FileText, RefreshCw, Calendar,
  ShoppingBag, DollarSign, BarChart2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);

const fmtNum = (val) =>
  new Intl.NumberFormat('es-MX').format(val || 0);

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

// Colores consistentes con el tema de la app
const COLORS = ['#8B6914', '#C4A35A', '#2D2D2D', '#6B7280', '#A78B3C', '#4B5563'];

// ─── Componentes reutilizables ────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
    <div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-16">
    <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
    <span className="ml-2 text-sm text-gray-500">Cargando datos...</span>
  </div>
);

const EmptyState = ({ message = 'No hay datos disponibles' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <BarChart2 className="w-10 h-10 mb-2 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

const DateFilter = ({ fechaInicio, fechaFin, onFechaInicioChange, onFechaFinChange, onApply, loading }) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">Fecha inicio</label>
      <input
        type="date"
        value={fechaInicio}
        onChange={e => onFechaInicioChange(e.target.value)}
        className="h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
      />
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">Fecha fin</label>
      <input
        type="date"
        value={fechaFin}
        onChange={e => onFechaFinChange(e.target.value)}
        className="h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
      />
    </div>
    <button
      onClick={onApply}
      disabled={loading}
      className="h-10 px-4 flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
    >
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
      Aplicar
    </button>
  </div>
);

const ExportButtons = ({ onExcel, onPDF, disabled }) => (
  <div className="flex gap-2">
    <button
      onClick={onExcel}
      disabled={disabled}
      className="h-9 px-3 flex items-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
    >
      <Download className="w-3.5 h-3.5" />
      Excel
    </button>
    <button
      onClick={onPDF}
      disabled={disabled}
      className="h-9 px-3 flex items-center gap-1.5 border border-red-500 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
    >
      <FileText className="w-3.5 h-3.5" />
      PDF
    </button>
  </div>
);

// ─── Tooltip personalizado para gráficas ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency = false }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="mt-0.5">
          {entry.name}: {currency ? fmt(entry.value) : fmtNum(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — VENTAS
// ═══════════════════════════════════════════════════════════════════════════════
const TabVentas = () => {
  const [fechaInicio, setFechaInicio] = useState(daysAgo(30));
  const [fechaFin, setFechaFin] = useState(today());
  const [loading, setLoading] = useState(false);
  const [dailySales, setDailySales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      const [daily, top, cats] = await Promise.all([
        api.get(`/reports/daily-sales${params}`),
        api.get(`/reports/top-products${params}&top=10`),
        api.get(`/reports/by-category${params}`),
      ]);
      setDailySales(daily.data.data || []);
      setTopProducts(top.data.data || []);
      setCategories(cats.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar reporte de ventas');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { fetchData(); }, []);

  // Totales del período
  const totalIngresos = dailySales.reduce((s, d) => s + parseFloat(d.TotalIngresos || 0), 0);
  const totalVentas   = dailySales.reduce((s, d) => s + parseInt(d.VentasCompletadas || 0), 0);
  const ticketProm    = totalVentas > 0 ? totalIngresos / totalVentas : 0;

  // Exportar Excel
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Ventas diarias
    const wsDaily = XLSX.utils.json_to_sheet(
      dailySales.map(d => ({
        Fecha: d.Fecha,
        'Ventas Completadas': d.VentasCompletadas,
        'Ventas Canceladas': d.VentasCanceladas,
        'Total Ingresos': parseFloat(d.TotalIngresos || 0),
        'Ticket Promedio': parseFloat(d.TicketPromedio || 0),
        'Artículos Vendidos': d.TotalArticulosVendidos,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Ventas Diarias');

    // Hoja 2: Top productos
    const wsTop = XLSX.utils.json_to_sheet(
      topProducts.map(p => ({
        Producto: p.NombreProducto,
        Categoría: p.NombreCategoria,
        Variante: p.CodigoVariante,
        Talla: p.Talla,
        Color: p.Color,
        'Cantidad Vendida': p.CantidadVendida,
        'Total Ventas': parseFloat(p.TotalVentas || 0),
        'Stock Actual': p.StockActual,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top Productos');

    // Hoja 3: Por categoría
    const wsCats = XLSX.utils.json_to_sheet(
      categories.map(c => ({
        Categoría: c.NombreCategoria,
        'Total Ventas': c.TotalVentas,
        'Unidades Vendidas': c.UnidadesVendidas,
        'Total Ingresos': parseFloat(c.TotalIngresos || 0),
        'Precio Promedio': parseFloat(c.PrecioPromedio || 0),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsCats, 'Por Categoría');

    XLSX.writeFile(wb, `reporte-ventas-${fechaInicio}-${fechaFin}.xlsx`);
    toast.success('Excel exportado');
  };

  // Exportar PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Ventas - San José Boots', 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['Fecha', 'Ventas', 'Ingresos', 'Ticket Prom.', 'Artículos']],
      body: dailySales.map(d => [
        d.Fecha,
        d.VentasCompletadas,
        fmt(d.TotalIngresos),
        fmt(d.TicketPromedio),
        d.TotalArticulosVendidos,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 105, 20] },
    });

    doc.save(`reporte-ventas-${fechaInicio}-${fechaFin}.pdf`);
    toast.success('PDF exportado');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-end justify-between gap-4">
          <DateFilter
            fechaInicio={fechaInicio} fechaFin={fechaFin}
            onFechaInicioChange={setFechaInicio}
            onFechaFinChange={setFechaFin}
            onApply={fetchData} loading={loading}
          />
          <ExportButtons onExcel={exportExcel} onPDF={exportPDF} disabled={loading || !dailySales.length} />
        </div>
      </Card>

      {/* KPIs del período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Ingresos', value: fmt(totalIngresos), icon: DollarSign, color: 'text-amber-700' },
          { label: 'Total Ventas', value: fmtNum(totalVentas), icon: ShoppingBag, color: 'text-gray-700' },
          { label: 'Ticket Promedio', value: fmt(ticketProm), icon: TrendingUp, color: 'text-green-700' },
        ].map((k, i) => (
          <Card key={i} className="px-5 py-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg bg-gray-50 ${k.color}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-xl font-bold text-gray-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Gráfica de ventas diarias */}
      <Card>
        <CardHeader title="Evolución de Ventas Diarias" subtitle={`${fechaInicio} al ${fechaFin}`} />
        <div className="p-6">
          {loading ? <LoadingSpinner /> : dailySales.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="Fecha" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone" dataKey="TotalIngresos" name="Ingresos"
                  stroke="#8B6914" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone" dataKey="VentasCompletadas" name="N° Ventas"
                  stroke="#6B7280" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2"
                  yAxisId={0}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Top productos + Ventas por categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        <Card>
          <CardHeader title="Top 10 Productos Más Vendidos" />
          <div className="p-4">
            {loading ? <LoadingSpinner /> : topProducts.length === 0 ? <EmptyState /> : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.NombreProducto}</p>
                      <p className="text-xs text-gray-400">{p.Color} · Talla {p.Talla} · {p.NombreCategoria}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-700">{fmt(p.TotalVentas)}</p>
                      <p className="text-xs text-gray-400">{fmtNum(p.CantidadVendida)} uds.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Ventas por categoría */}
        <Card>
          <CardHeader title="Ventas por Categoría" />
          <div className="p-4">
            {loading ? <LoadingSpinner /> : categories.filter(c => parseFloat(c.TotalIngresos) > 0).length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={categories.filter(c => parseFloat(c.TotalIngresos) > 0)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="NombreCategoria" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip currency />} />
                  <Bar dataKey="TotalIngresos" name="Ingresos" fill="#8B6914" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════
const TabInventario = () => {
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('TODOS');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/inventory');
      setDetalle(res.data.data.detalle || []);
      setResumen(res.data.data.resumen || []);
    } catch (err) {
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const detalleFiltered = detalle.filter(d => {
    const matchText = filtro === '' ||
      d.NombreProducto?.toLowerCase().includes(filtro.toLowerCase()) ||
      d.CodigoProducto?.toLowerCase().includes(filtro.toLowerCase()) ||
      d.NombreCategoria?.toLowerCase().includes(filtro.toLowerCase());
    const matchNivel = nivelFiltro === 'TODOS' || d.NivelStock === nivelFiltro;
    return matchText && matchNivel;
  });

  const totalValor = detalle.reduce((s, d) => s + parseFloat(d.ValorInventario || 0), 0);
  const sinStock   = detalle.filter(d => d.StockActual === 0).length;
  const stockBajo  = detalle.filter(d => d.NivelStock === 'BAJO' && d.StockActual > 0).length;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      detalleFiltered.map(d => ({
        Categoría: d.NombreCategoria,
        Producto: d.NombreProducto,
        Código: d.CodigoProducto,
        Variante: d.CodigoVariante,
        Talla: d.Talla,
        Color: d.Color,
        Estilo: d.Estilo,
        'Stock Actual': d.StockActual,
        'Stock Mínimo': d.StockMinimo,
        'Precio Venta': parseFloat(d.PrecioVenta || 0),
        'Valor Inventario': parseFloat(d.ValorInventario || 0),
        'Nivel Stock': d.NivelStock,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    if (resumen.length) {
      const wsRes = XLSX.utils.json_to_sheet(
        resumen.map(r => ({
          Categoría: r.NombreCategoria,
          Productos: r.TotalProductos,
          Variantes: r.TotalVariantes,
          Unidades: r.TotalUnidades,
          'Valor Total': parseFloat(r.ValorTotal || 0),
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen por Categoría');
    }

    XLSX.writeFile(wb, `inventario-${today()}.xlsx`);
    toast.success('Excel exportado');
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Reporte de Inventario - San José Boots', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generado: ${today()} | Total: ${fmt(totalValor)}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['Categoría', 'Producto', 'Variante', 'Talla', 'Color', 'Stock', 'Mín.', 'Precio', 'Valor', 'Nivel']],
      body: detalleFiltered.map(d => [
        d.NombreCategoria,
        d.NombreProducto,
        d.CodigoVariante,
        d.Talla || '-',
        d.Color || '-',
        d.StockActual,
        d.StockMinimo,
        fmt(d.PrecioVenta),
        fmt(d.ValorInventario),
        d.NivelStock,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [139, 105, 20] },
      didParseCell: (data) => {
        if (data.column.index === 9) {
          const nivel = data.cell.raw;
          if (nivel === 'BAJO') data.cell.styles.textColor = [220, 38, 38];
          else if (nivel === 'MEDIO') data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });

    doc.save(`inventario-${today()}.pdf`);
    toast.success('PDF exportado');
  };

  const nivelBadge = (nivel) => {
    const map = {
      NORMAL: 'bg-green-100 text-green-700',
      MEDIO:  'bg-yellow-100 text-yellow-700',
      BAJO:   'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[nivel] || 'bg-gray-100 text-gray-600'}`}>
        {nivel}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPIs inventario */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Valor Total Inventario', value: fmt(totalValor), icon: DollarSign, color: 'text-amber-700' },
          { label: 'Total Variantes', value: fmtNum(detalle.length), icon: Package, color: 'text-gray-700' },
          { label: 'Stock Bajo', value: fmtNum(stockBajo), icon: AlertTriangle, color: 'text-yellow-600' },
          { label: 'Sin Stock', value: fmtNum(sinStock), icon: AlertTriangle, color: 'text-red-600' },
        ].map((k, i) => (
          <Card key={i} className="px-5 py-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg bg-gray-50 ${k.color}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-xl font-bold text-gray-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Gráfica resumen por categoría */}
      {resumen.length > 0 && (
        <Card>
          <CardHeader title="Valor de Inventario por Categoría" />
          <div className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={resumen.filter(r => parseFloat(r.ValorTotal) > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="NombreCategoria" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency />} />
                <Bar dataKey="ValorTotal" name="Valor" fill="#C4A35A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Tabla detalle */}
      <Card>
        <CardHeader
          title="Detalle de Inventario"
          subtitle={`${detalleFiltered.length} variantes`}
          action={<ExportButtons onExcel={exportExcel} onPDF={exportPDF} disabled={loading || !detalle.length} />}
        />
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar producto, código o categoría..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-64 bg-white"
          />
          <select
            value={nivelFiltro}
            onChange={e => setNivelFiltro(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="NORMAL">Normal</option>
            <option value="MEDIO">Medio</option>
            <option value="BAJO">Bajo</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Variante</th>
                  <th className="px-4 py-3 text-center">Talla</th>
                  <th className="px-4 py-3 text-center">Color</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Mín.</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detalleFiltered.length === 0 ? (
                  <tr><td colSpan={10}><EmptyState message="Sin resultados para el filtro aplicado" /></td></tr>
                ) : detalleFiltered.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.NombreCategoria}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{d.NombreProducto}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{d.CodigoVariante}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{d.Talla || '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{d.Color || '-'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">{d.StockActual}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{d.StockMinimo}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(d.PrecioVenta)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(d.ValorInventario)}</td>
                    <td className="px-4 py-3 text-center">{nivelBadge(d.NivelStock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — VENDEDORES
// ═══════════════════════════════════════════════════════════════════════════════
const TabVendedores = () => {
  const [fechaInicio, setFechaInicio] = useState(daysAgo(30));
  const [fechaFin, setFechaFin] = useState(today());
  const [loading, setLoading] = useState(false);
  const [vendedores, setVendedores] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/sellers?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      setVendedores(res.data.data || []);
    } catch (err) {
      toast.error('Error al cargar rendimiento de vendedores');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { fetchData(); }, []);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      vendedores.map(v => ({
        Vendedor: v.NombreCompleto,
        Rol: v.NombreRol,
        'Total Ventas': v.TotalVentas,
        'Ventas Completadas': v.VentasCompletadas,
        'Ventas Canceladas': v.VentasCanceladas,
        'Total Ingresos': parseFloat(v.TotalIngresos || 0),
        'Ticket Promedio': parseFloat(v.TicketPromedio || 0),
        'Artículos Vendidos': v.TotalArticulosVendidos,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Vendedores');
    XLSX.writeFile(wb, `vendedores-${fechaInicio}-${fechaFin}.xlsx`);
    toast.success('Excel exportado');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Rendimiento de Vendedores - San José Boots', 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [['Vendedor', 'Rol', 'Ventas', 'Ingresos', 'Ticket Prom.', 'Artículos']],
      body: vendedores.map(v => [
        v.NombreCompleto,
        v.NombreRol,
        v.VentasCompletadas,
        fmt(v.TotalIngresos),
        fmt(v.TicketPromedio),
        v.TotalArticulosVendidos,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 105, 20] },
    });
    doc.save(`vendedores-${fechaInicio}-${fechaFin}.pdf`);
    toast.success('PDF exportado');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-end justify-between gap-4">
          <DateFilter
            fechaInicio={fechaInicio} fechaFin={fechaFin}
            onFechaInicioChange={setFechaInicio}
            onFechaFinChange={setFechaFin}
            onApply={fetchData} loading={loading}
          />
          <ExportButtons onExcel={exportExcel} onPDF={exportPDF} disabled={loading || !vendedores.length} />
        </div>
      </Card>

      {/* Gráfica de barras */}
      {vendedores.filter(v => parseFloat(v.TotalIngresos) > 0).length > 0 && (
        <Card>
          <CardHeader title="Ingresos por Vendedor" />
          <div className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={vendedores.filter(v => parseFloat(v.TotalIngresos) > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="NombreCompleto" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency />} />
                <Bar dataKey="TotalIngresos" name="Ingresos" fill="#8B6914" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader title="Detalle por Vendedor" subtitle={`${vendedores.length} vendedores`} />
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : vendedores.length === 0 ? <EmptyState message="Sin ventas en este período" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Vendedor</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-center">Ventas</th>
                  <th className="px-4 py-3 text-center">Completadas</th>
                  <th className="px-4 py-3 text-center">Canceladas</th>
                  <th className="px-4 py-3 text-right">Total Ingresos</th>
                  <th className="px-4 py-3 text-right">Ticket Prom.</th>
                  <th className="px-4 py-3 text-center">Artículos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendedores.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{v.NombreCompleto}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                        {v.NombreRol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{v.TotalVentas}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{v.VentasCompletadas}</td>
                    <td className="px-4 py-3 text-center text-red-500">{v.VentasCanceladas}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(v.TotalIngresos)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(v.TicketPromedio)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{v.TotalArticulosVendidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — MÉTODOS DE PAGO
// ═══════════════════════════════════════════════════════════════════════════════
const TabMetodosPago = () => {
  const [fechaInicio, setFechaInicio] = useState(daysAgo(30));
  const [fechaFin, setFechaFin] = useState(today());
  const [loading, setLoading] = useState(false);
  const [metodos, setMetodos] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/payment-methods?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      setMetodos(res.data.data || []);
    } catch (err) {
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { fetchData(); }, []);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      metodos.map(m => ({
        'Método de Pago': m.MetodoPago,
        'N° Ventas': m.TotalVentas,
        'Total Ingresos': parseFloat(m.TotalIngresos || 0),
        'Ticket Promedio': parseFloat(m.TicketPromedio || 0),
        '% del Total': parseFloat(m.PorcentajeVentas || 0),
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Métodos de Pago');
    XLSX.writeFile(wb, `metodos-pago-${fechaInicio}-${fechaFin}.xlsx`);
    toast.success('Excel exportado');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Métodos de Pago - San José Boots', 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [['Método', 'N° Ventas', 'Total Ingresos', 'Ticket Prom.', '% Total']],
      body: metodos.map(m => [
        m.MetodoPago,
        m.TotalVentas,
        fmt(m.TotalIngresos),
        fmt(m.TicketPromedio),
        `${m.PorcentajeVentas}%`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 105, 20] },
    });
    doc.save(`metodos-pago-${fechaInicio}-${fechaFin}.pdf`);
    toast.success('PDF exportado');
  };

  const totalIngresos = metodos.reduce((s, m) => s + parseFloat(m.TotalIngresos || 0), 0);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-end justify-between gap-4">
          <DateFilter
            fechaInicio={fechaInicio} fechaFin={fechaFin}
            onFechaInicioChange={setFechaInicio}
            onFechaFinChange={setFechaFin}
            onApply={fetchData} loading={loading}
          />
          <ExportButtons onExcel={exportExcel} onPDF={exportPDF} disabled={loading || !metodos.length} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de pastel */}
        <Card>
          <CardHeader title="Distribución por Método de Pago" subtitle="% sobre total de ventas" />
          <div className="p-6">
            {loading ? <LoadingSpinner /> : metodos.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={metodos}
                    dataKey="TotalIngresos"
                    nameKey="MetodoPago"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ MetodoPago, PorcentajeVentas }) => `${MetodoPago} ${PorcentajeVentas}%`}
                    labelLine={true}
                  >
                    {metodos.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => fmt(val)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Tabla + KPIs */}
        <Card>
          <CardHeader title="Detalle por Método" />
          <div className="p-4">
            {loading ? <LoadingSpinner /> : metodos.length === 0 ? <EmptyState /> : (
              <div className="space-y-3">
                {metodos.map((m, i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-semibold text-gray-800">{m.MetodoPago}</span>
                      </div>
                      <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                        {m.PorcentajeVentas}% del total
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(m.TotalIngresos)}</p>
                        <p className="text-xs text-gray-400">Ingresos</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-800">{fmtNum(m.TotalVentas)}</p>
                        <p className="text-xs text-gray-400">Ventas</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-800">{fmt(m.TicketPromedio)}</p>
                        <p className="text-xs text-gray-400">Ticket prom.</p>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${totalIngresos > 0 ? (parseFloat(m.TotalIngresos) / totalIngresos * 100) : 0}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — Reports.jsx
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'ventas',    label: 'Ventas',           icon: TrendingUp,  component: TabVentas },
  { id: 'inventario',label: 'Inventario',        icon: Package,     component: TabInventario },
  { id: 'vendedores',label: 'Vendedores',        icon: Users,       component: TabVendedores },
  { id: 'pagos',     label: 'Métodos de Pago',   icon: CreditCard,  component: TabMetodosPago },
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('ventas');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || TabVentas;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis y estadísticas del negocio</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido del tab activo */}
        <ActiveComponent />
      </div>
    </Layout>
  );
};

export default Reports;
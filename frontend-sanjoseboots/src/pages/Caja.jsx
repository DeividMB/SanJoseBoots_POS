// src/pages/Caja.jsx — VERSIÓN COMPLETA FASE 6
// Cambios vs anterior:
//  - Autorefresh al abrir caja (sin recargar página)
//  - "Monto Inicial" → "Fondo Inicial", "Ventas Efectivo" → "Efectivo"
//  - Botón "Movimiento" (entrada/salida/devolución/ajuste)
//  - Botón "Corte" (resumen sin cerrar, imprimible/PDF)
//  - Historial de cortes con botón exportar PDF y Excel

import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import {
  Lock, Unlock, RefreshCw, DollarSign, CreditCard,
  ArrowRightLeft, TrendingUp, Plus, FileText,
  ChevronDown, ChevronUp, Calendar, Printer, Sheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useCajaStore    from '../store/cajaStore';
import useAuthStore    from '../store/authStore';
import { cajaAPI }     from '../api/endpoints';
import { formatCurrency } from '../utils/formatters';
import AperturaCajaModal  from '../components/caja/AperturaCajaModal';
import CierreCajaModal    from '../components/caja/CierreCajaModal';
import MovimientoCajaModal from '../components/caja/MovimientoCajaModal';
import CorteModal          from '../components/caja/CorteModal';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function timeSince(d) {
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 1)  return 'Recién abierta';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return `${h}h ${m}m`;
}

export default function CajaPage() {
  const { cajaActual, setCajaActual, clearCaja } = useCajaStore();
  const { user } = useAuthStore();

  const [ventas,           setVentas]           = useState([]);
  const [historial,        setHistorial]         = useState([]);
  const [historialOpen,    setHistorialOpen]     = useState(false);
  const [historialFechaDesde, setHistorialFechaDesde] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)
  );
  const [historialFechaHasta, setHistorialFechaHasta] = useState(
    new Date().toISOString().slice(0,10)
  );
  const [loadingVentas,    setLoadingVentas]     = useState(false);
  const [loadingHistorial, setLoadingHistorial]  = useState(false);
  const [ticker,           setTicker]            = useState(0);  // fuerza re-render de tiempo
  const [showMovimiento,   setShowMovimiento]    = useState(false);
  const [showCorte,        setShowCorte]         = useState(false);
  const [showCierre,       setShowCierre]        = useState(false);
  const [showApertura,     setShowApertura]      = useState(false);

  // Actualizar tiempo transcurrido cada minuto
  useEffect(() => {
    const id = setInterval(() => setTicker(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Cargar caja actual al montar
  const fetchCajaActual = useCallback(async () => {
    try {
      const res = await cajaAPI.obtenerActual();
      if (res.data?.success) {
        if (res.data.data) setCajaActual(res.data.data);
        else clearCaja();
      }
    } catch (_) {}
  }, [setCajaActual, clearCaja]);

  useEffect(() => { fetchCajaActual(); }, [fetchCajaActual]);

  // Cargar ventas cuando hay caja
  const fetchVentas = useCallback(async () => {
    if (!cajaActual?.CajaID) return;
    setLoadingVentas(true);
    try {
      const res = await cajaAPI.obtenerVentas(cajaActual.CajaID);
      if (res.data?.success) setVentas(res.data.data ?? []);
    } catch (_) {}
    finally { setLoadingVentas(false); }
  }, [cajaActual?.CajaID]);

  useEffect(() => { fetchVentas(); }, [fetchVentas]);

  // Cargar historial
  const fetchHistorial = useCallback(async (desde, hasta) => {
    setLoadingHistorial(true);
    try {
      const res = await cajaAPI.historial({ desde, hasta });
      if (res.data?.success) setHistorial(res.data.data ?? []);
    } catch (_) {}
    finally { setLoadingHistorial(false); }
  }, []);

  useEffect(() => {
    if (historialOpen) fetchHistorial(historialFechaDesde, historialFechaHasta);
  }, [historialOpen, fetchHistorial]);

  // ── Callback al abrir caja: refresca sin recargar página ──
  const handleAperturaSuccess = useCallback(async () => {
    setShowApertura(false);
    await fetchCajaActual();
    // Pequeño delay para asegurar que el estado del store se propagó
    setTimeout(() => fetchVentas(), 300);
  }, [fetchCajaActual, fetchVentas]);

  // ── Callback al cerrar caja ───────────────────────────────
  const handleCierreSuccess = useCallback(() => {
    setShowCierre(false);
    clearCaja();
    setVentas([]);
    fetchHistorial();
    toast.success('Caja cerrada correctamente');
  }, [clearCaja, fetchHistorial]);

  // ── Exportar historial PDF ────────────────────────────────
  const exportarHistorialPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Historial de Cortes — San José Boots', 14, 18);
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 25);
      doc.setTextColor(0);
      autoTable(doc, {
        startY: 30,
        head: [['Cajero', 'Apertura', 'Cierre', 'Fondo Inicial', 'Total Ventas', 'Monto Final', 'Diferencia', 'Estado']],
        body: historial.map(c => [
          c.NombreUsuario, fmtDate(c.FechaHoraApertura), fmtDate(c.FechaHoraCierre),
          formatCurrency(c.MontoInicial), formatCurrency(c.TotalVentas),
          formatCurrency(c.MontoFinalReal), formatCurrency(c.Diferencia), c.Estado
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [17, 24, 39] },
      });
      doc.save(`Historial_Cortes_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (_) { toast.error('Instala jspdf y jspdf-autotable para exportar PDF'); }
  };

  // ── Exportar historial Excel ──────────────────────────────
  const exportarHistorialExcel = () => {
    const header = ['Cajero','Apertura','Cierre','Fondo Inicial','Total Ventas','Efectivo','Tarjeta','Transferencia','Monto Final','Diferencia','# Ventas','Estado'];
    const rows = historial.map(c => [
      c.NombreUsuario, fmtDate(c.FechaHoraApertura), fmtDate(c.FechaHoraCierre),
      c.MontoInicial, c.TotalVentas, c.TotalVentasEfectivo,
      c.TotalVentasTarjeta, c.TotalVentasTransferencia,
      c.MontoFinalReal, c.Diferencia, c.NumeroVentas, c.Estado
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Historial_Cortes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV descargado (ábrelo con Excel)');
  };

  const metodoBadge = (m) => {
    if (m === 'Efectivo')      return 'bg-green-100 text-green-700';
    if (m === 'Tarjeta')       return 'bg-blue-100 text-blue-700';
    if (m === 'Transferencia') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  // ─────────────────────────────────────────────────────────
  // RENDER: CAJA CERRADA
  // ─────────────────────────────────────────────────────────
  if (!cajaActual) return (
    <Layout><div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Caja</h1>

      {/* Tarjeta caja cerrada */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          Para realizar ventas debes abrir una caja. Registra el monto inicial en efectivo con el que comienzas el turno.
        </p>
        <button onClick={() => setShowApertura(true)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700
                           text-white font-semibold px-6 py-3 rounded-xl transition">
          <Unlock className="h-5 w-5" /> Abrir Caja
        </button>
      </div>

      {/* Historial */}
      <HistorialSection
        historialOpen={historialOpen} setHistorialOpen={setHistorialOpen}
        historial={historial} loadingHistorial={loadingHistorial}
        historialFechaDesde={historialFechaDesde} setHistorialFechaDesde={setHistorialFechaDesde}
        historialFechaHasta={historialFechaHasta} setHistorialFechaHasta={setHistorialFechaHasta}
        fetchHistorial={fetchHistorial}
        exportarPDF={exportarHistorialPDF} exportarExcel={exportarHistorialExcel}
        fmtDate={fmtDate}
      />

      {showApertura && <AperturaCajaModal onSuccess={handleAperturaSuccess} />}
    </div></Layout>
  );

  // ─────────────────────────────────────────────────────────
  // RENDER: CAJA ABIERTA
  // ─────────────────────────────────────────────────────────
  const efectivoVentas = parseFloat(cajaActual.TotalVentasEfectivo ?? 0);
  const tarjetaTrans   = parseFloat(cajaActual.TotalVentasTarjeta ?? 0) + parseFloat(cajaActual.TotalVentasTransferencia ?? 0);
  const totalVentas    = parseFloat(cajaActual.TotalVentas ?? 0);
  const fondoInicial   = parseFloat(cajaActual.MontoInicial ?? 0);
  const deberiaHaber   = fondoInicial + efectivoVentas;

  return (
    <Layout><div className="p-6">
      {/* ── Encabezado con botones ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja en Curso</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Abierta desde las {new Date(cajaActual.FechaHoraApertura).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
            &nbsp;({timeSince(cajaActual.FechaHoraApertura)})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Actualizar ventas */}
          <button onClick={fetchVentas} title="Actualizar"
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <RefreshCw className="h-5 w-5" />
          </button>
          {/* Movimiento extra */}
          <button onClick={() => setShowMovimiento(true)}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700
                             hover:bg-gray-50 font-medium px-3 py-2 rounded-xl transition text-sm">
            <Plus className="h-4 w-4" /> Movimiento
          </button>
          {/* Corte sin cerrar */}
          <button onClick={() => setShowCorte(true)}
                  className="flex items-center gap-1.5 border border-blue-300 text-blue-700
                             hover:bg-blue-50 font-medium px-3 py-2 rounded-xl transition text-sm">
            <FileText className="h-4 w-4" /> Corte
          </button>
          {/* Cerrar caja */}
          <button onClick={() => setShowCierre(true)}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700
                             text-white font-semibold px-4 py-2 rounded-xl transition">
            <Lock className="h-4 w-4" /> Cerrar Caja
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: DollarSign,    label: 'Fondo Inicial',   value: formatCurrency(fondoInicial),   color: 'text-gray-700' },
          { icon: DollarSign,    label: 'Efectivo',         value: formatCurrency(efectivoVentas), color: 'text-green-700' },
          { icon: CreditCard,    label: 'Tarjeta / Trans.', value: formatCurrency(tarjetaTrans),   color: 'text-blue-700'  },
          { icon: TrendingUp,    label: 'Total Ventas',     value: formatCurrency(totalVentas),    color: 'text-gray-900'  },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <Icon className="h-5 w-5 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Arqueo en tiempo real ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Arqueo en tiempo real</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Inicial:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(fondoInicial)}</span>
          <span className="text-gray-400">+</span>
          <span className="text-gray-500">Efectivo:</span>
          <span className="font-semibold text-green-700">{formatCurrency(efectivoVentas)}</span>
          <span className="text-gray-400">=</span>
          <span className="text-gray-500">Debería haber:</span>
          <span className="font-bold text-gray-900 text-base">{formatCurrency(deberiaHaber)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Número de transacciones: {cajaActual.NumeroVentas ?? 0}
          &nbsp;·&nbsp; Tarjeta/Transferencia no entra al arqueo de efectivo
        </p>
      </div>

      {/* ── Ventas del turno ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Ventas de este turno ({ventas.length})
          </h3>
          <button onClick={fetchVentas} disabled={loadingVentas}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingVentas ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
        {ventas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Sin ventas registradas en este turno</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium"># Venta</th>
                  <th className="text-left pb-2 font-medium">Hora</th>
                  <th className="text-left pb-2 font-medium">Método de pago</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v, i) => (
                  <tr key={v.VentaID} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="py-2 text-gray-700 font-medium">#{v.VentaID}</td>
                    <td className="py-2 text-gray-500">
                      {new Date(v.FechaVenta).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${metodoBadge(v.MetodoPago)}`}>
                        {v.MetodoPago}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">{formatCurrency(v.Total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Historial ── */}
      <HistorialSection
        historialOpen={historialOpen} setHistorialOpen={setHistorialOpen}
        historial={historial} loadingHistorial={loadingHistorial}
        historialFechaDesde={historialFechaDesde} setHistorialFechaDesde={setHistorialFechaDesde}
        historialFechaHasta={historialFechaHasta} setHistorialFechaHasta={setHistorialFechaHasta}
        fetchHistorial={fetchHistorial}
        exportarPDF={exportarHistorialPDF} exportarExcel={exportarHistorialExcel}
        fmtDate={fmtDate}
      />

      {/* ── Modales ── */}
      {showMovimiento && (
        <MovimientoCajaModal
          cajaId={cajaActual.CajaID}
          onClose={() => setShowMovimiento(false)}
          onSuccess={fetchVentas}
        />
      )}
      {showCorte && (
        <CorteModal cajaId={cajaActual.CajaID} onClose={() => setShowCorte(false)} />
      )}
      {showCierre && (
        <CierreCajaModal
          caja={cajaActual}
          onClose={() => setShowCierre(false)}
          onSuccess={handleCierreSuccess}
        />
      )}
    </div></Layout>
  );

}

// ── Sub-componente historial ─────────────────────────────────
function HistorialSection({
  historialOpen, setHistorialOpen, historial, loadingHistorial,
  historialFechaDesde, setHistorialFechaDesde,
  historialFechaHasta, setHistorialFechaHasta,
  fetchHistorial, exportarPDF, exportarExcel, fmtDate
}) {
  const estadoBadge = (e) => e === 'Abierta' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setHistorialOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
        <span className="font-semibold text-gray-700">Historial de Cortes</span>
        {historialOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
      </button>

      {historialOpen && (
        <div className="border-t border-gray-100">
          {/* Filtros + exportar */}
          <div className="flex flex-wrap items-end gap-3 px-6 py-4 bg-gray-50">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input type="date" value={historialFechaDesde} onChange={e => setHistorialFechaDesde(e.target.value)}
                     className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input type="date" value={historialFechaHasta} onChange={e => setHistorialFechaHasta(e.target.value)}
                     className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <button onClick={() => fetchHistorial(historialFechaDesde, historialFechaHasta)}
                    className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition">
              <Calendar className="h-4 w-4" /> Filtrar
            </button>
            <button onClick={() => fetchHistorial(historialFechaDesde, historialFechaHasta)}
                    title="Actualizar"
                    className="flex items-center gap-1.5 border border-gray-300 text-gray-600
                               text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <RefreshCw className="h-4 w-4" /> Actualizar
            </button>
            <div className="ml-auto flex gap-2">
              <button onClick={exportarPDF}
                      className="flex items-center gap-1.5 border border-blue-300 text-blue-700
                                 text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition">
                <Printer className="h-4 w-4" /> PDF
              </button>
              <button onClick={exportarExcel}
                      className="flex items-center gap-1.5 border border-green-300 text-green-700
                                 text-sm font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition">
                <Sheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto px-6 pb-6">
            {loadingHistorial ? (
              <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin cortes en el período seleccionado</p>
            ) : (
              <div className="space-y-3 mt-2">
                {historial.map((c) => {
                  const mxn = v => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v ?? 0);
                  const duracion = () => {
                    if (!c.FechaHoraCierre) return null;
                    const mins = Math.round((new Date(c.FechaHoraCierre) - new Date(c.FechaHoraApertura)) / 60000);
                    if (mins < 60) return `${mins} min`;
                    return `${Math.floor(mins/60)}h ${mins%60}m`;
                  };
                  const dif = parseFloat(c.Diferencia ?? 0);
                  const abierta = c.Estado === 'Abierta';
                  const deberiaHaber = parseFloat(c.MontoInicial ?? 0) + parseFloat(c.TotalVentasEfectivo ?? 0);
                  return (
                    <div key={c.CajaID} className={`border rounded-xl overflow-hidden ${abierta ? 'border-green-200' : 'border-gray-200'} bg-white`}>

                      {/* ── Cabecera ── */}
                      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${abierta ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-gray-900 text-sm">{c.NombreUsuario}</span>
                          <span className="text-gray-400 text-xs">#{c.CajaID}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${abierta ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                            {c.Estado}
                          </span>
                          {duracion() && <span className="text-xs text-gray-400">⏱ {duracion()}</span>}
                        </div>
                        <div className="text-right text-xs text-gray-500 space-y-0.5">
                          <div>Apertura: <span className="font-medium text-gray-700">{fmtDate(c.FechaHoraApertura)}</span></div>
                          {c.FechaHoraCierre && <div>Cierre: <span className="font-medium text-gray-700">{fmtDate(c.FechaHoraCierre)}</span></div>}
                        </div>
                      </div>

                      {/* ── Métricas ── */}
                      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">

                        {/* Bloque 1: Arqueo de efectivo */}
                        <div className="px-4 py-3 col-span-2 md:col-span-1 bg-gray-50/60 border-b md:border-b-0 border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Arqueo efectivo</p>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex justify-between">
                              <span>Fondo inicial</span>
                              <span className="font-medium text-gray-700">{mxn(c.MontoInicial)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>+ Ventas efectivo</span>
                              <span className="font-medium text-green-700">{mxn(c.TotalVentasEfectivo)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-gray-200 font-semibold text-gray-800 text-sm">
                              <span>= Debería haber</span>
                              <span>{mxn(deberiaHaber)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bloque 2: Ventas por método */}
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ventas</p>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex justify-between">
                              <span>Efectivo</span>
                              <span className="font-medium text-green-700">{mxn(c.TotalVentasEfectivo)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tarjeta</span>
                              <span className="font-medium text-blue-700">{mxn(c.TotalVentasTarjeta)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transferencia</span>
                              <span className="font-medium text-purple-700">{mxn(c.TotalVentasTransferencia)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bloque 3: Total general */}
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total general</p>
                          <p className="text-xl font-bold text-gray-900">{mxn(c.TotalVentas)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{c.NumeroVentas ?? 0} ventas registradas</p>
                        </div>

                        {/* Bloque 4: Resultado del corte */}
                        <div className={`px-4 py-3 ${c.Diferencia == null ? '' : dif < 0 ? 'bg-red-50/60' : dif > 0 ? 'bg-green-50/60' : 'bg-gray-50/60'}`}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resultado corte</p>
                          {c.Diferencia == null || !c.FechaHoraCierre ? (
                            <p className="text-xs text-gray-400 italic">Turno activo — sin cerrar</p>
                          ) : (
                            <>
                              <p className={`text-xl font-bold ${dif < 0 ? 'text-red-600' : dif > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                {dif === 0 ? '✓ Cuadrado' : (dif > 0 ? '+' : '') + mxn(dif)}
                              </p>
                              <p className={`text-xs mt-0.5 font-medium ${dif < 0 ? 'text-red-500' : dif > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                {dif < 0 ? `Faltante de ${mxn(Math.abs(dif))}` : dif > 0 ? `Sobrante de ${mxn(dif)}` : 'Caja cuadrada'}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Contado: {mxn(c.MontoFinalDeclarado)}</p>
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
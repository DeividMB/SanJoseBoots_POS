// frontend/src/pages/Caja.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, CreditCard, Smartphone, TrendingUp,
  CheckCircle, AlertTriangle, XCircle, Clock,
  RefreshCw, ChevronDown, ChevronUp, FileText, X
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import api from '../api/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—';

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

// ─── Modal base ───────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Badge estado corte ───────────────────────────────────────────────────────
const EstadoBadge = ({ estado }) => {
  const map = {
    CUADRADO: { cls: 'bg-green-100 text-green-700', icon: CheckCircle,    label: 'Cuadrado'  },
    SOBRANTE: { cls: 'bg-blue-100 text-blue-700',   icon: TrendingUp,     label: 'Sobrante'  },
    FALTANTE: { cls: 'bg-red-100 text-red-600',     icon: AlertTriangle,  label: 'Faltante'  },
  };
  const cfg = map[estado] || { cls: 'bg-gray-100 text-gray-600', icon: Clock, label: estado };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

// ─── Modal abrir caja ─────────────────────────────────────────────────────────
const ModalAbrirCaja = ({ open, onClose, onSuccess }) => {
  const [montoInicial, setMontoInicial] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setMontoInicial(''); setObservaciones(''); }
  }, [open]);

  const handleSubmit = async () => {
    const monto = parseFloat(montoInicial) || 0;
    if (monto < 0) return toast.error('El monto no puede ser negativo');

    setLoading(true);
    try {
      await api.post('/caja/abrir', {
        MontoInicial: monto,
        Observaciones: observaciones || null,
      });
      toast.success('¡Caja abierta exitosamente!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full h-11 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title="Abrir Caja">
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            Ingresa el monto de efectivo con el que inicias el día. Este monto se usará para calcular el cuadre al cierre.
          </p>
        </div>
        <div>
          <label className={labelCls}>Monto inicial en caja ($)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              className={`${inputCls} pl-7`}
              type="number"
              min="0"
              step="0.01"
              value={montoInicial}
              onChange={e => setMontoInicial(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Observaciones (opcional)</label>
          <textarea
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
            rows={2}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Notas sobre la apertura..."
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-11 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Abrir Caja
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal realizar corte ─────────────────────────────────────────────────────
const ModalCorte = ({ open, onClose, apertura, ventas, onSuccess }) => {
  const [efectivoContado, setEfectivoContado] = useState('');
  const [observaciones, setObservaciones]     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [preview, setPreview]                 = useState(null);

  useEffect(() => {
    if (open) { setEfectivoContado(''); setObservaciones(''); setPreview(null); }
  }, [open]);

  // Calcular preview en tiempo real
  useEffect(() => {
    const contado  = parseFloat(efectivoContado) || 0;
    const montoIni = parseFloat(apertura?.MontoInicial) || 0;
    const efVentas = parseFloat(ventas?.VentasEfectivo) || 0;
    const esperado = montoIni + efVentas;
    const diff     = contado - esperado;
    setPreview({
      esperado,
      contado,
      diferencia: diff,
      estado: Math.abs(diff) < 0.01 ? 'CUADRADO' : diff > 0 ? 'SOBRANTE' : 'FALTANTE',
    });
  }, [efectivoContado, apertura, ventas]);

  const handleSubmit = async () => {
    const contado = parseFloat(efectivoContado);
    if (isNaN(contado) || contado < 0) return toast.error('Ingresa un monto válido');

    setLoading(true);
    try {
      await api.post('/caja/corte', {
        AperturaID: apertura.AperturaID,
        EfectivoContado: contado,
        Observaciones: observaciones || null,
      });
      toast.success('Corte realizado exitosamente');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al realizar corte');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full h-11 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  const diffColor = !preview ? '' :
    preview.estado === 'CUADRADO' ? 'text-green-600' :
    preview.estado === 'SOBRANTE' ? 'text-blue-600' : 'text-red-600';

  return (
    <Modal open={open} onClose={onClose} title="Realizar Corte de Caja" width="max-w-xl">
      <div className="space-y-4">
        {/* Resumen del día */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen del día</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Monto inicial',   value: fmt(parseFloat(apertura?.MontoInicial) || 0) },
              { label: 'Ventas Efectivo', value: fmt(ventas?.VentasEfectivo) },
              { label: 'Ventas Tarjeta',  value: fmt(ventas?.VentasTarjeta) },
              { label: 'Transferencias',  value: fmt(ventas?.VentasTransferencia) },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-200 last:border-0">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className="text-sm font-semibold text-gray-700">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-300">
            <span className="text-xs font-semibold text-gray-600">Total Ventas</span>
            <span className="text-base font-bold text-amber-700">{fmt(ventas?.TotalVentas)}</span>
          </div>
        </div>

        {/* Efectivo contado */}
        <div>
          <label className={labelCls}>Efectivo contado en caja *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              className={`${inputCls} pl-7`}
              type="number" min="0" step="0.01"
              value={efectivoContado}
              onChange={e => setEfectivoContado(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>

        {/* Preview cuadre */}
        {preview && efectivoContado !== '' && (
          <div className={`p-4 rounded-xl border-2 ${
            preview.estado === 'CUADRADO' ? 'bg-green-50 border-green-200' :
            preview.estado === 'SOBRANTE' ? 'bg-blue-50 border-blue-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Resultado del corte</span>
              <EstadoBadge estado={preview.estado} />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Efectivo esperado</span>
                <span className="font-medium">{fmt(preview.esperado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Efectivo contado</span>
                <span className="font-medium">{fmt(preview.contado)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="font-semibold text-gray-600">Diferencia</span>
                <span className={`font-bold text-base ${diffColor}`}>
                  {preview.diferencia >= 0 ? '+' : ''}{fmt(preview.diferencia)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Observaciones (opcional)</label>
          <textarea
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
            rows={2}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Notas sobre el corte..."
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading || !efectivoContado}
            className="flex-1 h-11 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Confirmar Corte
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const CajaPage = () => {
  const [cajaData, setCajaData]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [historial, setHistorial]     = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(daysAgo(30));
  const [fechaFin, setFechaFin]       = useState(today());

  const [modalAbrir, setModalAbrir]   = useState(false);
  const [modalCorte, setModalCorte]   = useState(false);

  const fetchCaja = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/caja/actual');
      setCajaData(res.data.data);
    } catch (err) {
      toast.error('Error al cargar estado de caja');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistorial = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = await api.get(`/caja/historial?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      setHistorial(res.data.data || []);
    } catch (err) {
      toast.error('Error al cargar historial');
    } finally {
      setLoadingHist(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { fetchCaja(); }, []);
  useEffect(() => { if (showHistorial) fetchHistorial(); }, [showHistorial]);

  const apertura   = cajaData?.apertura;
  const ventas     = cajaData?.ventas;
  const cajaAbierta = apertura?.Estado === 'ABIERTA';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
            <p className="text-sm text-gray-500 mt-0.5">Control de apertura y corte diario</p>
          </div>
          <button onClick={fetchCaja} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500 hover:text-gray-700">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Cargando estado de caja...</span>
          </div>
        ) : (
          <>
            {/* Estado de caja */}
            <div className={`rounded-2xl border-2 p-6 ${cajaAbierta
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cajaAbierta ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <DollarSign className={`w-7 h-7 ${cajaAbierta ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-800">
                        {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                      </h2>
                      {cajaAbierta
                        ? <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-semibold rounded-full">ACTIVA</span>
                        : <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded-full">CERRADA</span>
                      }
                    </div>
                    {cajaAbierta
                      ? <p className="text-sm text-gray-600 mt-0.5">Abierta el {fmtDateTime(apertura.FechaApertura)} · Monto inicial: <strong>{fmt(apertura.MontoInicial)}</strong></p>
                      : <p className="text-sm text-gray-500 mt-0.5">No hay caja abierta hoy. Abre la caja para comenzar a operar.</p>
                    }
                  </div>
                </div>
                <div className="flex gap-3">
                  {!cajaAbierta && (
                    <button onClick={() => setModalAbrir(true)}
                      className="h-11 px-6 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                      Abrir Caja
                    </button>
                  )}
                  {cajaAbierta && (
                    <button onClick={() => setModalCorte(true)}
                      className="h-11 px-6 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Realizar Corte
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ventas del día */}
            {cajaAbierta && ventas && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Ventas Efectivo',    value: fmt(ventas.VentasEfectivo),      icon: DollarSign,   color: 'text-amber-700',  bg: 'bg-amber-50'  },
                  { label: 'Ventas Tarjeta',      value: fmt(ventas.VentasTarjeta),       icon: CreditCard,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
                  { label: 'Transferencias',      value: fmt(ventas.VentasTransferencia), icon: Smartphone,   color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Total del Día',       value: fmt(ventas.TotalVentas),         icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50'  },
                ].map((k, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${k.bg} ${k.color}`}>
                      <k.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{k.label}</p>
                      <p className="text-lg font-bold text-gray-800">{k.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detalle ventas del día */}
            {cajaAbierta && ventas && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Resumen del día</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Monto inicial en caja',  value: fmt(apertura?.MontoInicial),    bold: false },
                    { label: 'Ventas en efectivo',      value: fmt(ventas.VentasEfectivo),     bold: false },
                    { label: 'Efectivo esperado en caja', value: fmt((parseFloat(apertura?.MontoInicial) || 0) + (ventas.VentasEfectivo || 0)), bold: true },
                    { label: 'Ventas con tarjeta',      value: fmt(ventas.VentasTarjeta),      bold: false },
                    { label: 'Ventas por transferencia',value: fmt(ventas.VentasTransferencia),bold: false },
                    { label: 'Número de ventas',        value: `${ventas.NumeroVentas} ventas`, bold: false },
                    { label: 'Total ingresos del día',  value: fmt(ventas.TotalVentas),        bold: true  },
                  ].map((r, i) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 ${r.bold ? 'border-t border-gray-200 mt-1 pt-3' : ''}`}>
                      <span className={`text-sm ${r.bold ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{r.label}</span>
                      <span className={`text-sm ${r.bold ? 'font-bold text-amber-700 text-base' : 'font-medium text-gray-700'}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de cortes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setShowHistorial(p => !p)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors rounded-xl"
              >
                <span className="text-base font-semibold text-gray-800">Historial de Cortes</span>
                {showHistorial ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {showHistorial && (
                <div className="border-t border-gray-100">
                  {/* Filtros */}
                  <div className="px-6 py-3 flex flex-wrap gap-3 items-end border-b border-gray-100">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Desde</label>
                      <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                        className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Hasta</label>
                      <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                        className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                    </div>
                    <button onClick={fetchHistorial}
                      className="h-9 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                      {loadingHist ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      Buscar
                    </button>
                  </div>

                  {/* Tabla historial */}
                  <div className="overflow-x-auto">
                    {loadingHist ? (
                      <div className="flex items-center justify-center py-10">
                        <RefreshCw className="w-5 h-5 text-amber-700 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Cargando...</span>
                      </div>
                    ) : historial.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <FileText className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">Sin cortes en este período</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                            <th className="px-4 py-3 text-left">Fecha Corte</th>
                            <th className="px-4 py-3 text-left">Cajero</th>
                            <th className="px-4 py-3 text-right">Monto Inicial</th>
                            <th className="px-4 py-3 text-right">Ef. Ventas</th>
                            <th className="px-4 py-3 text-right">Tarjeta</th>
                            <th className="px-4 py-3 text-right">Transfer.</th>
                            <th className="px-4 py-3 text-right">Total Sistema</th>
                            <th className="px-4 py-3 text-right">Ef. Contado</th>
                            <th className="px-4 py-3 text-right">Diferencia</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {historial.map((c, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-xs text-gray-500">{fmtDateTime(c.FechaCorte)}</td>
                              <td className="px-4 py-3 font-medium text-gray-800">{c.Cajero}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{fmt(c.MontoInicial)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{fmt(c.VentasEfectivo)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{fmt(c.VentasTarjeta)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{fmt(c.VentasTransferencia)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-700">{fmt(c.TotalVentasSistema)}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{fmt(c.EfectivoContado)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${parseFloat(c.Diferencia) > 0 ? 'text-blue-600' : parseFloat(c.Diferencia) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {parseFloat(c.Diferencia) >= 0 ? '+' : ''}{fmt(c.Diferencia)}
                              </td>
                              <td className="px-4 py-3 text-center"><EstadoBadge estado={c.Estado} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <ModalAbrirCaja open={modalAbrir} onClose={() => setModalAbrir(false)} onSuccess={fetchCaja} />
      <ModalCorte
        open={modalCorte}
        onClose={() => setModalCorte(false)}
        apertura={apertura}
        ventas={ventas}
        onSuccess={fetchCaja}
      />
    </Layout>
  );
};

export default CajaPage;
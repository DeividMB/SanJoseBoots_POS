// src/components/caja/CierreCajaModal.jsx
import { useState, useMemo } from 'react';
import {
  Lock, DollarSign, CreditCard, Smartphone,
  FileText, CheckCircle, AlertTriangle, XCircle, X,
} from 'lucide-react';
import useCajaStore from '../../store/cajaStore';
import { cajaAPI }  from '../../api/endpoints';
import toast        from 'react-hot-toast';

const fmt = (n) =>
  `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CierreCajaModal({ onClose }) {
  const { cajaActual, clearCaja } = useCajaStore();
  const [montoContado, setMontoContado] = useState('');
  const [notas, setNotas]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [resumen, setResumen]           = useState(null); // resultado post-cierre

  // Monto que debería haber físicamente
  const montoEsperado = useMemo(() => (
    parseFloat(cajaActual?.MontoInicial        || 0) +
    parseFloat(cajaActual?.TotalVentasEfectivo || 0)
  ), [cajaActual]);

  // Diferencia en tiempo real
  const diferencia = useMemo(() => {
    const contado = parseFloat(montoContado || 0);
    return contado - montoEsperado;
  }, [montoContado, montoEsperado]);

  // Semáforo
  const estadoDif = useMemo(() => {
    if (!montoContado) return null;
    const abs = Math.abs(diferencia);
    if (abs === 0)   return 'exacto';
    if (abs < 100)   return 'leve';
    return 'grave';
  }, [diferencia, montoContado]);

  const colorMap = {
    exacto: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', Icon: CheckCircle },
    leve:   { bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-700',  Icon: AlertTriangle },
    grave:  { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700',     Icon: XCircle },
  };

  const handleCerrar = async () => {
    if (montoContado === '' || montoContado === null) {
      toast.error('Ingresa el monto que contaste físicamente');
      return;
    }
    try {
      setLoading(true);
      const res = await cajaAPI.cerrar(cajaActual.CajaID, {
        montoFinalDeclarado: parseFloat(montoContado),
        notasCierre: notas.trim() || null,
      });
      setResumen(res.data.resumen);
      clearCaja();
      toast.success(res.data.message ?? '✅ Caja cerrada.', { duration: 5000 });
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Error al cerrar la caja');
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla post-cierre ──────────────────────────────────
  if (resumen) {
    const diff = parseFloat(resumen.Diferencia ?? 0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-5 flex items-center gap-3">
            <Lock className="h-6 w-6 text-white" />
            <h2 className="text-white font-bold text-xl">Resumen de Cierre</h2>
          </div>
          <div className="p-6 space-y-2.5 text-sm">
            <Row label="Cajero"          value={resumen.NombreCompleto ?? resumen.Username} />
            <Row label="Apertura"        value={new Date(resumen.FechaHoraApertura).toLocaleString('es-MX')} />
            <Row label="Cierre"          value={new Date(resumen.FechaHoraCierre).toLocaleString('es-MX')} />
            <Row label="Tiempo trabajado" value={`${resumen.MinutosTrabajados} min`} />
            <hr className="my-1" />
            <Row label="Monto inicial"          value={fmt(resumen.MontoInicial)} />
            <Row label="Ventas en efectivo"      value={fmt(resumen.TotalVentasEfectivo)} />
            <Row label="Ventas con tarjeta"      value={fmt(resumen.TotalVentasTarjeta)} />
            <Row label="Ventas transferencia"    value={fmt(resumen.TotalVentasTransferencia)} />
            <Row label="Total de ventas"         value={fmt(resumen.TotalVentas)} bold />
            <Row label="Número de ventas"        value={resumen.NumeroVentas} />
            <hr className="my-1" />
            <Row label="Esperado en caja"  value={fmt(resumen.MontoFinalReal)} />
            <Row label="Contado físico"    value={fmt(resumen.MontoFinalDeclarado)} />
            <Row
              label="Diferencia"
              value={`${diff >= 0 ? '+' : ''}${fmt(diff)}`}
              bold
              className={
                diff === 0 ? 'text-emerald-600' :
                diff > 0   ? 'text-yellow-600'  : 'text-red-600'
              }
            />
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Cerrar Resumen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Modal principal ───────────────────────────────────────
  const estado = estadoDif ? colorMap[estadoDif] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-white font-bold text-xl">Cierre de Caja</h2>
              <p className="text-gray-300 text-sm">Arqueo del turno</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Efectivo vendido"      value={fmt(cajaActual?.TotalVentasEfectivo)}   color="emerald" />
            <SummaryCard icon={<CreditCard className="h-4 w-4" />} label="Tarjeta"               value={fmt(cajaActual?.TotalVentasTarjeta)}    color="blue"    />
            <SummaryCard icon={<Smartphone className="h-4 w-4" />} label="Transferencia"          value={fmt(cajaActual?.TotalVentasTransferencia)} color="purple" />
            <SummaryCard icon={<DollarSign className="h-4 w-4" />} label={`Total (${cajaActual?.NumeroVentas ?? 0} ventas)`} value={fmt(cajaActual?.TotalVentas)} color="gray" />
          </div>

          {/* Arqueo */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-700">Arqueo de caja</p>
            <div className="flex justify-between">
              <span className="text-gray-500">Monto inicial:</span>
              <span className="font-medium">{fmt(cajaActual?.MontoInicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">+ Ventas en efectivo:</span>
              <span className="font-medium text-emerald-600">{fmt(cajaActual?.TotalVentasEfectivo)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>= Debería haber en caja:</span>
              <span className="text-gray-900">{fmt(montoEsperado)}</span>
            </div>
          </div>

          {/* Input monto contado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Monto que contaste físicamente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <DollarSign className="h-4 w-4" />
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={montoContado}
                onChange={(e) => setMontoContado(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-gray-500
                           text-lg font-semibold"
              />
            </div>
          </div>

          {/* Semáforo de diferencia */}
          {estado && (
            <div className={`${estado.bg} ${estado.border} border rounded-xl p-4 flex items-center gap-3`}>
              <estado.Icon className={`h-6 w-6 ${estado.text} flex-shrink-0`} />
              <div>
                <p className={`font-bold ${estado.text}`}>
                  {diferencia === 0
                    ? '¡Cuadre perfecto! 🎉'
                    : diferencia > 0
                      ? `Sobrante: +${fmt(diferencia)}`
                      : `Faltante: ${fmt(diferencia)}`}
                </p>
                <p className={`text-xs ${estado.text} opacity-75`}>
                  {estadoDif === 'exacto' && 'El efectivo coincide exactamente.'}
                  {estadoDif === 'leve'   && 'Diferencia menor a $100 — verifica el cambio dado.'}
                  {estadoDif === 'grave'  && 'Diferencia mayor a $100 — revisa las transacciones.'}
                </p>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              <FileText className="inline h-4 w-4 mr-1" />
              Notas de cierre{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Diferencia de $20 por cambio devuelto de más..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-gray-500
                         resize-none text-sm"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold
                         py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCerrar}
              disabled={loading || montoContado === ''}
              className="flex-1 bg-gray-800 hover:bg-gray-900
                         disabled:bg-gray-300 disabled:cursor-not-allowed
                         text-white font-bold py-3 rounded-xl transition-colors
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Cerrar Caja y Terminar Turno
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────
function Row({ label, value, bold, className }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}:</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} text-gray-800 ${className ?? ''}`}>
        {value}
      </span>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:    'bg-blue-50   text-blue-700   border-blue-200',
    purple:  'bg-purple-50 text-purple-700 border-purple-200',
    gray:    'bg-gray-50   text-gray-700   border-gray-200',
  };
  return (
    <div className={`border rounded-xl p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70 text-xs font-medium">
        {icon}{label}
      </div>
      <p className="font-bold text-base">{value}</p>
    </div>
  );
}
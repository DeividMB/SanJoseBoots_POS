// src/components/caja/CajaStatus.jsx — VERSIÓN CORREGIDA
// Cambios:
//  1. Si cajaDeOtroUsuario=true → muestra badge amarillo con nombre del dueño
//  2. Si hasCajaAbierta propia → comportamiento normal (verde)
//  3. Sin caja → rojo (igual que antes)

import { useState } from 'react';
import { LockOpen, Lock, Clock, DollarSign, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCajaStore from '../../store/cajaStore';
import useAuthStore from '../../store/authStore';

const fmt = (n) =>
  `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CajaStatus() {
  const { cajaActual, hasCajaAbierta, cajaDeOtroUsuario } = useCajaStore();
  const { user } = useAuthStore();
  const [showPopover, setShowPopover]  = useState(false);
  const navigate = useNavigate();

  const rolActual  = (user?.rol ?? user?.role ?? '').toLowerCase();
  const esVendedor = rolActual === 'vendedor';

  const minutosAbierta = cajaActual
    ? Math.floor((Date.now() - new Date(cajaActual.FechaHoraApertura)) / 60000)
    : 0;
  const formatTiempo = (min) =>
    min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;
  const alertaTurnoLargo = minutosAbierta > 720;

  // ── Sin caja ─────────────────────────────────────────────────
  if (!hasCajaAbierta) {
    // Vendedor sin caja → no mostrar nada (no puede abrir caja)
    if (esVendedor) return null;
    return (
      <button
        onClick={() => navigate('/caja')}
        title="Sin caja abierta — haz clic para abrir"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
      >
        <Lock className="h-4 w-4 text-red-600" />
        <span className="text-red-700 text-sm font-semibold hidden sm:block">Caja Cerrada</span>
      </button>
    );
  }

  // ── Caja de OTRO usuario ──────────────────────────────────────
  if (cajaDeOtroUsuario) {
    const nombreDuenio = cajaActual?.NombreUsuario ?? cajaActual?.NombreCompleto ?? 'otro usuario';
    return (
      <div className="relative">
        <button
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
          title={`Caja abierta por ${nombreDuenio}`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-amber-700 text-sm font-semibold hidden sm:block">
            Caja de {nombreDuenio}
          </span>
        </button>

        {showPopover && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-amber-200 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50 rounded-t-xl">
                <p className="font-semibold text-amber-800 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Caja de otro usuario
                </p>
                <button onClick={() => setShowPopover(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <p className="text-gray-600 text-xs">
                  La caja fue abierta por <span className="font-semibold text-gray-800">{nombreDuenio}</span>.
                  Para abrir una nueva caja, primero se debe cerrar esta.
                </p>
                <InfoRow icon={<Clock className="h-4 w-4 text-gray-400" />} label="Tiempo abierta" value={formatTiempo(minutosAbierta)} />
                <InfoRow icon={<DollarSign className="h-4 w-4 text-gray-400" />} label="Total ventas" value={fmt(cajaActual?.TotalVentas)} />
              </div>
              {!esVendedor && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => { setShowPopover(false); navigate('/caja'); }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    Ir a Caja para cerrarla
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Caja propia abierta ───────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        title="Caja abierta — haz clic para ver detalles"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors
          ${alertaTurnoLargo ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-emerald-100 hover:bg-emerald-200'}`}
      >
        <span className={`h-2 w-2 rounded-full animate-pulse ${alertaTurnoLargo ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
        <LockOpen className={`h-4 w-4 ${alertaTurnoLargo ? 'text-yellow-700' : 'text-emerald-700'}`} />
        <span className={`text-sm font-semibold hidden sm:block ${alertaTurnoLargo ? 'text-yellow-700' : 'text-emerald-700'}`}>
          Caja Abierta
        </span>
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Caja en curso</p>
              <button onClick={() => setShowPopover(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {alertaTurnoLargo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-700 text-xs">
                  ⚠️ Llevas más de 12 horas con la caja abierta
                </div>
              )}
              <InfoRow icon={<Clock className="h-4 w-4 text-gray-400" />} label="Apertura"
                value={new Date(cajaActual.FechaHoraApertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} />
              <InfoRow icon={<Clock className="h-4 w-4 text-gray-400" />} label="Tiempo abierta" value={formatTiempo(minutosAbierta)} />
              <InfoRow icon={<DollarSign className="h-4 w-4 text-gray-400" />} label="Monto inicial" value={fmt(cajaActual.MontoInicial)} />
              <InfoRow icon={<DollarSign className="h-4 w-4 text-gray-400" />} label="Total ventas" value={fmt(cajaActual.TotalVentas)} />
              <InfoRow icon={<DollarSign className="h-4 w-4 text-gray-400" />} label="Nº ventas" value={cajaActual.NumeroVentas ?? 0} />
            </div>
            {!esVendedor && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setShowPopover(false); navigate('/caja'); }}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  Ver detalle / Cerrar caja
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-gray-500">{icon}<span>{label}:</span></div>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

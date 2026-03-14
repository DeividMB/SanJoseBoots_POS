// src/components/caja/CajaStatus.jsx
import { useState } from 'react';
import { LockOpen, Lock, Clock, DollarSign, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCajaStore from '../../store/cajaStore';

const fmt = (n) =>
  `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CajaStatus() {
  const { cajaActual, hasCajaAbierta } = useCajaStore();
  const [showPopover, setShowPopover]  = useState(false);
  const navigate = useNavigate();

  const minutosAbierta = cajaActual
    ? Math.floor((Date.now() - new Date(cajaActual.FechaHoraApertura)) / 60000)
    : 0;

  const formatTiempo = (min) =>
    min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  const alertaTurnoLargo = minutosAbierta > 720; // más de 12 horas

  // ── Sin caja ────────────────────────────────────────────
  if (!hasCajaAbierta) {
    return (
      <button
        onClick={() => navigate('/caja')}
        title="Sin caja abierta — haz clic para abrir"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   bg-red-100 hover:bg-red-200 transition-colors"
      >
        <Lock className="h-4 w-4 text-red-600" />
        <span className="text-red-700 text-sm font-semibold hidden sm:block">
          Caja Cerrada
        </span>
      </button>
    );
  }

  // ── Con caja abierta ────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        title="Caja abierta — haz clic para ver detalles"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors
          ${alertaTurnoLargo
            ? 'bg-yellow-100 hover:bg-yellow-200'
            : 'bg-emerald-100 hover:bg-emerald-200'}`}
      >
        <span className={`h-2 w-2 rounded-full animate-pulse
          ${alertaTurnoLargo ? 'bg-yellow-500' : 'bg-emerald-500'}`}
        />
        <LockOpen className={`h-4 w-4 ${alertaTurnoLargo ? 'text-yellow-700' : 'text-emerald-700'}`} />
        <span className={`text-sm font-semibold hidden sm:block
          ${alertaTurnoLargo ? 'text-yellow-700' : 'text-emerald-700'}`}>
          Caja Abierta
        </span>
      </button>

      {/* Popover */}
      {showPopover && (
        <>
          {/* Capa invisible para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl
                          shadow-xl border border-gray-200 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Caja en curso</p>
              <button
                onClick={() => setShowPopover(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              {alertaTurnoLargo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg
                                px-3 py-2 text-yellow-700 text-xs">
                  ⚠️ Llevas más de 12 horas con la caja abierta
                </div>
              )}
              <InfoRow
                icon={<Clock className="h-4 w-4 text-gray-400" />}
                label="Apertura"
                value={new Date(cajaActual.FechaHoraApertura).toLocaleTimeString('es-MX', {
                  hour: '2-digit', minute: '2-digit',
                })}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4 text-gray-400" />}
                label="Tiempo abierta"
                value={formatTiempo(minutosAbierta)}
              />
              <InfoRow
                icon={<DollarSign className="h-4 w-4 text-gray-400" />}
                label="Monto inicial"
                value={fmt(cajaActual.MontoInicial)}
              />
              <InfoRow
                icon={<DollarSign className="h-4 w-4 text-gray-400" />}
                label="Total ventas"
                value={fmt(cajaActual.TotalVentas)}
              />
              <InfoRow
                icon={<DollarSign className="h-4 w-4 text-gray-400" />}
                label="Nº ventas"
                value={cajaActual.NumeroVentas ?? 0}
              />
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => { setShowPopover(false); navigate('/caja'); }}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white
                           text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                Ver detalle / Cerrar caja
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span>{label}:</span>
      </div>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
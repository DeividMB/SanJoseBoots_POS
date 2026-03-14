// src/components/caja/AperturaCajaModal.jsx — FASE 6
import { useState, useEffect } from 'react';
import { DollarSign, LogOut, AlertTriangle, Lock, Loader, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { cajaAPI } from '../../api/endpoints';
import useAuthStore from '../../store/authStore';
import useCajaStore from '../../store/cajaStore';
import { useNavigate } from 'react-router-dom';

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val ?? 0);
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AperturaCajaModal({ onSuccess }) {
  const [montoInicial, setMontoInicial] = useState('');
  const [notas, setNotas]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState(null);
  const [loadingCierre, setLoadingCierre] = useState(true);

  const { user, logout }    = useAuthStore();
  const { setCajaActual }   = useCajaStore();
  const navigate            = useNavigate();

  // Cargar último cierre al montar
  useEffect(() => {
    const fetchUltimoCierre = async () => {
      try {
        const res = await cajaAPI.ultimoCierre();
        if (res.data?.success) setUltimoCierre(res.data.data);
      } catch (_) { /* silencioso */ }
      finally { setLoadingCierre(false); }
    };
    fetchUltimoCierre();
  }, []);

  const handleAbrir = async () => {
    const monto = parseFloat(montoInicial);
    if (isNaN(monto) || monto < 0) {
      toast.error('Ingresa un monto inicial válido');
      return;
    }
    setLoading(true);
    try {
      const res = await cajaAPI.abrir({ montoInicial: monto, notas });
      if (res.data?.success) {
        setCajaActual(res.data.data);
        toast.success('¡Caja abierta correctamente!');
        onSuccess?.();
      } else {
        toast.error(res.data?.message || 'Error al abrir caja');
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      // Si ya hay una caja abierta, cargarla automáticamente
      if (msg.toLowerCase().includes('ya tienes una caja abierta') ||
          msg.toLowerCase().includes('caja abierta')) {
        toast('Cargando tu caja activa...', { icon: '🔓' });
        try {
          const cajaRes = await cajaAPI.obtenerActual();
          if (cajaRes.data?.success && cajaRes.data?.data) {
            setCajaActual(cajaRes.data.data);
            toast.success('¡Caja cargada correctamente!');
            onSuccess?.();
            return;
          }
        } catch (_) {}
      }
      toast.error(msg || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const nombreUsuario = user?.NombreCompleto ?? user?.nombre ?? user?.username;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-8 py-6 text-center">
          <img src="/logo.jpeg" alt="San José Boots" className="h-14 mx-auto mb-2"
               style={{ filter: 'invert(1) brightness(2)', objectFit: 'contain' }}
               onError={e => { e.target.style.display='none'; }} />
          <div className="flex items-center justify-center gap-2 mt-3">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-semibold tracking-wide uppercase">Caja Cerrada</span>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-8 py-6">
          <h2 className="text-gray-900 text-xl font-bold mb-1">Abrir Caja</h2>
          <p className="text-gray-500 text-sm mb-4">
            Bienvenido, <span className="font-semibold text-gray-700">{nombreUsuario}</span>.
            Registra el fondo inicial para comenzar.
          </p>

          {/* ── Referencia último cierre ── */}
          {!loadingCierre && ultimoCierre && (
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Referencia — Último Cierre
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Fecha cierre</span>
                  <p className="font-medium text-gray-700 text-xs">{formatDate(ultimoCierre.FechaHoraCierre)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Ventas en efectivo</span>
                  <p className="font-medium text-gray-700">{formatCurrency(ultimoCierre.TotalVentasEfectivo)}</p>
                </div>
                <div className="col-span-2 mt-1 pt-1 border-t border-blue-200">
                  <span className="text-gray-500 text-xs">Efectivo esperado en caja al cierre</span>
                  <p className="text-blue-700 font-bold text-lg">{formatCurrency(ultimoCierre.MontoFinalReal)}</p>
                  <p className="text-xs text-gray-400">
                    = Fondo inicial + ventas en efectivo. Solo referencia, cuenta el dinero físico.
                  </p>
                </div>
              </div>
            </div>
          )}
          {loadingCierre && (
            <div className="mb-5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
              <Loader className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
            </div>
          )}

          {/* Fondo inicial */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fondo inicial en caja</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                     value={montoInicial} onChange={e => setMontoInicial(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAbrir()}
                     className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5
                                text-gray-900 text-base focus:outline-none focus:ring-2
                                focus:ring-gray-800 focus:border-transparent transition"
                     autoFocus />
            </div>
          </div>

          {/* Notas */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea rows={2} placeholder="Observaciones de apertura..."
                      value={notas} onChange={e => setNotas(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                                 text-gray-900 text-sm resize-none focus:outline-none
                                 focus:ring-2 focus:ring-gray-800 focus:border-transparent transition" />
          </div>

          {/* Botón abrir */}
          <button onClick={handleAbrir} disabled={loading}
                  className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400
                             text-white font-semibold py-3 rounded-xl transition-colors
                             flex items-center justify-center gap-2 text-base mb-3">
            {loading
              ? <><Loader className="h-5 w-5 animate-spin" /> Abriendo caja...</>
              : <><DollarSign className="h-5 w-5" /> Abrir Caja y Comenzar</>
            }
          </button>

          {/* Cerrar sesión */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-400">¿Sesión expirada o equivocada?</span>
            </div>
          </div>
          <button onClick={handleLogout}
                  className="w-full border border-gray-300 hover:border-red-300
                             hover:bg-red-50 text-gray-600 hover:text-red-600
                             font-medium py-2.5 rounded-xl transition-colors
                             flex items-center justify-center gap-2 text-sm">
            <LogOut className="h-4 w-4" /> Cerrar Sesión
          </button>
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Si ves un error de token al iniciar, usa <strong>"Cerrar Sesión"</strong> para
              volver al login e iniciar sesión nuevamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
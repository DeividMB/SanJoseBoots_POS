// src/components/caja/MovimientoCajaModal.jsx — NUEVO
// Modal para registrar entradas, salidas, devoluciones o ajustes

import { useState } from 'react';
import { X, DollarSign, Loader, ArrowDownCircle, ArrowUpCircle, RotateCcw, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { cajaAPI } from '../../api/endpoints';

const TIPOS = [
  { value: 'ENTRADA',    label: 'Entrada de efectivo',  icon: ArrowDownCircle,    color: 'text-green-600 bg-green-50 border-green-300',  desc: 'Depósito o ingreso extra' },
  { value: 'SALIDA',     label: 'Salida de efectivo',   icon: ArrowUpCircle,      color: 'text-red-600 bg-red-50 border-red-300',        desc: 'Gasto, retiro o pago' },
  { value: 'DEVOLUCION', label: 'Devolución',           icon: RotateCcw,          color: 'text-orange-600 bg-orange-50 border-orange-300', desc: 'Devolución a cliente' },
  { value: 'AJUSTE',     label: 'Ajuste',               icon: SlidersHorizontal,  color: 'text-purple-600 bg-purple-50 border-purple-300', desc: 'Corrección de diferencia' },
];

export default function MovimientoCajaModal({ cajaId, onClose, onSuccess }) {
  const [tipo,     setTipo]     = useState('SALIDA');
  const [monto,    setMonto]    = useState('');
  const [concepto, setConcepto] = useState('');
  const [notas,    setNotas]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleGuardar = async () => {
    if (!monto || parseFloat(monto) <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (!concepto.trim()) { toast.error('Escribe un concepto'); return; }
    setLoading(true);
    try {
      const res = await cajaAPI.registrarMovimiento({
        cajaId, tipo, monto: parseFloat(monto), concepto: concepto.trim(), notas: notas.trim() || null
      });
      if (res.data?.success) {
        toast.success('Movimiento registrado');
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data?.message || 'Error');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const tipoActual = TIPOS.find(t => t.value === tipo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-400" />
            <h2 className="text-white font-bold text-lg">Movimiento de Caja</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">

          {/* Tipo */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map(t => {
                const Icon = t.icon;
                const active = tipo === t.value;
                return (
                  <button key={t.value} onClick={() => setTipo(t.value)}
                          className={`flex flex-col items-start gap-1 border rounded-xl px-3 py-2.5 text-left transition-all
                            ${active ? t.color + ' border-2' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'}`}>
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${active ? '' : 'text-gray-400'}`} />
                      <span className="text-xs font-semibold">{t.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 pl-5">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input type="number" min="0.01" step="0.01" placeholder="0.00"
                     value={monto} onChange={e => setMonto(e.target.value)}
                     className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5
                                text-gray-900 text-base focus:outline-none focus:ring-2
                                focus:ring-gray-800 focus:border-transparent transition"
                     autoFocus />
            </div>
          </div>

          {/* Concepto */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto <span className="text-red-400">*</span>
            </label>
            <input type="text" placeholder={
              tipo === 'ENTRADA' ? 'Ej: Depósito de gerencia' :
              tipo === 'SALIDA'  ? 'Ej: Compra de bolsas para empaque' :
              tipo === 'DEVOLUCION' ? 'Ej: Devolución cliente — bota defectuosa' :
              'Ej: Ajuste por diferencia en arqueo'}
              value={concepto} onChange={e => setConcepto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm
                         focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition" />
          </div>

          {/* Notas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea rows={2} placeholder="Información adicional..."
                      value={notas} onChange={e => setNotas(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm
                                 resize-none focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition" />
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button onClick={onClose}
                    className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={loading}
                    className={`flex-1 text-white font-semibold py-2.5 rounded-xl transition
                               flex items-center justify-center gap-2
                               ${tipo === 'ENTRADA'    ? 'bg-green-600 hover:bg-green-700' :
                                 tipo === 'DEVOLUCION' ? 'bg-orange-500 hover:bg-orange-600' :
                                 tipo === 'AJUSTE'     ? 'bg-purple-600 hover:bg-purple-700' :
                                                         'bg-red-600 hover:bg-red-700'}
                               disabled:opacity-50`}>
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
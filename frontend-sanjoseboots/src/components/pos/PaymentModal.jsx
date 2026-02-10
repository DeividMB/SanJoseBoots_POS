// src/components/pos/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Smartphone, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total, 
  subtotal, 
  iva,
  isProcessing 
}) => {
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [imprimirTicket, setImprimirTicket] = useState(true);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // Calcular cambio cuando se ingresa efectivo
  useEffect(() => {
    if (metodoPago === 'Efectivo' && montoRecibido) {
      const recibido = parseFloat(montoRecibido) || 0;
      const cambioCalculado = recibido - total;
      setCambio(cambioCalculado >= 0 ? cambioCalculado : 0);
    } else {
      setCambio(0);
    }
  }, [montoRecibido, total, metodoPago]);

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMetodoPago('Efectivo');
      setObservaciones('');
      setImprimirTicket(true);
      setMontoRecibido('');
      setCambio(0);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validación para efectivo
    if (metodoPago === 'Efectivo') {
      const recibido = parseFloat(montoRecibido) || 0;
      if (recibido < total) {
        alert('El monto recibido debe ser mayor o igual al total');
        return;
      }
    }

    // Preparar datos
    const paymentData = {
      metodoPago,
      observaciones: observaciones.trim() || null,
      imprimirTicket
    };

    onConfirm(paymentData);
  };

  const paymentMethods = [
    { value: 'Efectivo', label: 'Efectivo', icon: DollarSign, color: 'green' },
    { value: 'Tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'blue' },
    { value: 'Transferencia', label: 'Transferencia', icon: Smartphone, color: 'purple' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Procesar Pago</h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Resumen de totales */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA (16%):</span>
                <span className="font-medium">{formatCurrency(iva)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = metodoPago === method.value;
                
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setMetodoPago(method.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `border-${method.color}-500 bg-${method.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon 
                      size={24} 
                      className={`mx-auto mb-2 ${
                        isSelected ? `text-${method.color}-600` : 'text-gray-400'
                      }`}
                    />
                    <span className={`text-xs font-medium ${
                      isSelected ? `text-${method.color}-700` : 'text-gray-600'
                    }`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo de monto recibido (solo para efectivo) */}
          {metodoPago === 'Efectivo' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Recibido
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={total}
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isProcessing}
                />
              </div>
              
              {/* Mostrar cambio */}
              {montoRecibido && parseFloat(montoRecibido) >= total && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">
                      Cambio:
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      {formatCurrency(cambio)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre la venta..."
              rows="3"
              maxLength="200"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isProcessing}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {observaciones.length}/200
            </div>
          </div>

          {/* Imprimir ticket */}
          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={imprimirTicket}
                onChange={(e) => setImprimirTicket(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isProcessing}
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                Imprimir ticket
              </span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                'Confirmar Pago'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
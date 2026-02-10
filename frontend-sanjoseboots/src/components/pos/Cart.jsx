// src/components/pos/Cart.jsx
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const Cart = ({ items, onUpdateQuantity, onRemoveItem, subtotal, iva, total }) => {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
        <svg
          className="w-24 h-24 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-lg font-medium">Carrito vacío</p>
        <p className="text-sm mt-1">Agrega productos para comenzar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Lista de productos */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            {/* Nombre y botón eliminar */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-semibold text-gray-800 text-sm truncate">
                  {item.product_name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.color} - Talla {item.size}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  SKU: {item.sku}
                </p>
              </div>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Controles de cantidad y precio */}
            <div className="flex items-center justify-between">
              {/* Controles de cantidad */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-200 transition-colors"
                  disabled={item.quantity <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-semibold text-gray-800">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-200 transition-colors"
                  disabled={item.quantity >= item.stock}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Precio */}
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  {formatCurrency(item.price)} c/u
                </div>
                <div className="font-bold text-gray-800">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            </div>

            {/* Indicador de stock */}
            {item.quantity >= item.stock && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                ⚠️ Stock máximo alcanzado ({item.stock} disponibles)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumen de totales */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>IVA (16%):</span>
          <span className="font-medium">{formatCurrency(iva)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-300">
          <span>Total:</span>
          <span className="text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default Cart;
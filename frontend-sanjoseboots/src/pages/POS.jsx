// src/pages/POS.jsx
import { useState, useMemo } from 'react';
import { RotateCcw, Lock, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

import useCajaStore from '../store/cajaStore';
import { useNavigate } from 'react-router-dom';

import Layout from '../components/layout/Layout';
import ProductSearch from '../components/pos/ProductSearch';
import Cart from '../components/pos/Cart';
import PaymentModal from '../components/pos/PaymentModal';
import Button from '../components/common/Button';
import { salesAPI } from '../api/endpoints';
import { formatCurrency } from '../utils/formatters';

const IVA_RATE = 0.16;

const POS = () => {
  const { hasCajaAbierta, getCajaID } = useCajaStore();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  , [cartItems]);
  const iva   = useMemo(() => subtotal * IVA_RATE, [subtotal]);
  const total = useMemo(() => subtotal + iva, [subtotal, iva]);

  const generateTicketNumber = () => {
    const now = new Date();
    return `TKT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${now.getTime().toString().slice(-6)}`;
  };

  const handleAddToCart = (product) => {
    const existing = cartItems.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) { toast.error('Stock insuficiente'); return; }
      handleUpdateQuantity(product.id, existing.quantity + 1);
      toast.success('Cantidad actualizada');
      return;
    }
    if (product.stock < 1) { toast.error('Producto sin stock'); return; }
    setCartItems([...cartItems, { ...product, quantity: 1 }]);
    toast.success('Producto agregado');
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return handleRemoveFromCart(productId);
    const item = cartItems.find(i => i.id === productId);
    if (newQuantity > item.stock) { toast.error('Cantidad excede stock'); return; }
    setCartItems(cartItems.map(i => i.id === productId ? { ...i, quantity: newQuantity } : i));
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
    toast.success('Producto eliminado');
  };

  const handleClearCart = () => {
    if (!cartItems.length) return;
    if (window.confirm('¿Vaciar carrito?')) { setCartItems([]); toast.success('Carrito limpiado'); }
  };

  const handleOpenPaymentModal = () => {
    if (!hasCajaAbierta) { toast.error('Debes abrir la caja primero'); navigate('/caja'); return; }
    if (!cartItems.length) { toast.error('Agrega productos primero'); return; }
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (paymentData) => {
    if (!cartItems.length || total <= 0) return;
    const cajaID = getCajaID();
    if (!cajaID) { toast.error('No hay caja abierta'); navigate('/caja'); return; }
    setIsProcessing(true);
    try {
      const saleData = {
        cajaID,
        numeroTicket: generateTicketNumber(),
        subtotal: Number(subtotal.toFixed(2)),
        descuento: 0,
        iva: Number(iva.toFixed(2)),
        total: Number(total.toFixed(2)),
        metodoPago: paymentData.metodoPago,
        observaciones: paymentData.observaciones || null,
        detalles: cartItems.map(item => ({
          varianteId: item.id,
          cantidad: item.quantity,
          precioUnitario: Number(item.price.toFixed(2))
        }))
      };
      const response = await salesAPI.create(saleData);
      console.log('✅ Respuesta:', response.data);
      toast.success('Venta registrada correctamente');
      if (paymentData.metodoPago === 'Efectivo' && paymentData.montoRecibido) {
        const cambio = paymentData.montoRecibido - total;
        if (cambio > 0) toast.success(`Cambio: ${formatCurrency(cambio)}`, { duration: 5000 });
      }
      setCartItems([]);
      setIsPaymentModalOpen(false);
      window.dispatchEvent(new Event('stockUpdated'));
    } catch (error) {
      console.error('❌ Error en venta:', error);
      toast.error(error.response?.data?.message || 'Error de conexión');
    } finally {
      setIsProcessing(false);
    }
  };

  // Caja cerrada
  if (!hasCajaAbierta) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full py-24 px-6 text-center">
          <div className="bg-gray-100 p-6 rounded-full mb-6">
            <Lock className="h-16 w-16 text-gray-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Caja Cerrada</h2>
          <p className="text-gray-500 text-lg mb-8 max-w-md">
            Debes abrir la caja antes de realizar ventas.
          </p>
          <button
            onClick={() => navigate('/caja')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-10 py-4 rounded-xl text-lg"
          >
            Ir a Apertura de Caja
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Punto de Venta</h1>
            <p className="text-gray-600">Registra nuevas ventas</p>
          </div>
          {cartItems.length > 0 && (
            <Button variant="outline" icon={RotateCcw} onClick={handleClearCart}>
              Vaciar Carrito
            </Button>
          )}
        </div>

        {/* Grid principal */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">

          {/* Búsqueda */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            <ProductSearch onAddToCart={handleAddToCart} />
          </div>

          {/* Carrito — sin logo propio, el fondo del Layout ya tiene el watermark */}
          <div className="lg:col-span-1 flex flex-col overflow-hidden">
            {cartItems.length === 0 ? (
              <div className="flex-1 rounded-xl border border-gray-200 bg-white/60
                              flex flex-col items-center justify-center"
                   style={{ minHeight: '300px' }}>
                <ShoppingCart className="h-11 w-11 text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium text-base">Carrito vacío</p>
                <p className="text-gray-300 text-sm mt-1 text-center px-6">
                  Agrega productos para comenzar
                </p>
              </div>
            ) : (
              <Cart
                items={cartItems}
                subtotal={subtotal}
                iva={iva}
                total={total}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveFromCart}
              />
            )}

            <button
              onClick={handleOpenPaymentModal}
              disabled={!cartItems.length}
              className={`mt-4 py-3 rounded-lg font-semibold text-white transition ${
                cartItems.length ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {cartItems.length ? `Cobrar ${formatCurrency(total)}` : 'Carrito vacío'}
            </button>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => !isProcessing && setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
        subtotal={subtotal}
        iva={iva}
        total={total}
        isProcessing={isProcessing}
      />
    </Layout>
  );
};

export default POS;
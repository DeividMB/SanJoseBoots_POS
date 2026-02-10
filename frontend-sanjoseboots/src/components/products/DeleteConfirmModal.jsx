import { useState } from 'react';
import { AlertTriangle, Trash2, Archive } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { productsAPI } from '../../api/endpoints';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

/**
 * DeleteConfirmModal - Modal de confirmación para eliminar productos
 * 
 * Props:
 * - isOpen: Boolean que controla si el modal está visible
 * - onClose: Callback para cerrar el modal
 * - product: Objeto con los datos del producto a eliminar
 * - onSuccess: Callback cuando se elimina exitosamente
 */
const DeleteConfirmModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' o 'hard'

  if (!product) return null;

  // Calcular stock total de todas las variantes
  const calcularStockTotal = () => {
    if (!product.variantes || product.variantes.length === 0) {
      return product.StockTotal || 0;
    }
    return product.variantes.reduce((total, v) => total + parseInt(v.StockActual || v.Stock || 0), 0);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      console.log(`🗑️ Eliminando producto ID: ${product.ProductoID}, Tipo: ${deleteType}`);

      // CORREGIDO: Enviar el parámetro hardDelete en el body
      const response = await productsAPI.delete(product.ProductoID, {
        hardDelete: deleteType === 'hard'
      });

      console.log('✅ Respuesta del servidor:', response.data);

      if (response.data && response.data.success) {
        toast.success(
          deleteType === 'soft' 
            ? 'Producto desactivado exitosamente' 
            : 'Producto eliminado permanentemente'
        );
        
        onClose();
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error);
      
      // Manejar errores específicos
      const errorMessage = error.response?.data?.message || 'Error al eliminar el producto';
      
      if (error.response?.status === 400 && errorMessage.includes('ventas')) {
        toast.error('No se puede eliminar permanentemente un producto con ventas registradas. Solo puedes desactivarlo.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="bg-white p-6">
        {/* Header con icono de advertencia */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertTriangle className="text-red-600" size={24} />
        </div>

        {/* Título */}
        <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
          ¿Eliminar Producto?
        </h3>

        {/* Información del producto */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Código:</span>
            <span className="text-sm font-medium text-gray-900">{product.CodigoProducto}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Producto:</span>
            <span className="text-sm font-medium text-gray-900">{product.NombreProducto}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Precio:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(parseFloat(product.PrecioBase))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Stock Total:</span>
            <span className="text-sm font-medium text-gray-900">
              {calcularStockTotal()} unidades
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Variantes:</span>
            <span className="text-sm font-medium text-gray-900">
              {product.TotalVariantes || product.variantes?.length || 0}
            </span>
          </div>
        </div>

        {/* Opciones de eliminación */}
        <div className="mt-6 space-y-3">
          <p className="text-sm text-gray-600 text-center">
            Selecciona el tipo de eliminación:
          </p>

          {/* Soft Delete - Desactivar */}
          <div
            onClick={() => setDeleteType('soft')}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              deleteType === 'soft'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start">
              <Archive
                className={`mt-1 ${deleteType === 'soft' ? 'text-primary' : 'text-gray-400'}`}
                size={20}
              />
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  Desactivar (Recomendado)
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  El producto se marcará como inactivo y no aparecerá en el POS, 
                  pero se conservará el historial de ventas.
                </p>
              </div>
              <div className="ml-3">
                <input
                  type="radio"
                  checked={deleteType === 'soft'}
                  onChange={() => setDeleteType('soft')}
                  className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Hard Delete - Eliminar permanentemente */}
          <div
            onClick={() => setDeleteType('hard')}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              deleteType === 'hard'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start">
              <Trash2
                className={`mt-1 ${deleteType === 'hard' ? 'text-red-600' : 'text-gray-400'}`}
                size={20}
              />
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  Eliminar Permanentemente
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  El producto será eliminado completamente de la base de datos. 
                  Esta acción <span className="font-semibold">NO se puede deshacer</span>.
                </p>
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ No disponible si el producto tiene ventas registradas
                </p>
              </div>
              <div className="ml-3">
                <input
                  type="radio"
                  checked={deleteType === 'hard'}
                  onChange={() => setDeleteType('hard')}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advertencia final */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800 text-center">
            {deleteType === 'soft' 
              ? 'El producto se desactivará pero podrás reactivarlo más tarde desde la lista de productos.'
              : '⚠️ Esta acción es irreversible. El producto será eliminado permanentemente.'}
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="mt-6 flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
            loading={loading}
            icon={deleteType === 'soft' ? Archive : Trash2}
            className="flex-1"
          >
            {deleteType === 'soft' ? 'Desactivar' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
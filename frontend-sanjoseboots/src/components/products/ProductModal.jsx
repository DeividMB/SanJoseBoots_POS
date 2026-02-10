import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Modal from '../common/Modal';
import ProductForm from './ProductForm';
import { productsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';

/**
 * ProductModal - Modal para crear/editar productos
 * 
 * Props:
 * - isOpen: Boolean que controla si el modal está visible
 * - onClose: Callback para cerrar el modal
 * - product: Objeto del producto completo (null para crear nuevo)
 * - onSuccess: Callback cuando se guarda exitosamente
 */
const ProductModal = ({ isOpen, onClose, product = null, onSuccess }) => {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!product;

  // Cargar datos del producto en modo edición
  useEffect(() => {
    const cargarProducto = async () => {
      if (!isOpen) {
        // Limpiar estado al cerrar
        setProductData(null);
        return;
      }

      if (product && product.ProductoID) {
        // Modo edición - cargar datos completos del producto
        try {
          setLoading(true);
          console.log('📦 Cargando producto ID:', product.ProductoID);
          
          const response = await productsAPI.getById(product.ProductoID);
          
          console.log('📦 Respuesta del servidor:', response.data);
          
          if (response.data && response.data.success) {
            setProductData(response.data.data);
            console.log('✅ Producto cargado:', response.data.data);
          } else {
            throw new Error('Formato de respuesta inválido');
          }
        } catch (error) {
          console.error('❌ Error al cargar producto:', error);
          toast.error('Error al cargar los datos del producto');
          onClose();
        } finally {
          setLoading(false);
        }
      } else {
        // Modo creación - no hay datos que cargar
        setProductData(null);
        console.log('➕ Modo creación - producto nuevo');
      }
    };

    cargarProducto();
  }, [isOpen, product]);

  const handleSuccess = (data) => {
    console.log('✅ Producto guardado exitosamente:', data);
    onClose();
    if (onSuccess) {
      onSuccess(data);
    }
  };

  const handleCancel = () => {
    console.log('❌ Cancelando formulario');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode 
                ? 'Modifica la información y variantes del producto' 
                : 'Complete todos los campos y agregue al menos una variante'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando datos del producto...</p>
              </div>
            </div>
          ) : (
            <ProductForm
              product={productData}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProductModal;
import { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import api from '../../api/axios';

/**
 * AddSupplierModal - Modal para agregar nuevos proveedores
 */
const AddSupplierModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    NombreProveedor: '',
    NombreContacto: '',
    Telefono: '',
    Email: '',
    Direccion: '',
    RFC: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.NombreProveedor.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }

    try {
      setLoading(true);

      // Endpoint para crear proveedor
      const response = await api.post('/suppliers', {
        ...formData,
        Activo: 1
      });

      if (response.data && response.data.success) {
        toast.success('Proveedor agregado exitosamente');
        
        // Limpiar formulario
        setFormData({
          NombreProveedor: '',
          NombreContacto: '',
          Telefono: '',
          Email: '',
          Direccion: '',
          RFC: ''
        });

        onClose();
        
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        throw new Error('Error al crear proveedor');
      }
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      toast.error(error.response?.data?.message || 'Error al agregar proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Building2 className="text-primary" size={20} />
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-bold text-gray-900">
                Agregar Proveedor
              </h2>
              <p className="text-sm text-gray-500">
                Completa la información del nuevo proveedor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Nombre del Proveedor */}
            <div>
              <Input
                label="Nombre del Proveedor *"
                value={formData.NombreProveedor}
                onChange={(e) => handleChange('NombreProveedor', e.target.value)}
                placeholder="Ej: Distribuidora de Calzado SA"
                required
              />
            </div>

            {/* Nombre de Contacto */}
            <div>
              <Input
                label="Nombre de Contacto"
                value={formData.NombreContacto}
                onChange={(e) => handleChange('NombreContacto', e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Teléfono y Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Teléfono"
                  value={formData.Telefono}
                  onChange={(e) => handleChange('Telefono', e.target.value)}
                  placeholder="449-123-4567"
                />
              </div>
              <div>
                <Input
                  label="Email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => handleChange('Email', e.target.value)}
                  placeholder="proveedor@ejemplo.com"
                />
              </div>
            </div>

            {/* RFC */}
            <div>
              <Input
                label="RFC"
                value={formData.RFC}
                onChange={(e) => handleChange('RFC', e.target.value.toUpperCase())}
                placeholder="XAXX010101000"
                maxLength={13}
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <textarea
                value={formData.Direccion}
                onChange={(e) => handleChange('Direccion', e.target.value)}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Calle, Número, Colonia, Ciudad..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
            >
              Agregar Proveedor
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddSupplierModal;
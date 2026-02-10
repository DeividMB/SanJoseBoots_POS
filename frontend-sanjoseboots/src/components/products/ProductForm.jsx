import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, AlertCircle, Package } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import AddSupplierModal from './AddSupplierModal';
import { productsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';

/**
 * ProductForm - Formulario reutilizable para crear/editar productos
 * 
 * Props:
 * - product: Objeto con datos del producto (para modo edición)
 * - onSuccess: Callback cuando se guarda exitosamente
 * - onCancel: Callback para cancelar operación
 */
const ProductForm = ({ product = null, onSuccess, onCancel }) => {
  const isEditMode = !!product;
  
  // Estado para las variantes
  const [variantes, setVariantes] = useState([]);
  const [nuevaVariante, setNuevaVariante] = useState({
    CodigoVariante: '',
    Color: '',
    Talla: '',
    Estilo: '',
    StockActual: 0,
    StockMinimo: 5,
    PrecioVenta: ''
  });

  // Estado para catálogos (categorías y proveedores)
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    defaultValues: {
      CodigoProducto: '',
      NombreProducto: '',
      Descripcion: '',
      CategoriaID: '',
      ProveedorID: '',
      PrecioBase: '',
      Activo: 1
    }
  });

  const codigoProducto = watch('CodigoProducto');
  const precioBase = watch('PrecioBase');

  // Cargar catálogos al montar el componente
  useEffect(() => {
    cargarCatalogos();
  }, []);

  // Cargar datos del producto en modo edición
  useEffect(() => {
    if (isEditMode && product) {
      console.log('📝 Cargando producto para editar:', product);
      
      reset({
        CodigoProducto: product.CodigoProducto || '',
        NombreProducto: product.NombreProducto || '',
        Descripcion: product.Descripcion || '',
        CategoriaID: product.CategoriaID?.toString() || '',
        ProveedorID: product.ProveedorID?.toString() || '',
        PrecioBase: product.PrecioBase?.toString() || '',
        Activo: product.Activo?.toString() || '1'
      });
      
      // Cargar variantes si existen
      if (product.variantes && product.variantes.length > 0) {
        console.log('📦 Cargando variantes:', product.variantes);
        setVariantes(product.variantes);
      }
    } else if (!isEditMode) {
      reset({
        CodigoProducto: '',
        NombreProducto: '',
        Descripcion: '',
        CategoriaID: '',
        ProveedorID: '',
        PrecioBase: '',
        Activo: 1
      });
      setVariantes([]);
    }
  }, [product, isEditMode, reset]);

  // Actualizar precio de venta cuando cambia el precio base
  useEffect(() => {
    if (precioBase && !nuevaVariante.PrecioVenta) {
      setNuevaVariante(prev => ({
        ...prev,
        PrecioVenta: precioBase
      }));
    }
  }, [precioBase]);

  // Cargar categorías y proveedores
  const cargarCatalogos = async () => {
    try {
      setLoadingCatalogos(true);
      
      // Usar los endpoints reales
      const [resCategorias, resProveedores] = await Promise.all([
        productsAPI.getCategories(),
        productsAPI.getSuppliers()
      ]);
      
      if (resCategorias.data?.success && resCategorias.data?.data) {
        setCategorias(resCategorias.data.data);
      }
      
      if (resProveedores.data?.success && resProveedores.data?.data) {
        setProveedores(resProveedores.data.data);
      }
      
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
      toast.error('Error al cargar categorías y proveedores');
      
      // Fallback con datos de ejemplo
      setCategorias([
        { CategoriaID: 1, NombreCategoria: 'Botas' },
        { CategoriaID: 2, NombreCategoria: 'Jeans' },
        { CategoriaID: 3, NombreCategoria: 'Cinturones' },
        { CategoriaID: 4, NombreCategoria: 'Sombreros' },
        { CategoriaID: 5, NombreCategoria: 'Accesorios' }
      ]);
      
      setProveedores([
        { ProveedorID: 1, NombreProveedor: 'Proveedor Principal' },
        { ProveedorID: 2, NombreProveedor: 'Proveedor Secundario' }
      ]);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  // Callback cuando se agrega un nuevo proveedor
  const handleSupplierAdded = async (newSupplier) => {
    // Recargar lista de proveedores
    await cargarCatalogos();
    
    // Seleccionar automáticamente el nuevo proveedor
    if (newSupplier && newSupplier.ProveedorID) {
      setValue('ProveedorID', newSupplier.ProveedorID.toString());
    }
  };

  // Generar código de variante automático
  const generarCodigoVariante = (color, talla) => {
    if (!codigoProducto || !color || !talla) return '';
    const colorAbrev = color.substring(0, 3).toUpperCase();
    return `${codigoProducto}-${colorAbrev}-${talla}`;
  };

  // Manejar cambios en campos de nueva variante
  const handleVarianteChange = (field, value) => {
    const updatedVariante = { ...nuevaVariante, [field]: value };
    
    // Auto-generar código de variante cuando cambia color o talla
    if (field === 'Color' || field === 'Talla') {
      updatedVariante.CodigoVariante = generarCodigoVariante(
        field === 'Color' ? value : nuevaVariante.Color,
        field === 'Talla' ? value : nuevaVariante.Talla
      );
    }
    
    setNuevaVariante(updatedVariante);
  };

  // Agregar nueva variante a la lista
  const agregarVariante = () => {
    // Validaciones
    if (!nuevaVariante.Color?.trim()) {
      toast.error('El color es obligatorio');
      return;
    }
    
    if (!nuevaVariante.Talla?.trim()) {
      toast.error('La talla es obligatoria');
      return;
    }
    
    if (!nuevaVariante.PrecioVenta || parseFloat(nuevaVariante.PrecioVenta) <= 0) {
      toast.error('El precio de venta debe ser mayor a 0');
      return;
    }
    
    if (parseInt(nuevaVariante.StockActual) < 0) {
      toast.error('El stock no puede ser negativo');
      return;
    }
    
    // Verificar duplicados (mismo color + talla)
    const existe = variantes.some(
      v => v.Color.toLowerCase() === nuevaVariante.Color.toLowerCase() &&
           v.Talla.toLowerCase() === nuevaVariante.Talla.toLowerCase()
    );
    
    if (existe) {
      toast.error('Ya existe una variante con ese color y talla');
      return;
    }
    
    // Generar código de variante si no existe
    const codigoVariante = nuevaVariante.CodigoVariante || 
      generarCodigoVariante(nuevaVariante.Color, nuevaVariante.Talla);
    
    // Agregar variante
    setVariantes([...variantes, { 
      ...nuevaVariante,
      CodigoVariante: codigoVariante,
      StockActual: parseInt(nuevaVariante.StockActual),
      StockMinimo: parseInt(nuevaVariante.StockMinimo),
      PrecioVenta: parseFloat(nuevaVariante.PrecioVenta)
    }]);
    
    // Limpiar formulario de variante
    setNuevaVariante({
      CodigoVariante: '',
      Color: '',
      Talla: '',
      Estilo: '',
      StockActual: 0,
      StockMinimo: 5,
      PrecioVenta: precioBase || ''
    });
    
    toast.success('Variante agregada');
  };

  // Eliminar variante
  const eliminarVariante = (index) => {
    const nuevasVariantes = variantes.filter((_, i) => i !== index);
    setVariantes(nuevasVariantes);
    toast.success('Variante eliminada');
  };

  // Actualizar stock de variante existente
  const actualizarStockVariante = (index, nuevoStock) => {
    const stock = parseInt(nuevoStock);
    if (stock < 0) {
      toast.error('El stock no puede ser negativo');
      return;
    }
    
    const nuevasVariantes = [...variantes];
    nuevasVariantes[index].StockActual = stock;
    setVariantes(nuevasVariantes);
  };

  // Calcular stock total
  const calcularStockTotal = () => {
    return variantes.reduce((total, v) => total + parseInt(v.StockActual || 0), 0);
  };

  // Enviar formulario
  const onSubmit = async (data) => {
    console.log('📤 Enviando formulario:', data);
    
    // Validar que haya al menos una variante
    if (variantes.length === 0) {
      toast.error('Debes agregar al menos una variante del producto');
      return;
    }
    
    try {
      setLoading(true);
      
      // Preparar datos para enviar
      const productData = {
        CodigoProducto: data.CodigoProducto,
        NombreProducto: data.NombreProducto,
        Descripcion: data.Descripcion || '',
        CategoriaID: parseInt(data.CategoriaID),
        ProveedorID: parseInt(data.ProveedorID),
        PrecioBase: parseFloat(data.PrecioBase),
        Activo: parseInt(data.Activo),
        variantes: variantes.map(v => ({
          CodigoVariante: v.CodigoVariante,
          Color: v.Color,
          Talla: v.Talla,
          Estilo: v.Estilo || null,
          PrecioVenta: parseFloat(v.PrecioVenta),
          StockActual: parseInt(v.StockActual),
          StockMinimo: parseInt(v.StockMinimo || 5),
          Activo: 1,
          // Incluir VarianteID solo en modo edición si existe
          ...(isEditMode && v.VarianteID ? { VarianteID: v.VarianteID } : {})
        }))
      };
      
      console.log('📦 Datos a enviar al backend:', productData);
      
      let response;
      if (isEditMode) {
        console.log('✏️ Actualizando producto ID:', product.ProductoID);
        response = await productsAPI.update(product.ProductoID, productData);
        toast.success('Producto actualizado exitosamente');
      } else {
        console.log('➕ Creando nuevo producto');
        response = await productsAPI.create(productData);
        toast.success('Producto creado exitosamente');
      }
      
      console.log('✅ Respuesta del backend:', response);
      
      // Callback de éxito
      if (onSuccess) {
        onSuccess(response.data);
      }
      
    } catch (error) {
      console.error('❌ Error al guardar producto:', error);
      console.error('📋 Detalles del error:', error.response?.data);
      const mensaje = error.response?.data?.message || 'Error al guardar el producto';
      toast.error(mensaje);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar indicador de stock
  const renderStockIndicator = (stock) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Sin Stock
        </span>
      );
    } else if (stock < 5) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Stock Bajo
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          En Stock
        </span>
      );
    }
  };

  if (loadingCatalogos) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información Básica */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información Básica
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código de Producto */}
          <div>
            <Input
              label="Código de Producto *"
              {...register('CodigoProducto', {
                required: 'El código es obligatorio',
                pattern: {
                  value: /^[A-Z0-9-]+$/,
                  message: 'Solo mayúsculas, números y guiones'
                }
              })}
              error={errors.CodigoProducto?.message}
              placeholder="BOT-001"
              disabled={isEditMode}
            />
            {isEditMode && (
              <p className="text-xs text-gray-500 mt-1">
                El código no se puede modificar
              </p>
            )}
          </div>

          {/* Nombre del Producto */}
          <div>
            <Input
              label="Nombre del Producto *"
              {...register('NombreProducto', {
                required: 'El nombre es obligatorio',
                minLength: {
                  value: 3,
                  message: 'Mínimo 3 caracteres'
                }
              })}
              error={errors.NombreProducto?.message}
              placeholder="Botas Vaqueras Clásicas"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              {...register('CategoriaID', {
                required: 'La categoría es obligatoria'
              })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${
                errors.CategoriaID ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map(cat => (
                <option key={cat.CategoriaID} value={cat.CategoriaID}>
                  {cat.NombreCategoria}
                </option>
              ))}
            </select>
            {errors.CategoriaID && (
              <p className="text-red-500 text-xs mt-1">{errors.CategoriaID.message}</p>
            )}
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor *
            </label>
            <div className="flex gap-2">
              <select
                {...register('ProveedorID', {
                  required: 'El proveedor es obligatorio'
                })}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${
                  errors.ProveedorID ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map(prov => (
                  <option key={prov.ProveedorID} value={prov.ProveedorID}>
                    {prov.NombreProveedor}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                title="Agregar nuevo proveedor"
              >
                <Plus size={18} />
                Nuevo
              </button>
            </div>
            {errors.ProveedorID && (
              <p className="text-red-500 text-xs mt-1">{errors.ProveedorID.message}</p>
            )}
          </div>

          {/* Precio Base */}
          <div>
            <Input
              label="Precio Base *"
              type="number"
              step="0.01"
              {...register('PrecioBase', {
                required: 'El precio es obligatorio',
                min: {
                  value: 0.01,
                  message: 'El precio debe ser mayor a 0'
                }
              })}
              error={errors.PrecioBase?.message}
              placeholder="1500.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se usará como precio de venta por defecto
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              {...register('Activo')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Los productos inactivos no aparecen en el POS
            </p>
          </div>
        </div>

        {/* Descripción */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            {...register('Descripcion')}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Descripción detallada del producto..."
          />
        </div>
      </div>

      {/* Gestión de Variantes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Variantes del Producto
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Agrega colores, tallas, precios y stock disponible
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Stock Total</p>
            <p className="text-2xl font-bold text-primary">
              {calcularStockTotal()}
            </p>
          </div>
        </div>

        {/* Formulario para agregar variante */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Agregar Nueva Variante
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Color *</label>
              <input
                type="text"
                placeholder="Negro"
                value={nuevaVariante.Color}
                onChange={(e) => handleVarianteChange('Color', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Talla *</label>
              <input
                type="text"
                placeholder="27"
                value={nuevaVariante.Talla}
                onChange={(e) => handleVarianteChange('Talla', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Estilo</label>
              <input
                type="text"
                placeholder="Casual"
                value={nuevaVariante.Estilo}
                onChange={(e) => handleVarianteChange('Estilo', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio *</label>
              <input
                type="number"
                placeholder="1500"
                min="0"
                step="0.01"
                value={nuevaVariante.PrecioVenta}
                onChange={(e) => handleVarianteChange('PrecioVenta', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                placeholder="10"
                min="0"
                value={nuevaVariante.StockActual}
                onChange={(e) => handleVarianteChange('StockActual', e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                placeholder="Auto"
                value={nuevaVariante.CodigoVariante}
                readOnly
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <Button
                type="button"
                onClick={agregarVariante}
                variant="primary"
                icon={Plus}
                className="w-full h-[46px]"
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla de variantes */}
        {variantes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Color
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Talla
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estilo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variantes.map((variante, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {variante.Color}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {variante.Talla}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {variante.Estilo || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(variante.PrecioVenta).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <input
                        type="number"
                        min="0"
                        value={variante.StockActual}
                        onChange={(e) => actualizarStockVariante(index, e.target.value)}
                        className="w-24 px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                      {variante.CodigoVariante}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {renderStockIndicator(variante.StockActual)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => eliminarVariante(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Package size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 text-sm">
              No hay variantes agregadas. Agrega al menos una variante para continuar.
            </p>
          </div>
        )}
      </div>

      {/* Advertencias */}
      {variantes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Variante Requerida
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Debes agregar al menos una variante (color, talla, precio y stock) para poder guardar el producto.
            </p>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || variantes.length === 0}
          loading={loading}
        >
          {isEditMode ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
      </div>

      {/* Modal para agregar proveedor */}
      <AddSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleSupplierAdded}
      />
    </form>
  );
};

export default ProductForm;
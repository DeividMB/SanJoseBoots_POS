import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, AlertCircle, Package } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import AddSupplierModal from './AddSupplierModal';
import { productsAPI } from '../../api/endpoints';
import toast from 'react-hot-toast';

const ProductForm = ({ product = null, onSuccess, onCancel }) => {
  const isEditMode = !!product;
  
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

  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

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

  useEffect(() => { cargarCatalogos(); }, []);

  useEffect(() => {
    if (isEditMode && product) {
      reset({
        CodigoProducto: product.CodigoProducto || '',
        NombreProducto: product.NombreProducto || '',
        Descripcion: product.Descripcion || '',
        CategoriaID: product.CategoriaID?.toString() || '',
        ProveedorID: product.ProveedorID?.toString() || '',
        PrecioBase: product.PrecioBase?.toString() || '',
        Activo: product.Activo?.toString() || '1'
      });
      if (product.variantes?.length > 0) setVariantes(product.variantes);
    } else if (!isEditMode) {
      reset({ CodigoProducto: '', NombreProducto: '', Descripcion: '', CategoriaID: '', ProveedorID: '', PrecioBase: '', Activo: 1 });
      setVariantes([]);
    }
  }, [product, isEditMode, reset]);

  useEffect(() => {
    if (precioBase && !nuevaVariante.PrecioVenta) {
      setNuevaVariante(prev => ({ ...prev, PrecioVenta: precioBase }));
    }
  }, [precioBase]);

  const cargarCatalogos = async () => {
    try {
      setLoadingCatalogos(true);
      const [resCategorias, resProveedores] = await Promise.all([
        productsAPI.getCategories(),
        productsAPI.getSuppliers()
      ]);
      if (resCategorias.data?.success) setCategorias(resCategorias.data.data);
      if (resProveedores.data?.success) setProveedores(resProveedores.data.data);
    } catch (error) {
      toast.error('Error al cargar categorías y proveedores');
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

  const handleSupplierAdded = async (newSupplier) => {
    await cargarCatalogos();
    if (newSupplier?.ProveedorID) setValue('ProveedorID', newSupplier.ProveedorID.toString());
  };

  const generarCodigoVariante = (color, talla) => {
    if (!codigoProducto || !color || !talla) return '';
    return `${codigoProducto}-${color.substring(0, 3).toUpperCase()}-${talla}`;
  };

  const handleVarianteChange = (field, value) => {
    const updated = { ...nuevaVariante, [field]: value };
    if (field === 'Color' || field === 'Talla') {
      updated.CodigoVariante = generarCodigoVariante(
        field === 'Color' ? value : nuevaVariante.Color,
        field === 'Talla' ? value : nuevaVariante.Talla
      );
    }
    setNuevaVariante(updated);
  };

  const agregarVariante = () => {
    if (!nuevaVariante.Color?.trim())  return toast.error('El color es obligatorio');
    if (!nuevaVariante.Talla?.trim())  return toast.error('La talla es obligatoria');
    if (!nuevaVariante.PrecioVenta || parseFloat(nuevaVariante.PrecioVenta) <= 0)
      return toast.error('El precio de venta debe ser mayor a 0');
    if (parseInt(nuevaVariante.StockActual) < 0)
      return toast.error('El stock no puede ser negativo');

    const existe = variantes.some(
      v => v.Color.toLowerCase() === nuevaVariante.Color.toLowerCase() &&
           v.Talla.toLowerCase() === nuevaVariante.Talla.toLowerCase()
    );
    if (existe) return toast.error('Ya existe una variante con ese color y talla');

    const codigoVariante = nuevaVariante.CodigoVariante ||
      generarCodigoVariante(nuevaVariante.Color, nuevaVariante.Talla);

    setVariantes([...variantes, {
      ...nuevaVariante,
      CodigoVariante: codigoVariante,
      StockActual: parseInt(nuevaVariante.StockActual),
      StockMinimo: parseInt(nuevaVariante.StockMinimo),
      PrecioVenta: parseFloat(nuevaVariante.PrecioVenta)
    }]);

    setNuevaVariante({ CodigoVariante: '', Color: '', Talla: '', Estilo: '', StockActual: 0, StockMinimo: 5, PrecioVenta: precioBase || '' });
    toast.success('Variante agregada');
  };

  const eliminarVariante = (index) => {
    setVariantes(variantes.filter((_, i) => i !== index));
    toast.success('Variante eliminada');
  };

  const actualizarStockVariante = (index, nuevoStock) => {
    const stock = parseInt(nuevoStock);
    if (stock < 0) return toast.error('El stock no puede ser negativo');
    const nuevas = [...variantes];
    nuevas[index].StockActual = stock;
    setVariantes(nuevas);
  };

  const calcularStockTotal = () =>
    variantes.reduce((total, v) => total + parseInt(v.StockActual || 0), 0);

  const onSubmit = async (data) => {
    if (variantes.length === 0)
      return toast.error('Debes agregar al menos una variante del producto');

    try {
      setLoading(true);
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
          ...(isEditMode && v.VarianteID ? { VarianteID: v.VarianteID } : {})
        }))
      };

      let response;
      if (isEditMode) {
        response = await productsAPI.update(product.ProductoID, productData);
        toast.success('Producto actualizado exitosamente');
      } else {
        response = await productsAPI.create(productData);
        toast.success('Producto creado exitosamente');
      }

      if (onSuccess) onSuccess(response.data);
    } catch (error) {
      const mensaje = error.response?.data?.message || 'Error al guardar el producto';
      toast.error(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const renderStockIndicator = (stock) => {
    if (stock === 0)
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Sin Stock</span>;
    if (stock < 5)
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Stock Bajo</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">En Stock</span>;
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

      {/* ── Información Básica ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Código de Producto *"
              {...register('CodigoProducto', {
                required: 'El código es obligatorio',
                pattern: { value: /^[A-Z0-9-]+$/, message: 'Solo mayúsculas, números y guiones' }
              })}
              error={errors.CodigoProducto?.message}
              placeholder="BOT-001"
              disabled={isEditMode}
            />
            {isEditMode && <p className="text-xs text-gray-500 mt-1">El código no se puede modificar</p>}
          </div>

          <div>
            <Input
              label="Nombre del Producto *"
              {...register('NombreProducto', {
                required: 'El nombre es obligatorio',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' }
              })}
              error={errors.NombreProducto?.message}
              placeholder="Botas Vaqueras Clásicas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select
              {...register('CategoriaID', { required: 'La categoría es obligatoria' })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${errors.CategoriaID ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map(cat => (
                <option key={cat.CategoriaID} value={cat.CategoriaID}>{cat.NombreCategoria}</option>
              ))}
            </select>
            {errors.CategoriaID && <p className="text-red-500 text-xs mt-1">{errors.CategoriaID.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
            <div className="flex gap-2">
              <select
                {...register('ProveedorID', { required: 'El proveedor es obligatorio' })}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent ${errors.ProveedorID ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map(prov => (
                  <option key={prov.ProveedorID} value={prov.ProveedorID}>{prov.NombreProveedor}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus size={18} /> Nuevo
              </button>
            </div>
            {errors.ProveedorID && <p className="text-red-500 text-xs mt-1">{errors.ProveedorID.message}</p>}
          </div>

          <div>
            <Input
              label="Precio Base *"
              type="number"
              step="0.01"
              {...register('PrecioBase', {
                required: 'El precio es obligatorio',
                min: { value: 0.01, message: 'El precio debe ser mayor a 0' }
              })}
              error={errors.PrecioBase?.message}
              placeholder="1500.00"
            />
            <p className="text-xs text-gray-500 mt-1">Se usará como precio de venta por defecto</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
            <select
              {...register('Activo')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Los productos inactivos no aparecen en el POS</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            {...register('Descripcion')}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Descripción detallada del producto..."
          />
        </div>
      </div>

      {/* ── Variantes ── */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Variantes del Producto</h3>
            <p className="text-sm text-gray-500 mt-1">Agrega colores, tallas, precios y stock disponible</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Stock Total</p>
            <p className="text-2xl font-bold text-primary">{calcularStockTotal()}</p>
          </div>
        </div>

        {/* ── Formulario nueva variante: 2 filas de 3 campos ── */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Agregar Nueva Variante</h4>

          {/* Fila 1: Color · Talla · Estilo */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color *</label>
              <input
                type="text"
                placeholder="Negro"
                value={nuevaVariante.Color}
                onChange={e => handleVarianteChange('Color', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Talla *</label>
              <input
                type="text"
                placeholder="27"
                value={nuevaVariante.Talla}
                onChange={e => handleVarianteChange('Talla', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estilo</label>
              <input
                type="text"
                placeholder="Casual"
                value={nuevaVariante.Estilo}
                onChange={e => handleVarianteChange('Estilo', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Fila 2: Precio · Stock · Código (auto) + botón */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio *</label>
              <input
                type="number"
                placeholder="1500"
                min="0"
                step="0.01"
                value={nuevaVariante.PrecioVenta}
                onChange={e => handleVarianteChange('PrecioVenta', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock *</label>
              <input
                type="number"
                placeholder="10"
                min="0"
                value={nuevaVariante.StockActual}
                onChange={e => handleVarianteChange('StockActual', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código (auto)</label>
              <input
                type="text"
                value={nuevaVariante.CodigoVariante}
                readOnly
                placeholder="Se genera solo"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={agregarVariante}
            variant="primary"
            icon={Plus}
            className="w-full"
          >
            Agregar Variante
          </Button>
        </div>

        {/* ── Tabla de variantes ── */}
        {variantes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Color', 'Talla', 'Estilo', 'Precio', 'Stock', 'Código', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variantes.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{v.Color}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{v.Talla}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{v.Estilo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${parseFloat(v.PrecioVenta).toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={v.StockActual}
                        onChange={e => actualizarStockVariante(i, e.target.value)}
                        className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{v.CodigoVariante}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{renderStockIndicator(v.StockActual)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => eliminarVariante(i)} className="text-red-600 hover:text-red-800 transition-colors">
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
            <p className="text-gray-500 text-sm">No hay variantes. Agrega al menos una para continuar.</p>
          </div>
        )}
      </div>

      {/* Advertencia sin variantes */}
      {variantes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-yellow-800">Variante Requerida</p>
            <p className="text-sm text-yellow-700 mt-1">
              Debes agregar al menos una variante (color, talla, precio y stock) para poder guardar el producto.
            </p>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={loading || variantes.length === 0} loading={loading}>
          {isEditMode ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
      </div>

      <AddSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleSupplierAdded}
      />
    </form>
  );
};

export default ProductForm;
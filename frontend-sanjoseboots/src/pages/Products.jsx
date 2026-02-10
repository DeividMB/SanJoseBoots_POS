import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Package, Edit, Trash2, RefreshCw } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ProductModal from '../components/products/ProductModal';
import DeleteConfirmModal from '../components/products/DeleteConfirmModal';
import { productsAPI } from '../api/endpoints';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'inactive'
  
  // Estados para modales - CORREGIDO
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Producto completo, no solo ID
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      
      console.log('Products response:', response.data);
      
      // Tu backend devuelve: { success: true, data: [...] }
      let productsList = [];
      
      if (response.data.success && Array.isArray(response.data.data)) {
        productsList = response.data.data;
      } else if (Array.isArray(response.data)) {
        productsList = response.data;
      }
      
      console.log('Products list:', productsList);
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtro local (búsqueda y estado)
  const filteredProducts = products.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    const nombre = product.NombreProducto?.toLowerCase() || '';
    const codigo = product.CodigoProducto?.toLowerCase() || '';
    const categoria = product.NombreCategoria?.toLowerCase() || '';
    
    // Filtro por búsqueda
    const matchSearch = nombre.includes(searchLower) || 
                       codigo.includes(searchLower) || 
                       categoria.includes(searchLower);
    
    // Filtro por estado activo/inactivo
    const matchFilter = filterActive === 'all' || 
                       (filterActive === 'active' && product.Activo === 1) ||
                       (filterActive === 'inactive' && product.Activo === 0);
    
    return matchSearch && matchFilter;
  });

  // CORREGIDO: Abrir modal para crear nuevo producto
  const handleNuevoProducto = () => {
    console.log('➕ Abriendo modal para CREAR producto');
    setSelectedProduct(null); // null = modo crear
    setIsProductModalOpen(true);
  };

  // CORREGIDO: Abrir modal para editar producto
  const handleEditarProducto = (product) => {
    console.log('✏️ Abriendo modal para EDITAR producto:', product);
    setSelectedProduct(product); // Pasar el producto COMPLETO
    setIsProductModalOpen(true);
  };

  // Abrir modal para eliminar producto
  const handleEliminarProducto = (product) => {
    console.log('🗑️ Abriendo modal para ELIMINAR producto:', product);
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Callback cuando se guarda un producto exitosamente
  const handleProductSaved = () => {
    console.log('✅ Producto guardado, recargando lista...');
    fetchProducts();
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  // Callback cuando se elimina un producto exitosamente
  const handleProductDeleted = () => {
    console.log('✅ Producto eliminado, recargando lista...');
    fetchProducts();
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  // Callback cuando se cierra el modal sin guardar
  const handleModalClose = () => {
    console.log('❌ Modal cerrado sin guardar');
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  // Renderizar badge de estado activo/inactivo
  const renderEstadoBadge = (activo) => {
    if (activo === 1) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Activo
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Inactivo
        </span>
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Cargando productos..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Productos</h1>
            <p className="text-gray-600">Gestiona tu inventario de productos</p>
          </div>
          <Button variant="primary" icon={Plus} onClick={handleNuevoProducto}>
            Nuevo Producto
          </Button>
        </div>

        {/* Search & Filters */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            
            {/* Filtro por estado */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            <Button 
              variant="outline" 
              icon={RefreshCw} 
              onClick={fetchProducts}
              disabled={loading}
            >
              Refrescar
            </Button>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              <p className="text-sm text-gray-600">Total Productos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {products.filter(p => p.Activo === 1).length}
              </p>
              <p className="text-sm text-gray-600">Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {products.filter(p => p.Activo === 0).length}
              </p>
              <p className="text-sm text-gray-600">Inactivos</p>
            </div>
          </div>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length === 0 ? (
            <Card className="col-span-full">
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || filterActive !== 'all' 
                    ? 'No se encontraron productos' 
                    : 'No hay productos registrados'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterActive !== 'all'
                    ? 'Intenta con otros términos de búsqueda o filtros'
                    : 'Comienza agregando tu primer producto al inventario'}
                </p>
                {!searchQuery && filterActive === 'all' && (
                  <Button variant="primary" icon={Plus} onClick={handleNuevoProducto}>
                    Agregar Primer Producto
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.ProductoID} className="hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {product.CodigoProducto}
                        </span>
                        {renderEstadoBadge(product.Activo)}
                      </div>
                      <h3 className="font-semibold text-primary text-lg">
                        {product.NombreProducto}
                      </h3>
                      {product.Descripcion && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {product.Descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Categoría</p>
                      <p className="text-sm font-medium">{product.NombreCategoria}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Precio Base</p>
                      <p className="text-lg font-bold text-accent">
                        {formatCurrency(parseFloat(product.PrecioBase))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Stock Total</p>
                      <p className={`text-lg font-bold ${
                        parseInt(product.StockTotal) > 20 
                          ? 'text-green-600' 
                          : parseInt(product.StockTotal) > 10 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                      }`}>
                        {product.StockTotal} unidades
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Variantes</p>
                      <p className="text-lg font-medium">{product.TotalVariantes}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Proveedor:</span>
                      <span className="font-medium">{product.NombreProveedor}</span>
                    </div>
                  </div>

                  {/* Botones de Acción - CORREGIDO */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      icon={Edit}
                      className="flex-1"
                      onClick={() => handleEditarProducto(product)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      className="flex-1"
                      onClick={() => handleEliminarProducto(product)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredProducts.length > 0 && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Productos</p>
                <p className="text-2xl font-bold text-primary">{filteredProducts.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Stock Total</p>
                <p className="text-2xl font-bold text-primary">
                  {filteredProducts.reduce((sum, p) => sum + parseInt(p.StockTotal || 0), 0)} unidades
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Total del Inventario</p>
                <p className="text-2xl font-bold text-accent">
                  {formatCurrency(
                    filteredProducts.reduce((sum, p) => 
                      sum + (parseFloat(p.PrecioBase) * parseInt(p.StockTotal || 0)), 0
                    )
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modal de Producto - CORREGIDO */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleModalClose}
        product={selectedProduct}  
        onSuccess={handleProductSaved}
      />

      {/* Modal de Eliminación */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        product={productToDelete}
        onSuccess={handleProductDeleted}
      />
    </Layout>
  );
};

export default Products;
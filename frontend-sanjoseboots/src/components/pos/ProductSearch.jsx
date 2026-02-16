import React, { useState, useEffect } from 'react';
import { Search, Barcode, Package, X } from 'lucide-react';
import { productsAPI } from '../../api/endpoints';
import { formatCurrency } from '../../utils/formatters';

const ProductSearch = ({ onAddToCart }) => {
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar todos los productos al montar
  useEffect(() => {
    loadAllProducts();
  }, []);

  // Filtrar cuando cambia la query
  useEffect(() => {
    if (query.length >= 2) {
      filterProducts();
    } else {
      setFilteredProducts([]);
      setSelectedProduct(null);
    }
  }, [query]);

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      
      let productsList = [];
      if (response.data.success && Array.isArray(response.data.data)) {
        productsList = response.data.data;
      }
      
      setAllProducts(productsList);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    const searchLower = query.toLowerCase();
    const filtered = allProducts.filter(product => {
      const nombre = product.NombreProducto?.toLowerCase() || '';
      const codigo = product.CodigoProducto?.toLowerCase() || '';
      return nombre.includes(searchLower) || codigo.includes(searchLower);
    });
    setFilteredProducts(filtered.slice(0, 10));
  };

  // Obtener variantes de un producto específico
  const loadProductVariants = async (productId) => {
    try {
      const response = await productsAPI.getById(productId);
      
      if (response.data.success && response.data.data) {
        setSelectedProduct(response.data.data);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  const handleSelectProduct = (product) => {
    // Si el producto tiene variantes, cargarlas
    if (parseInt(product.TotalVariantes) > 1) {
      loadProductVariants(product.ProductoID);
      setFilteredProducts([]); // Limpiar búsqueda
    } else {
      // Si solo tiene una variante, agregarlo directamente
      loadProductVariants(product.ProductoID);
    }
  };

  const handleSelectVariant = (variant) => {
    const normalizedProduct = {
      id: variant.VarianteID,
      product_name: selectedProduct.NombreProducto,
      sku: variant.CodigoVariante || variant.VarianteID,
      price: parseFloat(variant.PrecioVenta),
      stock: parseInt(variant.StockActual),
      color: variant.Color || 'N/A',
      size: variant.Talla || 'N/A',
    };
    
    onAddToCart(normalizedProduct);
    setQuery('');
    setSelectedProduct(null);
    setFilteredProducts([]);
  };

  const handleCloseVariants = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o código de producto..."
          className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-lg"
          autoFocus
          disabled={selectedProduct !== null}
        />
        <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-accent" />
      </div>

      {/* Contenedor de resultados */}
      <div className="flex-1 overflow-y-auto">
        {/* Results Dropdown - Productos */}
        {filteredProducts.length > 0 && !selectedProduct && (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700">
                {filteredProducts.length} producto(s) encontrado(s)
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.ProductoID}
                  onClick={() => handleSelectProduct(product)}
                  className="w-full p-4 hover:bg-accent/10 transition-colors border-b border-gray-100 last:border-0 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary">{product.NombreProducto}</h4>
                      <p className="text-sm text-gray-600">{product.NombreCategoria}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-500">
                          Stock Total: <span className={parseInt(product.StockTotal) > 5 ? 'text-green-600' : 'text-red-600'}>
                            {product.StockTotal} unidades
                          </span>
                        </p>
                        <p className="text-xs text-blue-600">
                          {product.TotalVariantes} variante(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold text-accent">
                        {formatCurrency(parseFloat(product.PrecioBase))}
                      </p>
                      <p className="text-xs text-gray-500">Código: {product.CodigoProducto}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selector de Variantes */}
        {selectedProduct && (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{selectedProduct.NombreProducto}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedProduct.NombreCategoria}</p>
                  <p className="text-xs text-gray-500 mt-1">Código: {selectedProduct.CodigoProducto}</p>
                </div>
                <button
                  onClick={handleCloseVariants}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Lista de Variantes */}
            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Selecciona la variante a agregar al carrito:
              </p>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedProduct.variantes && selectedProduct.variantes.length > 0 ? (
                  selectedProduct.variantes.map((variant) => {
                    const stockActual = parseInt(variant.StockActual);
                    const stockMinimo = parseInt(variant.StockMinimo);
                    const sinStock = stockActual <= 0;
                    const stockBajo = stockActual > 0 && stockActual <= stockMinimo;
                    
                    return (
                      <button
                        key={variant.VarianteID}
                        onClick={() => !sinStock && handleSelectVariant(variant)}
                        disabled={sinStock}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          sinStock
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {variant.Color && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                  {variant.Color}
                                </span>
                              )}
                              {variant.Talla && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                  Talla {variant.Talla}
                                </span>
                              )}
                              {variant.Estilo && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                                  {variant.Estilo}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-gray-600">
                                SKU: <span className="font-mono">{variant.CodigoVariante}</span>
                              </p>
                              
                              {/* Indicador de Stock */}
                              {sinStock ? (
                                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                                  ❌ Sin Stock
                                </span>
                              ) : stockBajo ? (
                                <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                  ⚠️ Stock Bajo: {stockActual}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                  ✓ Stock: {stockActual}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <p className="text-xl font-bold text-accent">
                              {formatCurrency(parseFloat(variant.PrecioVenta))}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay variantes disponibles para este producto</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Estados de carga y vacío */}
        {loading && (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando productos...</p>
          </div>
        )}

        {query.length >= 2 && filteredProducts.length === 0 && !loading && !selectedProduct && (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-gray-500 font-medium">No se encontraron productos</p>
            <p className="text-sm text-gray-400 mt-1">Intenta con otros términos de búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSearch;
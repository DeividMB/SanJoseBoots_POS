import React, { useState, useEffect } from 'react';
import { Search, Barcode } from 'lucide-react';
import { productsAPI } from '../../api/endpoints';
import { formatCurrency } from '../../utils/formatters';

const ProductSearch = ({ onAddToCart }) => {
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar todos los productos al montar el componente
  useEffect(() => {
    loadAllProducts();
  }, []);

  // Filtrar localmente cuando cambia la query
  useEffect(() => {
    if (query.length >= 2) {
      filterProducts();
    } else {
      setFilteredProducts([]);
    }
  }, [query]);

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      
      // Tu backend devuelve: { success: true, data: [...] }
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
    setFilteredProducts(filtered.slice(0, 10)); // Limitar a 10 resultados
  };

  const handleSelectProduct = (product) => {
    // Convertir el formato del backend al formato que espera el POS
    const normalizedProduct = {
      id: product.ProductoID,
      product_name: product.NombreProducto,
      sku: product.CodigoProducto,
      price: parseFloat(product.PrecioBase),
      stock: parseInt(product.StockTotal),
      color: product.NombreCategoria, // Temporal: usar categoría como color
      size: 'Estándar', // Temporal: talla estándar
    };
    
    onAddToCart(normalizedProduct);
    setQuery('');
    setFilteredProducts([]);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o código de producto..."
          className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-lg"
          autoFocus
        />
        <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-accent" />
      </div>

      {/* Results Dropdown */}
      {filteredProducts.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto custom-scrollbar z-10">
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
                  <p className="text-xs text-gray-500 mt-1">
                    Stock: <span className={parseInt(product.StockTotal) > 5 ? 'text-green-600' : 'text-red-600'}>
                      {product.StockTotal} unidades
                    </span>
                  </p>
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
      )}

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-center">
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      )}

      {query.length >= 2 && filteredProducts.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-center">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
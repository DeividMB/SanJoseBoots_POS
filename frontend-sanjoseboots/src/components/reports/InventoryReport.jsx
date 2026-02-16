// ============================================
// COMPONENTE - REPORTE DE INVENTARIO
// frontend/src/components/reports/InventoryReport.jsx
// ============================================

import { useState, useEffect } from 'react';
import { Download, Filter, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const InventoryReport = () => {
  const [inventario, setInventario] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/v1/products/categories/list');
      if (response.data.success) {
        setCategorias(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error al cargar categorías:', error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryId) params.categoryId = categoryId;
      if (lowStockOnly) params.lowStockOnly = true;

      const response = await axios.get('/api/v1/reports/inventory', { params });
      
      if (response.data.success) {
        setInventario(response.data.data);
        console.log('✅ Inventario cargado:', response.data.data.length);
      }
    } catch (error) {
      console.error('❌ Error al cargar inventario:', error);
      toast.error('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchInventory();
  };

  const handleExportExcel = async () => {
    try {
      const params = {};
      if (categoryId) params.categoryId = categoryId;
      if (lowStockOnly) params.lowStockOnly = true;

      const response = await axios.get('/reports/export/inventory', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_inventario.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Inventario exportado exitosamente');
    } catch (error) {
      console.error('❌ Error al exportar:', error);
      toast.error('Error al exportar el inventario');
    }
  };

  // Calcular totales
  const totalVariantes = inventario.length;
  const totalStock = inventario.reduce((sum, item) => sum + item.StockActual, 0);
  const valorTotal = inventario.reduce((sum, item) => sum + item.ValorStock, 0);
  const bajoStock = inventario.filter(item => item.EstadoStock === 'Stock Bajo').length;
  const sinStock = inventario.filter(item => item.EstadoStock === 'Sin Stock').length;

  const getStockBadgeColor = (estado) => {
    switch (estado) {
      case 'Sin Stock':
        return 'bg-red-100 text-red-800';
      case 'Stock Bajo':
        return 'bg-yellow-100 text-yellow-800';
      case 'Stock Medio':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Variantes</p>
          <p className="text-2xl font-bold text-blue-900">{totalVariantes}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Stock Total</p>
          <p className="text-2xl font-bold text-green-900">{totalStock}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Valor Total</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(valorTotal)}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">Stock Bajo</p>
          <p className="text-2xl font-bold text-yellow-900">{bajoStock}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Sin Stock</p>
          <p className="text-2xl font-bold text-red-900">{sinStock}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-700" />
            <span className="text-gray-700 font-medium">Filtros</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Aplicar
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todas</option>
              {categorias.map((cat) => (
                <option key={cat.CategoriaID} value={cat.CategoriaID}>
                  {cat.NombreCategoria}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Solo productos con stock bajo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color/Talla</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Mín</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventario.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                inventario.map((item) => (
                  <tr key={item.VarianteID} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.CodigoProducto}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.NombreProducto}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.Categoria}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.CodigoVariante}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.Color} / {item.Talla}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(item.PrecioVenta)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-semibold ${
                        item.StockActual === 0 ? 'text-red-600' :
                        item.StockActual <= item.StockMinimo ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {item.StockActual}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.StockMinimo}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(item.ValorStock)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStockBadgeColor(item.EstadoStock)}`}>
                        {item.EstadoStock}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryReport;
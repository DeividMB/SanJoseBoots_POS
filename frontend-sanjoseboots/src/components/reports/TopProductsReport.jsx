// ============================================
// COMPONENTE - TOP PRODUCTOS VENDIDOS
// frontend/src/components/reports/TopProductsReport.jsx
// ============================================

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import 'react-datepicker/dist/react-datepicker.css';

const TopProductsReport = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchCategories();
    fetchTopProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      // ✅ CORRECTO: axios ya tiene /api/v1/ así que solo ponemos la ruta
      const response = await axios.get('/products/categories/list');
      if (response.data.success) {
        setCategorias(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error al cargar categorías:', error);
    }
  };

  const fetchTopProducts = async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');
      if (categoryId) params.categoryId = categoryId;

      // ✅ CORRECTO: /reports-analytics/top-products (sin /api/v1/)
      const response = await axios.get('/reports-analytics/top-products', { params });
      
      if (response.data.success) {
        setProductos(response.data.data);
        console.log('✅ Top productos cargados:', response.data.data.length);
      }
    } catch (error) {
      console.error('❌ Error al cargar top productos:', error);
      toast.error('Error al cargar los productos más vendidos');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchTopProducts();
  };

  // Preparar datos para gráfica
  const chartData = productos.slice(0, 10).map((producto, index) => ({
    nombre: `${producto.NombreProducto.substring(0, 20)}...`,
    cantidad: producto.CantidadVendida,
    ingreso: producto.IngresoTotal
  }));

  return (
    <div className="space-y-6">
      {/* Header con icono */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
        <Trophy className="w-8 h-8 text-yellow-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-800">Top Productos Más Vendidos</h2>
          <p className="text-sm text-gray-600">Ranking de productos por cantidad vendida</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              dateFormat="dd/MM/yyyy"
              locale={es}
              placeholderText="Seleccionar fecha"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              dateFormat="dd/MM/yyyy"
              locale={es}
              placeholderText="Seleccionar fecha"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mostrar Top
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Gráfica */}
      {!loading && productos.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Gráfica de Ventas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'ingreso') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="cantidad" fill="#3b82f6" name="Cantidad Vendida" />
              <Bar dataKey="ingreso" fill="#10b981" name="Ingreso Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Ranking</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Variante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Cantidad Vendida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Ingreso Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Num. Ventas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Precio Prom.</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron productos vendidos
                  </td>
                </tr>
              ) : (
                productos.map((producto, index) => (
                  <tr key={producto.ProductoID + '-' + producto.Color + '-' + producto.Talla} 
                      className={`hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-bold">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                        {index === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
                        {index === 2 && <Trophy className="w-5 h-5 text-orange-600" />}
                        <span className={index < 3 ? 'text-lg' : ''}>{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {producto.NombreProducto}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {producto.NombreCategoria}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {producto.Color} / {producto.Talla}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-bold text-blue-600 text-lg">
                        {producto.CantidadVendida}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {formatCurrency(producto.IngresoTotal)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {producto.NumeroVentas}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatCurrency(producto.PrecioPromedio)}
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

export default TopProductsReport;
// ============================================
// COMPONENTE - VENTAS POR PERÍODO
// frontend/src/components/reports/PeriodSalesReport.jsx
// ============================================

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import 'react-datepicker/dist/react-datepicker.css';

const PeriodSalesReport = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [groupBy, setGroupBy] = useState('DIARIO');

  useEffect(() => {
    fetchSalesByPeriod();
  }, []);

  const fetchSalesByPeriod = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        groupBy
      };

      const response = await axios.get('/reports/sales/period', { params });
      
      if (response.data.success) {
        setVentas(response.data.data);
        console.log('✅ Ventas por período cargadas:', response.data.data.length);
      }
    } catch (error) {
      console.error('❌ Error al cargar ventas por período:', error);
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchSalesByPeriod();
  };

  const setQuickFilter = (days) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  // Preparar datos para gráfica
  const chartData = ventas.map((venta) => ({
    fecha: groupBy === 'DIARIO' 
      ? format(new Date(venta.Fecha), 'dd/MM', { locale: es })
      : venta.Periodo,
    ventas: venta.NumeroVentas,
    total: venta.TotalVentas,
    promedio: venta.TicketPromedio
  }));

  // Calcular totales
  const totalVentas = ventas.reduce((sum, v) => sum + v.NumeroVentas, 0);
  const totalIngresos = ventas.reduce((sum, v) => sum + v.TotalVentas, 0);
  const promedioTicket = totalVentas > 0 ? totalIngresos / totalVentas : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
        <Calendar className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-800">Ventas por Período</h2>
          <p className="text-sm text-gray-600">Análisis de ventas en el tiempo</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Ventas</p>
          <p className="text-2xl font-bold text-blue-900">{totalVentas}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">Ingresos Totales</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalIngresos)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">Ticket Promedio</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(promedioTicket)}</p>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setQuickFilter(7)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
        >
          Últimos 7 días
        </button>
        <button
          onClick={() => setQuickFilter(15)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
        >
          Últimos 15 días
        </button>
        <button
          onClick={() => setQuickFilter(30)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
        >
          Últimos 30 días
        </button>
        <button
          onClick={() => {
            setStartDate(startOfMonth(new Date()));
            setEndDate(endOfMonth(new Date()));
          }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
        >
          Este mes
        </button>
      </div>

      {/* Filtros personalizados */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agrupar por
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="DIARIO">Diario</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyFilters}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Gráfica */}
      {!loading && ventas.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Evolución de Ventas</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'total' || name === 'promedio') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="ventas" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Número de Ventas" 
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="total" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Total Vendido" 
              />
            </LineChart>
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
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {groupBy === 'DIARIO' ? 'Fecha' : 'Período'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Número de Ventas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Vendido
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ticket Promedio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron ventas en el período seleccionado
                  </td>
                </tr>
              ) : (
                ventas.map((venta, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {groupBy === 'DIARIO' 
                        ? format(new Date(venta.Fecha), 'dd/MM/yyyy', { locale: es })
                        : venta.Periodo
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="font-semibold text-blue-600">
                        {venta.NumeroVentas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {formatCurrency(venta.TotalVentas)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatCurrency(venta.TicketPromedio)}
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

export default PeriodSalesReport;
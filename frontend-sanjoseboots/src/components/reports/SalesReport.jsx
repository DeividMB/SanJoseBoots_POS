// frontend/src/components/reports/SalesReport.jsx
import { useState, useEffect } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import 'react-datepicker/dist/react-datepicker.css';

const SalesReport = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchSalesReport();
    fetchSummary();
  }, []);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (status) params.status = status;

      const response = await axios.get('/api/v1/reports-analytics/sales', { params });
      
      if (response.data.success) {
        setVentas(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = {};
      if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');

      const response = await axios.get('/api/v1/reports-analytics/sales/summary', { params });
      
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar resumen:', error);
    }
  };

  const handleApplyFilters = () => {
    fetchSalesReport();
    fetchSummary();
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setPaymentMethod('');
    setStatus('');
    fetchSalesReport();
    fetchSummary();
  };

  const handleExportExcel = async () => {
    try {
      const params = {};
      if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (status) params.status = status;

      const response = await axios.get('/reports-analytics/export/sales', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_ventas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Ventas</p>
            <p className="text-2xl font-bold text-blue-900">{summary.TotalVentas || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Ingreso Total</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.IngresoTotal || 0)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Ticket Promedio</p>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(summary.TicketPromedio || 0)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Venta Mayor</p>
            <p className="text-2xl font-bold text-orange-900">{formatCurrency(summary.VentaMayor || 0)}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 font-medium"
          >
            <Filter className="w-5 h-5" />
            Filtros
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar
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

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
          </div>
        )}
      </div>

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No se encontraron ventas</td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.VentaID} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{venta.NumeroTicket}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(venta.FechaVenta).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{venta.Vendedor}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(venta.Total)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        venta.MetodoPago === 'Efectivo' ? 'bg-green-100 text-green-800' :
                        venta.MetodoPago === 'Tarjeta' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {venta.MetodoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        venta.Estado === 'Completada' ? 'bg-green-100 text-green-800' :
                        venta.Estado === 'Cancelada' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {venta.Estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{venta.CantidadProductos}</td>
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

export default SalesReport;
import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatsCard from '../components/dashboard/Statscard';
import SalesChart from '../components/dashboard/SalesChart';
import TopProducts from '../components/dashboard/TopProducts';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import { reportsAPI } from '../api/endpoints';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getDashboard();
      
      // Log para ver qué datos llegan del backend
      console.log('📊 Datos del backend:', response.data);
      
      if (response.data && response.data.success) {
        setDashboardData(response.data.data);
      } else {
        toast.error('Error al cargar los datos del dashboard');
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Cargando dashboard..." />
      </Layout>
    );
  }

  // Mapear los datos del backend a la estructura que espera el frontend
  const kpisHoy = dashboardData?.kpisHoy || {};
  const kpisMes = dashboardData?.kpisMes || {};
  const stockBajo = dashboardData?.stockBajo || {};
  const valorInventario = dashboardData?.valorInventario || {};
  const topProducts = dashboardData?.topProductos || [];

  // Adaptar a la estructura esperada por los componentes existentes
  const stats = {
    today_sales: kpisHoy.TotalVentasHoy || 0,
    yesterday_sales: kpisHoy.TotalVentasHoy || 0, // No tenemos datos del día anterior
    month_sales: kpisMes.TotalVentasMes || 0,
    last_month_sales: kpisMes.TotalVentasMes || 0, // No tenemos datos del mes anterior
    today_orders: kpisHoy.NumeroVentasHoy || 0,
    yesterday_orders: kpisHoy.NumeroVentasHoy || 0,
    average_ticket: kpisHoy.TicketPromedioHoy || 0,
    total_products: valorInventario.TotalProductos || 0,
    inventory_value: valorInventario.ValorTotalInventario || 0,
  };

  // Adaptar productos para la gráfica de ventas (últimos 7 días - por ahora vacío)
  const salesData = [];

  // Adaptar productos con stock bajo (por ahora mostramos advertencia si hay)
  const lowStockProducts = [];
  const lowStockCount = stockBajo.ProductosStockBajo || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Ventas del Día"
            value={stats.today_sales}
            icon={DollarSign}
            previousValue={stats.yesterday_sales}
            format="currency"
          />
          <StatsCard
            title="Ventas del Mes"
            value={stats.month_sales}
            icon={TrendingUp}
            previousValue={stats.last_month_sales}
            format="currency"
          />
          <StatsCard
            title="Órdenes del Día"
            value={stats.today_orders}
            icon={ShoppingBag}
            previousValue={stats.yesterday_orders}
            format="number"
          />
          <StatsCard
            title="Ticket Promedio"
            value={stats.average_ticket}
            icon={DollarSign}
            format="currency"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SalesChart data={salesData} />
          <TopProducts products={topProducts} />
        </div>

        {/* Additional Info Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alert */}
          <Card 
            title="Productos con Stock Bajo" 
            subtitle={lowStockCount > 0 ? `${lowStockCount} productos requieren atención` : 'Stock suficiente'}
          >
            {lowStockCount === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Todos los productos tienen stock suficiente</p>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800 mb-1">
                      {lowStockCount} producto(s) con stock bajo
                    </p>
                    <p className="text-sm text-orange-600">
                      Revisa el inventario en el módulo de Productos para reabastecer
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card title="Resumen General">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Total de Productos</span>
                <span className="font-bold text-primary text-lg">
                  {stats.total_products}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Total de Variantes</span>
                <span className="font-bold text-primary text-lg">
                  {valorInventario.TotalVariantes || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Valor del Inventario</span>
                <span className="font-bold text-accent text-lg">
                  {formatCurrency(stats.inventory_value)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Stock Total</span>
                <span className="font-bold text-primary text-lg">
                  {valorInventario.StockTotal || 0} unidades
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Clientes Atendidos (Hoy)</span>
                <span className="font-bold text-primary text-lg">
                  {stats.today_orders}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">Productos con Stock Bajo</span>
                <span className={`font-bold text-lg ${lowStockCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {lowStockCount}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
import React from 'react';
import { Package } from 'lucide-react';
import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

const TopProducts = ({ products = [] }) => {
  // Adaptar la estructura del backend a la estructura que espera el componente
  const adaptedProducts = products.map((product, index) => ({
    id: index, // El backend no retorna ID, usamos el índice
    name: product.NombreProducto,
    quantity: product.TotalVendido,
    total_revenue: product.TotalIngresos || 0
  }));

  return (
    <Card title="Top 5 Productos Más Vendidos">
      <div className="space-y-4">
        {adaptedProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay datos disponibles</p>
          </div>
        ) : (
          adaptedProducts.slice(0, 5).map((product, index) => (
            <div key={product.id} className="flex items-center gap-4 p-3 bg-background rounded-lg hover:bg-background-dark transition-colors">
              <div className="flex-shrink-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary truncate">{product.name}</p>
                <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-accent">{formatCurrency(product.total_revenue)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default TopProducts;
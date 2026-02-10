import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, calculatePercentageChange } from '../../utils/formatters';

const StatsCard = ({ title, value, icon: Icon, trend, previousValue, format = 'currency' }) => {
  const percentageChange = previousValue ? calculatePercentageChange(value, previousValue) : 0;
  const isPositive = percentageChange >= 0;

  const formatValue = (val) => {
    if (format === 'currency') return formatCurrency(val);
    if (format === 'number') return val.toLocaleString('es-MX');
    return val;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-primary mb-2">
            {formatValue(value)}
          </h3>
          {previousValue !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(percentageChange).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">vs. anterior</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${Icon ? 'bg-accent/10' : 'bg-gray-100'}`}>
          {Icon && <Icon className="h-6 w-6 text-accent" />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
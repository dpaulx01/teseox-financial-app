// Tarjeta de KPI con diseño moderno
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  MinusIcon 
} from '@heroicons/react/24/outline';
import { KPIMetric } from '../../types/financial';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters';

const KPICard: React.FC<KPIMetric> = ({
  name,
  value,
  format,
  trend,
  change,
  target
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val / 100);
      case 'number':
      default:
        return formatNumber(val);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className=\"h-5 w-5 text-green-400\" />;
      case 'down':
        return <ArrowTrendingDownIcon className=\"h-5 w-5 text-red-400\" />;
      case 'stable':
      default:
        return <MinusIcon className=\"h-5 w-5 text-yellow-400\" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      case 'stable':
      default:
        return 'text-yellow-400';
    }
  };

  const getProgressPercentage = () => {
    if (!target || target === 0) return 0;
    return Math.min((Math.abs(value) / Math.abs(target)) * 100, 100);
  };

  return (
    <motion.div
      className=\"glass-card p-6 hover:shadow-glow transition-all duration-300\"
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className=\"flex items-center justify-between mb-4\">
        <h3 className=\"text-gray-300 text-sm font-medium truncate\">{name}</h3>
        {getTrendIcon()}
      </div>

      {/* Main Value */}
      <div className=\"mb-4\">
        <motion.div
          className=\"neon-text text-2xl font-bold\"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {formatValue(value)}
        </motion.div>

        {/* Change Indicator */}
        {change !== undefined && (
          <div className={`flex items-center text-sm mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className=\"ml-1\">
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar for Target */}
      {target !== undefined && (
        <div className=\"space-y-2\">
          <div className=\"flex justify-between text-xs text-gray-400\">
            <span>Objetivo</span>
            <span>{formatValue(target)}</span>
          </div>
          <div className=\"w-full bg-gray-700 rounded-full h-2\">
            <motion.div
              className=\"bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full\"
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <div className=\"text-xs text-gray-400 text-right\">
            {getProgressPercentage().toFixed(0)}% del objetivo
          </div>
        </div>
      )}

      {/* Holographic Border Effect */}
      <div className=\"absolute inset-0 rounded-lg border border-purple-500/20 pointer-events-none\" />
    </motion.div>
  );
};

export default KPICard;
// Quick Filters Component - One-click filter presets
import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Flame,
  Clock,
  BarChart3,
  Filter
} from 'lucide-react';

interface QuickFilter {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isActive?: boolean;
  count?: number;
}

interface QuickFiltersProps {
  onFilterClick: (filterId: string) => void;
  activeFilters: string[];
  className?: string;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  onFilterClick,
  activeFilters,
  className = ''
}) => {
  const quickFilters: QuickFilter[] = [
    {
      id: 'today',
      name: 'Hoy',
      description: 'Transacciones de hoy',
      icon: Calendar,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      count: 24
    },
    {
      id: 'thisWeek',
      name: 'Esta Semana',
      description: 'Últimos 7 días',
      icon: Clock,
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      count: 156
    },
    {
      id: 'thisMonth',
      name: 'Este Mes',
      description: 'Mes actual',
      icon: Calendar,
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      count: 847
    },
    {
      id: 'highValue',
      name: 'Alto Valor',
      description: 'Montos > 10M',
      icon: DollarSign,
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      count: 12
    },
    {
      id: 'recentChanges',
      name: 'Cambios Recientes',
      description: 'Variaciones > 10%',
      icon: TrendingUp,
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      count: 45
    },
    {
      id: 'significant',
      name: 'Significativos',
      description: 'Impacto material',
      icon: Flame,
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      count: 8
    },
    {
      id: 'trending',
      name: 'En Tendencia',
      description: 'Crecimiento sostenido',
      icon: BarChart3,
      color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      count: 23
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Filters Header */}
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <Filter className="h-4 w-4" />
        <span>Filtros Rápidos</span>
        {activeFilters.length > 0 && (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
            {activeFilters.length} activos
          </span>
        )}
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-3">
        {quickFilters.map((filter, index) => {
          const isActive = activeFilters.includes(filter.id);
          const IconComponent = filter.icon;

          return (
            <motion.button
              key={filter.id}
              onClick={() => onFilterClick(filter.id)}
              className={`relative flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-300 group ${
                isActive
                  ? `${filter.color} ring-2 ring-offset-2 ring-offset-slate-900 ring-current/50`
                  : 'border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Icon */}
              <div className={`p-2 rounded-lg ${isActive ? 'bg-current/10' : 'bg-slate-700/50 group-hover:bg-slate-700'}`}>
                <IconComponent className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex flex-col items-start">
                <div className="font-medium text-sm">{filter.name}</div>
                <div className="text-xs opacity-75">{filter.description}</div>
              </div>

              {/* Count Badge */}
              {filter.count && (
                <motion.div
                  className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-bold rounded-full ${
                    isActive 
                      ? 'bg-current text-slate-900' 
                      : 'bg-purple-500 text-white'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: (index * 0.1) + 0.2 }}
                >
                  {filter.count}
                </motion.div>
              )}

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-current/5 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Active Filters Summary */}
      {activeFilters.length > 0 && (
        <motion.div
          className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="text-sm">
            <span className="text-purple-400 font-medium">
              {activeFilters.length} filtros activos:
            </span>
            <span className="text-gray-300 ml-2">
              {quickFilters
                .filter(f => activeFilters.includes(f.id))
                .map(f => f.name)
                .join(', ')}
            </span>
          </div>
          
          <button
            onClick={() => activeFilters.forEach(id => onFilterClick(id))}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Limpiar todo
          </button>
        </motion.div>
      )}

      {/* Performance Hint */}
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span>Filtros optimizados para datasets grandes</span>
      </div>
    </div>
  );
};

export default QuickFilters;
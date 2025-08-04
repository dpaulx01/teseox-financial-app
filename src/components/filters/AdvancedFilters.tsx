// Advanced Filters Component - Date ranges, categories, and complex filters
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Calendar,
  Tag,
  DollarSign,
  BarChart3,
  X,
  CheckCircle,
  RefreshCw,
  Bookmark,
  Search
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export interface AdvancedFilterConfig {
  dateRange: {
    start: Date | null;
    end: Date | null;
    preset: 'custom' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'ytd';
  };
  categories: {
    selected: string[];
    exclude: string[];
  };
  amountRange: {
    min: number | null;
    max: number | null;
    currency: 'COP' | 'USD' | 'EUR';
  };
  accountFilters: {
    levels: number[];
    types: ('asset' | 'liability' | 'equity' | 'revenue' | 'expense')[];
    codes: string[];
  };
  analysisFilters: {
    showOnlySignificant: boolean;
    significanceThreshold: number;
    showOnlyChanged: boolean;
    changeThreshold: number;
    showOnlyActive: boolean;
  };
  savedFilters: SavedFilter[];
  customRules: CustomFilterRule[];
}

export interface SavedFilter {
  id: string;
  name: string;
  description: string;
  config: Partial<AdvancedFilterConfig>;
  isQuickFilter: boolean;
  createdAt: Date;
  usageCount: number;
}

export interface CustomFilterRule {
  id: string;
  name: string;
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'not_in';
  value: any;
  isActive: boolean;
}

interface AdvancedFiltersProps {
  config: AdvancedFilterConfig;
  onChange: (config: AdvancedFilterConfig) => void;
  availableCategories: { id: string; name: string; count: number }[];
  availableAccounts: { code: string; name: string; type: string }[];
  onSaveFilter?: (filter: SavedFilter) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  config,
  onChange,
  availableCategories,
  availableAccounts,
  onSaveFilter,
  onLoadFilter,
  className = '',
  isExpanded = false,
  onToggleExpanded
}) => {
  const [activeTab, setActiveTab] = useState<'dates' | 'categories' | 'amounts' | 'accounts' | 'analysis' | 'saved'>('dates');
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Date presets
  const datePresets = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    return {
      today: { start: new Date(), end: new Date() },
      week: { start: startOfWeek, end: new Date() },
      month: { start: startOfMonth, end: new Date() },
      quarter: { start: startOfQuarter, end: new Date() },
      year: { start: startOfYear, end: new Date() },
      ytd: { start: startOfYear, end: new Date() }
    };
  }, []);

  // Update date range
  const updateDateRange = useCallback((preset: AdvancedFilterConfig['dateRange']['preset'], customStart?: Date, customEnd?: Date) => {
    const newDateRange = {
      preset,
      start: preset === 'custom' ? customStart || null : datePresets[preset]?.start || null,
      end: preset === 'custom' ? customEnd || null : datePresets[preset]?.end || null
    };

    onChange({
      ...config,
      dateRange: newDateRange
    });
  }, [config, onChange, datePresets]);

  // Update categories
  const updateCategories = useCallback((type: 'selected' | 'exclude', categoryId: string, isSelected: boolean) => {
    const newCategories = { ...config.categories };
    
    if (isSelected) {
      newCategories[type] = [...newCategories[type].filter(id => id !== categoryId), categoryId];
      // Remove from opposite array
      const oppositeType = type === 'selected' ? 'exclude' : 'selected';
      newCategories[oppositeType] = newCategories[oppositeType].filter(id => id !== categoryId);
    } else {
      newCategories[type] = newCategories[type].filter(id => id !== categoryId);
    }

    onChange({
      ...config,
      categories: newCategories
    });
  }, [config, onChange]);

  // Save current filter configuration
  const saveCurrentFilter = useCallback(() => {
    const newFilter: SavedFilter = {
      id: `filter_${Date.now()}`,
      name: `Filtro ${config.savedFilters.length + 1}`,
      description: 'Configuración de filtros personalizada',
      config: { ...config },
      isQuickFilter: false,
      createdAt: new Date(),
      usageCount: 0
    };

    if (onSaveFilter) {
      onSaveFilter(newFilter);
    }

    onChange({
      ...config,
      savedFilters: [...config.savedFilters, newFilter]
    });
  }, [config, onChange, onSaveFilter]);

  // Load saved filter
  const loadSavedFilter = useCallback((filter: SavedFilter) => {
    if (filter.config) {
      onChange({ ...config, ...filter.config });
    }

    // Update usage count
    const updatedFilters = config.savedFilters.map(f =>
      f.id === filter.id ? { ...f, usageCount: f.usageCount + 1 } : f
    );

    onChange({
      ...config,
      savedFilters: updatedFilters
    });

    if (onLoadFilter) {
      onLoadFilter(filter);
    }
  }, [config, onChange, onLoadFilter]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const clearedConfig: AdvancedFilterConfig = {
      dateRange: { start: null, end: null, preset: 'custom' },
      categories: { selected: [], exclude: [] },
      amountRange: { min: null, max: null, currency: 'COP' },
      accountFilters: { levels: [1, 2, 3, 4, 5], types: [], codes: [] },
      analysisFilters: {
        showOnlySignificant: false,
        significanceThreshold: 1000000,
        showOnlyChanged: false,
        changeThreshold: 5,
        showOnlyActive: true
      },
      savedFilters: config.savedFilters,
      customRules: []
    };

    onChange(clearedConfig);
  }, [config.savedFilters, onChange]);

  // Filter summary
  const filterSummary = useMemo(() => {
    const activeFilters: string[] = [];

    if (config.dateRange.start && config.dateRange.end) {
      activeFilters.push(`Fechas: ${config.dateRange.preset !== 'custom' ? config.dateRange.preset : 'personalizado'}`);
    }

    if (config.categories.selected.length > 0) {
      activeFilters.push(`${config.categories.selected.length} categorías`);
    }

    if (config.amountRange.min !== null || config.amountRange.max !== null) {
      activeFilters.push('Rango de montos');
    }

    if (config.accountFilters.levels.length < 5) {
      activeFilters.push('Niveles filtrados');
    }

    if (config.analysisFilters.showOnlySignificant || config.analysisFilters.showOnlyChanged) {
      activeFilters.push('Filtros de análisis');
    }

    if (config.customRules.filter(r => r.isActive).length > 0) {
      activeFilters.push(`${config.customRules.filter(r => r.isActive).length} reglas personalizadas`);
    }

    return activeFilters;
  }, [config]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Toggle and Summary */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onToggleExpanded?.(!isExpanded)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
        >
          <Filter className="h-5 w-5" />
          <span className="font-medium">Filtros Avanzados</span>
          {filterSummary.length > 0 && (
            <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded text-xs">
              {filterSummary.length}
            </span>
          )}
        </button>

        {filterSummary.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-400">
              Activos: {filterSummary.join(', ')}
            </div>
            <button
              onClick={clearAllFilters}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Limpiar todos los filtros"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="glass-card p-6 rounded-xl border border-purple-500/30"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Filter Tabs */}
            <div className="flex space-x-1 mb-6 bg-slate-800/50 rounded-lg p-1">
              {[
                { id: 'dates', label: 'Fechas', icon: Calendar },
                { id: 'categories', label: 'Categorías', icon: Tag },
                { id: 'amounts', label: 'Montos', icon: DollarSign },
                { id: 'accounts', label: 'Cuentas', icon: BarChart3 },
                { id: 'analysis', label: 'Análisis', icon: Search },
                { id: 'saved', label: 'Guardados', icon: Bookmark }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Date Range Tab */}
                {activeTab === 'dates' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400">Rango de Fechas</h3>
                    
                    {/* Date Presets */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {Object.entries(datePresets).map(([preset, dates]) => (
                        <button
                          key={preset}
                          onClick={() => updateDateRange(preset as any)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            config.dateRange.preset === preset
                              ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                              : 'border-gray-600 text-gray-300 hover:border-purple-400'
                          }`}
                        >
                          {preset.charAt(0).toUpperCase() + preset.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Custom Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Fecha Inicio
                        </label>
                        <input
                          type="date"
                          value={config.dateRange.start?.toISOString().split('T')[0] || ''}
                          onChange={(e) => updateDateRange('custom', new Date(e.target.value), config.dateRange.end || undefined)}
                          className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Fecha Fin
                        </label>
                        <input
                          type="date"
                          value={config.dateRange.end?.toISOString().split('T')[0] || ''}
                          onChange={(e) => updateDateRange('custom', config.dateRange.start || undefined, new Date(e.target.value))}
                          className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Categories Tab */}
                {activeTab === 'categories' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400">Filtrado por Categorías</h3>
                    
                    {/* Search Categories */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar categorías..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Category Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Include Categories */}
                      <div>
                        <h4 className="text-md font-medium text-green-400 mb-3">Incluir Categorías</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {availableCategories
                            .filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(category => (
                              <label key={category.id} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={config.categories.selected.includes(category.id)}
                                  onChange={(e) => updateCategories('selected', category.id, e.target.checked)}
                                  className="rounded"
                                />
                                <span className="flex-1 text-white">{category.name}</span>
                                <span className="text-xs text-gray-400">({category.count})</span>
                              </label>
                            ))}
                        </div>
                      </div>

                      {/* Exclude Categories */}
                      <div>
                        <h4 className="text-md font-medium text-red-400 mb-3">Excluir Categorías</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {availableCategories
                            .filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(category => (
                              <label key={category.id} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={config.categories.exclude.includes(category.id)}
                                  onChange={(e) => updateCategories('exclude', category.id, e.target.checked)}
                                  className="rounded"
                                />
                                <span className="flex-1 text-white">{category.name}</span>
                                <span className="text-xs text-gray-400">({category.count})</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Range Tab */}
                {activeTab === 'amounts' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-400">Rango de Montos</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Monto Mínimo
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={config.amountRange.min || ''}
                          onChange={(e) => onChange({
                            ...config,
                            amountRange: {
                              ...config.amountRange,
                              min: e.target.value ? Number(e.target.value) : null
                            }
                          })}
                          className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Monto Máximo
                        </label>
                        <input
                          type="number"
                          placeholder="Sin límite"
                          value={config.amountRange.max || ''}
                          onChange={(e) => onChange({
                            ...config,
                            amountRange: {
                              ...config.amountRange,
                              max: e.target.value ? Number(e.target.value) : null
                            }
                          })}
                          className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Moneda
                        </label>
                        <select
                          value={config.amountRange.currency}
                          onChange={(e) => onChange({
                            ...config,
                            amountRange: {
                              ...config.amountRange,
                              currency: e.target.value as any
                            }
                          })}
                          className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="COP">COP (Pesos)</option>
                          <option value="USD">USD (Dólares)</option>
                          <option value="EUR">EUR (Euros)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Amount Presets */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Presets Rápidos:</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: '< 1M', min: null, max: 1000000 },
                          { label: '1M - 10M', min: 1000000, max: 10000000 },
                          { label: '10M - 100M', min: 10000000, max: 100000000 },
                          { label: '> 100M', min: 100000000, max: null },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            onClick={() => onChange({
                              ...config,
                              amountRange: {
                                ...config.amountRange,
                                min: preset.min,
                                max: preset.max
                              }
                            })}
                            className="px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Filters Tab */}
                {activeTab === 'saved' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-400">Filtros Guardados</h3>
                      <button
                        onClick={saveCurrentFilter}
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                      >
                        Guardar Actual
                      </button>
                    </div>

                    <div className="space-y-3">
                      {config.savedFilters.map(filter => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-white">{filter.name}</div>
                            <div className="text-sm text-gray-400">{filter.description}</div>
                            <div className="text-xs text-gray-500">
                              Creado: {filter.createdAt.toLocaleDateString()} | Usado: {filter.usageCount} veces
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => loadSavedFilter(filter)}
                              className="p-2 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                              title="Cargar filtro"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title="Eliminar filtro"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {config.savedFilters.length === 0 && (
                        <div className="text-center py-8">
                          <Bookmark className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">No hay filtros guardados</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-700 mt-6">
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Limpiar Todo</span>
              </button>

              <div className="text-sm text-gray-400">
                {filterSummary.length} filtros activos
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedFilters;
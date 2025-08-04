// Enhanced Account Tree Table with search, filtering, and sorting
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  EyeOff,
  Bookmark,
  X,
  Settings
 } from 'lucide-react';
import { AccountNode } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import VirtualizedTable from '../performance/VirtualizedTable';

interface FilterOptions {
  searchTerm: string;
  showOnlyPositive: boolean;
  showOnlyNegative: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  accountLevels: number[];
  categories: string[];
}

interface SortOptions {
  field: 'code' | 'name' | 'value' | 'percentage' | 'change';
  direction: 'asc' | 'desc';
}

interface EnhancedAccountTreeTableProps {
  rootNode: AccountNode;
  expandedNodes: Set<string>;
  onNodeExpansion: (nodeCode: string, isExpanded: boolean) => void;
  showVerticalAnalysis: boolean;
  showHorizontalAnalysis: boolean;
  className?: string;
  maxHeight?: number;
  enableVirtualization?: boolean;
  enablePerformanceMode?: boolean;
}

const EnhancedAccountTreeTable: React.FC<EnhancedAccountTreeTableProps> = ({
  rootNode,
  expandedNodes,
  onNodeExpansion,
  showVerticalAnalysis,
  showHorizontalAnalysis,
  className = '',
  maxHeight = 600,
  enableVirtualization = true,
  enablePerformanceMode = false
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    showOnlyPositive: false,
    showOnlyNegative: false,
    minAmount: null,
    maxAmount: null,
    accountLevels: [1, 2, 3, 4, 5],
    categories: []
  });

  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'code',
    direction: 'asc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedNodes, setBookmarkedNodes] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Flatten the tree structure for easier filtering and sorting
  const flattenedNodes = useMemo(() => {
    const flatten = (node: AccountNode, level: number = 0, parentPath: string = ''): any[] => {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      const nodeWithLevel = {
        ...node,
        level,
        fullPath: currentPath,
        hasChildren: node.children.length > 0
      };

      const result = [nodeWithLevel];
      
      if (expandedNodes.has(node.code) && node.children.length > 0) {
        node.children.forEach(child => {
          result.push(...flatten(child, level + 1, currentPath));
        });
      }
      
      return result;
    };

    return flatten(rootNode);
  }, [rootNode, expandedNodes]);

  // Apply filters and sorting
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = flattenedNodes.filter(node => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !node.code.toLowerCase().includes(searchLower) &&
          !node.name.toLowerCase().includes(searchLower) &&
          !node.fullPath.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Amount filters
      if (filters.showOnlyPositive && node.value <= 0) return false;
      if (filters.showOnlyNegative && node.value >= 0) return false;
      if (filters.minAmount !== null && Math.abs(node.value) < filters.minAmount) return false;
      if (filters.maxAmount !== null && Math.abs(node.value) > filters.maxAmount) return false;

      // Level filter
      if (!filters.accountLevels.includes(node.level + 1)) return false;

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortOptions.field) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'value':
          aValue = Math.abs(a.value);
          bValue = Math.abs(b.value);
          break;
        case 'percentage':
          aValue = a.verticalPercentage || 0;
          bValue = b.verticalPercentage || 0;
          break;
        case 'change':
          aValue = a.horizontalChange?.percentage || 0;
          bValue = b.horizontalChange?.percentage || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOptions.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOptions.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });

    return filtered;
  }, [flattenedNodes, filters, sortOptions]);

  // Handle node selection
  const handleNodeSelection = useCallback((nodeCode: string, selected: boolean) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(nodeCode);
      } else {
        newSet.delete(nodeCode);
      }
      return newSet;
    });
  }, []);

  // Handle bookmark toggle
  const handleBookmarkToggle = useCallback((nodeCode: string) => {
    setBookmarkedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeCode)) {
        newSet.delete(nodeCode);
      } else {
        newSet.add(nodeCode);
      }
      return newSet;
    });
  }, []);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      showOnlyPositive: false,
      showOnlyNegative: false,
      minAmount: null,
      maxAmount: null,
      accountLevels: [1, 2, 3, 4, 5],
      categories: []
    });
  };

  // Export selected data
  const exportSelected = () => {
    const selectedData = filteredAndSortedNodes.filter(node => 
      selectedNodes.has(node.code)
    );
    
    const csvContent = [
      ['Código', 'Nombre', 'Valor', 'Nivel', 'Ruta Completa'],
      ...selectedData.map(node => [
        node.code,
        node.name,
        node.value.toString(),
        (node.level + 1).toString(),
        node.fullPath
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cuentas_seleccionadas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Use virtualized table for performance mode or large datasets
  if (enablePerformanceMode || filteredAndSortedNodes.length > 1000) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-sm text-purple-400">
            <Settings className="h-4 w-4" />
            <span>Modo de Alto Rendimiento Activado</span>
          </div>
          <div className="text-xs text-gray-400">
            {filteredAndSortedNodes.length.toLocaleString()} cuentas
          </div>
        </div>
        <VirtualizedTable
          rootNode={rootNode}
          maxHeight={maxHeight}
          enableSearch={true}
          enableFilters={true}
          enableVirtualization={enableVirtualization}
          onNodeExpansion={onNodeExpansion}
          className={className}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enhanced Header with Search and Controls */}
      <div className="glass-card p-4 rounded-lg border border-purple-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o ruta..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-all duration-300 ${
                showFilters
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-gray-600 text-gray-400 hover:border-blue-400'
              }`}
              title="Filtros"
            >
              <Filter className="h-5 w-5" />
            </button>

            {/* Sort Button */}
            <div className="relative">
              <select
                value={`${sortOptions.field}-${sortOptions.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-') as [SortOptions['field'], SortOptions['direction']];
                  setSortOptions({ field, direction });
                }}
                className="p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="code-asc">Código ↑</option>
                <option value="code-desc">Código ↓</option>
                <option value="name-asc">Nombre ↑</option>
                <option value="name-desc">Nombre ↓</option>
                <option value="value-desc">Valor ↓</option>
                <option value="value-asc">Valor ↑</option>
                {showVerticalAnalysis && (
                  <>
                    <option value="percentage-desc">% ↓</option>
                    <option value="percentage-asc">% ↑</option>
                  </>
                )}
                {showHorizontalAnalysis && (
                  <>
                    <option value="change-desc">Cambio ↓</option>
                    <option value="change-asc">Cambio ↑</option>
                  </>
                )}
              </select>
            </div>

            {/* Selection Controls */}
            {selectedNodes.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-purple-400">
                  {selectedNodes.size} seleccionados
                </span>
                <button
                  onClick={exportSelected}
                  className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-sm hover:bg-purple-500/30 transition-colors"
                >
                  Exportar
                </button>
                <button
                  onClick={() => setSelectedNodes(new Set())}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Results Count */}
            <div className="text-sm text-gray-400">
              {filteredAndSortedNodes.length} de {flattenedNodes.length}
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="mt-4 pt-4 border-t border-gray-700"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Amount Filters */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Montos</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minAmount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        minAmount: e.target.value ? Number(e.target.value) : null
                      }))}
                      className="w-full px-2 py-1 text-sm bg-slate-800/50 border border-gray-600 rounded focus:ring-1 focus:ring-purple-500 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxAmount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        maxAmount: e.target.value ? Number(e.target.value) : null
                      }))}
                      className="w-full px-2 py-1 text-sm bg-slate-800/50 border border-gray-600 rounded focus:ring-1 focus:ring-purple-500 text-white"
                    />
                  </div>
                </div>

                {/* Sign Filters */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Signo</label>
                  <div className="space-y-1">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showOnlyPositive}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          showOnlyPositive: e.target.checked,
                          showOnlyNegative: e.target.checked ? false : prev.showOnlyNegative
                        }))}
                        className="mr-2"
                      />
                      <span className="text-green-400">Solo Positivos</span>
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showOnlyNegative}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          showOnlyNegative: e.target.checked,
                          showOnlyPositive: e.target.checked ? false : prev.showOnlyPositive
                        }))}
                        className="mr-2"
                      />
                      <span className="text-red-400">Solo Negativos</span>
                    </label>
                  </div>
                </div>

                {/* Level Filters */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Niveles</label>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            accountLevels: prev.accountLevels.includes(level)
                              ? prev.accountLevels.filter(l => l !== level)
                              : [...prev.accountLevels, level]
                          }));
                        }}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          filters.accountLevels.includes(level)
                            ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                            : 'border-gray-600 text-gray-400 hover:border-purple-400'
                        }`}
                      >
                        N{level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Table */}
      <div 
        className="glass-card rounded-lg border border-purple-500/30 overflow-hidden"
        style={{ maxHeight: maxHeight }}
      >
        {/* Table Header */}
        <div className="bg-slate-800/50 border-b border-purple-500/30 p-4">
          <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-purple-400">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedNodes.size === filteredAndSortedNodes.length && filteredAndSortedNodes.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedNodes(new Set(filteredAndSortedNodes.map(n => n.code)));
                  } else {
                    setSelectedNodes(new Set());
                  }
                }}
                className="rounded"
              />
            </div>
            <div className="col-span-1">Nivel</div>
            <div className="col-span-2">Código</div>
            <div className="col-span-4">Cuenta</div>
            <div className="col-span-2 text-right">Valor</div>
            {showVerticalAnalysis && <div className="col-span-1 text-right">%</div>}
            {showHorizontalAnalysis && <div className="col-span-1 text-right">Cambio</div>}
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto" style={{ maxHeight: maxHeight - 100 }}>
          <AnimatePresence>
            {filteredAndSortedNodes.map((node, index) => (
              <motion.div
                key={node.code}
                className={`grid grid-cols-12 gap-4 items-center p-3 border-b border-slate-700/30 hover:bg-slate-800/30 transition-all duration-200 group ${
                  selectedNodes.has(node.code) ? 'bg-purple-500/10' : ''
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.01 }}
                style={{ paddingLeft: `${12 + node.level * 20}px` }}
              >
                {/* Selection */}
                <div className="col-span-1 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedNodes.has(node.code)}
                    onChange={(e) => handleNodeSelection(node.code, e.target.checked)}
                    className="rounded"
                  />
                  <button
                    onClick={() => handleBookmarkToggle(node.code)}
                    className={`p-1 rounded hover:bg-slate-700/50 transition-colors ${
                      bookmarkedNodes.has(node.code) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
                    }`}
                  >
                    <Bookmark className="h-3 w-3" />
                  </button>
                </div>

                {/* Level */}
                <div className="col-span-1">
                  <span className="text-xs font-mono text-gray-400">
                    {node.level + 1}
                  </span>
                </div>

                {/* Code with Expand/Collapse */}
                <div className="col-span-2 flex items-center space-x-2">
                  {node.hasChildren && (
                    <button
                      onClick={() => onNodeExpansion(node.code, !expandedNodes.has(node.code))}
                      className="p-1 rounded hover:bg-purple-500/20 transition-colors"
                    >
                      {expandedNodes.has(node.code) ? (
                        <ChevronDown className="h-4 w-4 text-purple-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  )}
                  <span className="font-mono text-sm text-purple-300">
                    {node.code}
                  </span>
                </div>

                {/* Account Name */}
                <div className="col-span-4">
                  <span className="text-white group-hover:text-purple-200 transition-colors">
                    {node.name}
                  </span>
                </div>

                {/* Value */}
                <div className="col-span-2 text-right">
                  <span className={`font-mono font-bold ${
                    node.value >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(node.value)}
                  </span>
                </div>

                {/* Vertical Analysis */}
                {showVerticalAnalysis && (
                  <div className="col-span-1 text-right">
                    {node.verticalPercentage !== undefined && (
                      <span className="text-xs text-gray-400">
                        {node.verticalPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}

                {/* Horizontal Analysis */}
                {showHorizontalAnalysis && (
                  <div className="col-span-1 text-right">
                    {node.horizontalChange && (
                      <div className="text-xs">
                        <div className={node.horizontalChange.percentage >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {node.horizontalChange.percentage.toFixed(1)}%
                        </div>
                        <div className="text-gray-500">
                          {formatCurrency(node.horizontalChange.absolute)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* No Results */}
          {filteredAndSortedNodes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="text-6xl">🔍</div>
              <div className="text-xl text-purple-400 font-semibold">Sin Resultados</div>
              <p className="text-gray-400 text-center max-w-md">
                No se encontraron cuentas que coincidan con los filtros aplicados.
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Footer with Summary */}
        {filteredAndSortedNodes.length > 0 && (
          <div className="bg-slate-800/50 border-t border-purple-500/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                Mostrando {filteredAndSortedNodes.length} de {flattenedNodes.length} cuentas
              </div>
              <div className="flex items-center space-x-4">
                {bookmarkedNodes.size > 0 && (
                  <div className="text-yellow-400">
                    <Bookmark className="h-4 w-4 inline mr-1" />
                    {bookmarkedNodes.size} marcadas
                  </div>
                )}
                {selectedNodes.size > 0 && (
                  <div className="text-purple-400">
                    {selectedNodes.size} seleccionadas
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAccountTreeTable;
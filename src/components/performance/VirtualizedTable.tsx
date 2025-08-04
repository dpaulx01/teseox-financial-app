// High-performance virtualized table for large datasets
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Bookmark
} from 'lucide-react';
import { 
  useVirtualScroll, 
  useDebouncedSearch, 
  useFlattenedTree,
  usePerformanceMonitor,
  useIntersectionObserver
} from '../../utils/performanceOptimization';
import { AccountNode } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';

interface VirtualizedTableProps {
  rootNode: AccountNode;
  maxHeight: number;
  itemHeight?: number;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableVirtualization?: boolean;
  onNodeExpansion?: (nodeCode: string, isExpanded: boolean) => void;
  className?: string;
}

interface FilterOptions {
  searchTerm: string;
  showOnlyPositive: boolean;
  showOnlyNegative: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  accountLevels: number[];
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  rootNode,
  maxHeight,
  itemHeight = 48,
  enableSearch = true,
  enableFilters = true,
  enableVirtualization = true,
  onNodeExpansion,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['ROOT']));
  const [scrollTop, setScrollTop] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    showOnlyPositive: false,
    showOnlyNegative: false,
    minAmount: null,
    maxAmount: null,
    accountLevels: [1, 2, 3, 4, 5]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Performance monitoring
  usePerformanceMonitor('VirtualizedTable');

  // Debounced search
  const debouncedSearchTerm = useDebouncedSearch(filters.searchTerm, 300);

  // Flattened and filtered tree data
  const flattenedData = useFlattenedTree(
    rootNode,
    expandedNodes,
    debouncedSearchTerm,
    {
      minAmount: filters.minAmount,
      maxAmount: filters.maxAmount,
      showOnlyPositive: filters.showOnlyPositive,
      showOnlyNegative: filters.showOnlyNegative,
      accountLevels: filters.accountLevels
    }
  );

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return flattenedData;

    return [...flattenedData].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle different data types
      if (sortConfig.key === 'value') {
        aValue = Math.abs(aValue);
        bValue = Math.abs(bValue);
      }

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [flattenedData, sortConfig]);

  // Virtual scrolling
  const {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop: updateScrollTop
  } = useVirtualScroll(
    enableVirtualization ? sortedData : sortedData.slice(0, 100), // Limit items if virtualization is disabled
    itemHeight,
    maxHeight,
    5 // overscan
  );

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    if (enableVirtualization) {
      updateScrollTop(scrollTop);
    }
  }, [enableVirtualization, updateScrollTop]);

  // Handle node expansion
  const handleNodeExpansion = useCallback((nodeCode: string, isExpanded: boolean) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(nodeCode);
      } else {
        newSet.delete(nodeCode);
      }
      return newSet;
    });

    if (onNodeExpansion) {
      onNodeExpansion(nodeCode, isExpanded);
    }
  }, [onNodeExpansion]);

  // Handle sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort?.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Performance stats for debugging
  const performanceStats = useMemo(() => ({
    totalNodes: flattenedData.length,
    visibleNodes: visibleItems.length,
    isVirtualized: enableVirtualization,
    memoryEfficiency: enableVirtualization 
      ? `${((visibleItems.length / flattenedData.length) * 100).toFixed(1)}%` 
      : '100%'
  }), [flattenedData.length, visibleItems.length, enableVirtualization]);

  // Intersection observer for lazy loading (future enhancement)
  const isVisible = useIntersectionObserver(containerRef, { threshold: 0.1 });

  return (
    <div className={`space-y-4 ${className}`} ref={containerRef}>
      {/* Header Controls */}
      <div className="glass-card p-4 rounded-lg border border-purple-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search */}
          {enableSearch && (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cuentas..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Filter Toggle */}
            {enableFilters && (
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
            )}

            {/* Performance Stats Toggle (Debug) */}
            <div className="text-xs text-gray-400 hidden lg:block">
              {performanceStats.totalNodes} cuentas | {performanceStats.visibleNodes} visibles
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {enableFilters && showFilters && (
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
                  onClick={() => setFilters({
                    searchTerm: '',
                    showOnlyPositive: false,
                    showOnlyNegative: false,
                    minAmount: null,
                    maxAmount: null,
                    accountLevels: [1, 2, 3, 4, 5]
                  })}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Virtualized Table */}
      <div 
        className="glass-card rounded-lg border border-purple-500/30 overflow-hidden"
        style={{ height: maxHeight }}
      >
        {/* Table Header */}
        <div className="bg-slate-800/50 border-b border-purple-500/30 p-4 sticky top-0 z-10">
          <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-purple-400">
            <div className="col-span-1">Nivel</div>
            <div className="col-span-2">
              <button
                onClick={() => handleSort('code')}
                className="flex items-center space-x-1 hover:text-purple-300 transition-colors"
              >
                <span>Código</span>
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
            <div className="col-span-5">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center space-x-1 hover:text-purple-300 transition-colors"
              >
                <span>Cuenta</span>
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
            <div className="col-span-3 text-right">
              <button
                onClick={() => handleSort('value')}
                className="flex items-center space-x-1 hover:text-purple-300 transition-colors ml-auto"
              >
                <span>Valor</span>
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
            <div className="col-span-1">Acciones</div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="overflow-auto"
          style={{ height: maxHeight - 80 }}
          onScroll={handleScroll}
        >
          {/* Virtual Spacer (top) */}
          {enableVirtualization && offsetY > 0 && (
            <div style={{ height: offsetY }} />
          )}

          {/* Visible Items */}
          <div>
            {visibleItems.map((node) => (
              <VirtualizedTableRow
                key={`${node.code}-${node.level}`}
                node={node}
                isExpanded={expandedNodes.has(node.code)}
                onToggleExpanded={handleNodeExpansion}
                itemHeight={itemHeight}
              />
            ))}
          </div>

          {/* Virtual Spacer (bottom) */}
          {enableVirtualization && (
            <div style={{ height: Math.max(0, totalHeight - offsetY - (visibleItems.length * itemHeight)) }} />
          )}

          {/* Empty State */}
          {sortedData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="text-6xl">🔍</div>
              <div className="text-xl text-purple-400 font-semibold">Sin Resultados</div>
              <p className="text-gray-400 text-center max-w-md">
                No se encontraron cuentas que coincidan con los filtros aplicados.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {sortedData.length > 0 && (
          <div className="bg-slate-800/50 border-t border-purple-500/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                Mostrando {enableVirtualization ? visibleItems.length : Math.min(100, sortedData.length)} de {sortedData.length} cuentas
                {enableVirtualization && <span className="text-purple-400 ml-2">(Virtualizado)</span>}
              </div>
              <div className="text-gray-400">
                Eficiencia de memoria: {performanceStats.memoryEfficiency}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoized row component for better performance
const VirtualizedTableRow: React.FC<{
  node: any;
  isExpanded: boolean;
  onToggleExpanded: (nodeCode: string, isExpanded: boolean) => void;
  itemHeight: number;
}> = React.memo(({ node, isExpanded, onToggleExpanded, itemHeight }) => {
  return (
    <div
      className="grid grid-cols-12 gap-4 items-center p-3 border-b border-slate-700/30 hover:bg-slate-800/30 transition-all duration-200"
      style={{ 
        height: itemHeight,
        paddingLeft: `${12 + node.level * 20}px` 
      }}
    >
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
            onClick={() => onToggleExpanded(node.code, !isExpanded)}
            className="p-1 rounded hover:bg-purple-500/20 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-purple-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
        <span className="font-mono text-sm text-purple-300 truncate">
          {node.code}
        </span>
      </div>

      {/* Account Name */}
      <div className="col-span-5">
        <span className="text-white truncate" title={node.name}>
          {node.name}
        </span>
      </div>

      {/* Value */}
      <div className="col-span-3 text-right">
        <span className={`font-mono font-bold ${
          node.value >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {formatCurrency(node.value)}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center space-x-1">
        <button
          className="p-1 rounded hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
          title="Ver detalles"
        >
          <Eye className="h-3 w-3 text-purple-400" />
        </button>
        <button
          className="p-1 rounded hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
          title="Marcar"
        >
          <Bookmark className="h-3 w-3 text-yellow-400" />
        </button>
      </div>
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export default VirtualizedTable;
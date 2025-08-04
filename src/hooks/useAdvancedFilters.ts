// Advanced Filters Hook - Manage complex filter state and logic
import { useState, useCallback, useMemo, useEffect } from 'react';
import { AdvancedFilterConfig, SavedFilter } from '../components/filters/AdvancedFilters';
import { AccountNode } from '../utils/pnlCalculator';

export interface FilterResult<T> {
  filteredData: T[];
  appliedFilters: string[];
  filterCount: number;
  isFiltered: boolean;
  performance: {
    executionTime: number;
    itemsProcessed: number;
    filtersApplied: number;
  };
}

// Default filter configuration
const createDefaultConfig = (): AdvancedFilterConfig => ({
  dateRange: {
    start: null,
    end: null,
    preset: 'custom'
  },
  categories: {
    selected: [],
    exclude: []
  },
  amountRange: {
    min: null,
    max: null,
    currency: 'COP'
  },
  accountFilters: {
    levels: [1, 2, 3, 4, 5],
    types: [],
    codes: []
  },
  analysisFilters: {
    showOnlySignificant: false,
    significanceThreshold: 1000000,
    showOnlyChanged: false,
    changeThreshold: 5,
    showOnlyActive: true
  },
  savedFilters: [],
  customRules: []
});

export const useAdvancedFilters = <T extends Record<string, any>>(
  data: T[],
  options: {
    persistKey?: string;
    enableAnalytics?: boolean;
    debounceMs?: number;
  } = {}
) => {
  const { persistKey, enableAnalytics = true, debounceMs = 300 } = options;
  
  const [config, setConfig] = useState<AdvancedFilterConfig>(() => {
    // Load from localStorage if persistKey is provided
    if (persistKey) {
      try {
        const saved = localStorage.getItem(`filters_${persistKey}`);
        return saved ? JSON.parse(saved) : createDefaultConfig();
      } catch (error) {
        // console.warn('Failed to load saved filters:', error);
      }
    }
    return createDefaultConfig();
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalFiltersApplied: 0,
    averageExecutionTime: 0,
    mostUsedFilters: {} as Record<string, number>
  });

  // Persist config to localStorage
  useEffect(() => {
    if (persistKey) {
      try {
        localStorage.setItem(`filters_${persistKey}`, JSON.stringify(config));
      } catch (error) {
        // console.warn('Failed to save filters:', error);
      }
    }
  }, [config, persistKey]);

  // Apply filters to data
  const applyFilters = useCallback((
    inputData: T[],
    filterConfig: AdvancedFilterConfig
  ): FilterResult<T> => {
    const startTime = performance.now();
    let filteredData = [...inputData];
    const appliedFilters: string[] = [];

    // Date range filter
    if (filterConfig.dateRange.start && filterConfig.dateRange.end) {
      const startDate = new Date(filterConfig.dateRange.start);
      const endDate = new Date(filterConfig.dateRange.end);
      
      filteredData = filteredData.filter(item => {
        const itemDate = item.date ? new Date(item.date) : new Date();
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      appliedFilters.push(`Fechas (${filterConfig.dateRange.preset})`);
    }

    // Category filters
    if (filterConfig.categories.selected.length > 0) {
      filteredData = filteredData.filter(item =>
        filterConfig.categories.selected.some(cat => 
          item.category === cat || item.categories?.includes(cat)
        )
      );
      appliedFilters.push(`Categorías incluidas (${filterConfig.categories.selected.length})`);
    }

    if (filterConfig.categories.exclude.length > 0) {
      filteredData = filteredData.filter(item =>
        !filterConfig.categories.exclude.some(cat => 
          item.category === cat || item.categories?.includes(cat)
        )
      );
      appliedFilters.push(`Categorías excluidas (${filterConfig.categories.exclude.length})`);
    }

    // Amount range filter
    if (filterConfig.amountRange.min !== null || filterConfig.amountRange.max !== null) {
      filteredData = filteredData.filter(item => {
        const amount = Math.abs(item.value || item.amount || 0);
        const minCheck = filterConfig.amountRange.min === null || amount >= filterConfig.amountRange.min;
        const maxCheck = filterConfig.amountRange.max === null || amount <= filterConfig.amountRange.max;
        return minCheck && maxCheck;
      });
      
      appliedFilters.push('Rango de montos');
    }

    // Account filters
    if (filterConfig.accountFilters.levels.length < 5) {
      filteredData = filteredData.filter(item => {
        const level = item.level !== undefined ? item.level + 1 : 1;
        return filterConfig.accountFilters.levels.includes(level);
      });
      appliedFilters.push(`Niveles de cuenta (${filterConfig.accountFilters.levels.length})`);
    }

    if (filterConfig.accountFilters.types.length > 0) {
      filteredData = filteredData.filter(item =>
        filterConfig.accountFilters.types.includes(item.type)
      );
      appliedFilters.push(`Tipos de cuenta (${filterConfig.accountFilters.types.length})`);
    }

    if (filterConfig.accountFilters.codes.length > 0) {
      filteredData = filteredData.filter(item =>
        filterConfig.accountFilters.codes.some(code =>
          item.code?.startsWith(code)
        )
      );
      appliedFilters.push(`Códigos de cuenta (${filterConfig.accountFilters.codes.length})`);
    }

    // Analysis filters
    if (filterConfig.analysisFilters.showOnlySignificant) {
      filteredData = filteredData.filter(item => {
        const amount = Math.abs(item.value || item.amount || 0);
        return amount >= filterConfig.analysisFilters.significanceThreshold;
      });
      appliedFilters.push('Solo significativos');
    }

    if (filterConfig.analysisFilters.showOnlyChanged) {
      filteredData = filteredData.filter(item => {
        const change = Math.abs(item.change || item.changePercent || 0);
        return change >= filterConfig.analysisFilters.changeThreshold;
      });
      appliedFilters.push('Solo con cambios');
    }

    if (!filterConfig.analysisFilters.showOnlyActive) {
      // This would filter out inactive items if we had that data
      // For now, we'll assume all items are active
    }

    // Custom rules
    const activeRules = (filterConfig.customRules || []).filter(rule => rule.isActive);
    activeRules.forEach(rule => {
      filteredData = filteredData.filter(item => {
        const fieldValue = item[rule.field];
        
        switch (rule.operator) {
          case 'equals':
            return fieldValue === rule.value;
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
          case 'gt':
            return Number(fieldValue) > Number(rule.value);
          case 'gte':
            return Number(fieldValue) >= Number(rule.value);
          case 'lt':
            return Number(fieldValue) < Number(rule.value);
          case 'lte':
            return Number(fieldValue) <= Number(rule.value);
          case 'between':
            const [min, max] = Array.isArray(rule.value) ? rule.value : [0, 0];
            return Number(fieldValue) >= min && Number(fieldValue) <= max;
          case 'in':
            return Array.isArray(rule.value) && rule.value.includes(fieldValue);
          case 'not_in':
            return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
          default:
            return true;
        }
      });
      
      appliedFilters.push(`Regla: ${rule.name}`);
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Update analytics
    if (enableAnalytics) {
      setAnalytics(prev => {
        const newAnalytics = { ...prev };
        newAnalytics.totalFiltersApplied += appliedFilters.length;
        newAnalytics.averageExecutionTime = (prev.averageExecutionTime + executionTime) / 2;
        
        (appliedFilters || []).forEach(filter => {
          newAnalytics.mostUsedFilters[filter] = (newAnalytics.mostUsedFilters[filter] || 0) + 1;
        });
        
        return newAnalytics;
      });
    }

    return {
      filteredData,
      appliedFilters,
      filterCount: appliedFilters.length,
      isFiltered: appliedFilters.length > 0,
      performance: {
        executionTime,
        itemsProcessed: inputData.length,
        filtersApplied: appliedFilters.length
      }
    };
  }, [enableAnalytics]);

  // Memoized filtered result
  const filterResult = useMemo(() => {
    return applyFilters(data, config);
  }, [data, config, applyFilters]);

  // Update config
  const updateConfig = useCallback((newConfig: AdvancedFilterConfig) => {
    setConfig(newConfig);
  }, []);

  // Save filter
  const saveFilter = useCallback((filter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'>) => {
    const newFilter: SavedFilter = {
      ...filter,
      id: `filter_${Date.now()}`,
      createdAt: new Date(),
      usageCount: 0
    };

    setConfig(prev => ({
      ...prev,
      savedFilters: [...prev.savedFilters, newFilter]
    }));

    return newFilter;
  }, []);

  // Load filter
  const loadFilter = useCallback((filter: SavedFilter) => {
    if (filter.config) {
      setConfig(prev => {
        // Update usage count
        const updatedFilters = prev.savedFilters.map(f =>
          f.id === filter.id ? { ...f, usageCount: f.usageCount + 1 } : f
        );

        return {
          ...prev,
          ...filter.config,
          savedFilters: updatedFilters
        };
      });
    }
  }, []);

  // Delete filter
  const deleteFilter = useCallback((filterId: string) => {
    setConfig(prev => ({
      ...prev,
      savedFilters: prev.savedFilters.filter(f => f.id !== filterId)
    }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setConfig(prev => ({
      ...createDefaultConfig(),
      savedFilters: prev.savedFilters // Keep saved filters
    }));
  }, []);

  // Quick filters
  const quickFilters = useMemo(() => ({
    // Date-based quick filters
    today: () => {
      const today = new Date();
      updateConfig({
        ...config,
        dateRange: {
          start: today,
          end: today,
          preset: 'today'
        }
      });
    },
    
    thisWeek: () => {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      updateConfig({
        ...config,
        dateRange: {
          start: startOfWeek,
          end: new Date(),
          preset: 'week'
        }
      });
    },
    
    thisMonth: () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      updateConfig({
        ...config,
        dateRange: {
          start: startOfMonth,
          end: new Date(),
          preset: 'month'
        }
      });
    },

    // Amount-based quick filters
    highValue: () => {
      updateConfig({
        ...config,
        amountRange: {
          ...config.amountRange,
          min: 10000000 // 10M
        },
        analysisFilters: {
          ...config.analysisFilters,
          showOnlySignificant: true,
          significanceThreshold: 10000000
        }
      });
    },

    recentChanges: () => {
      updateConfig({
        ...config,
        analysisFilters: {
          ...config.analysisFilters,
          showOnlyChanged: true,
          changeThreshold: 10
        }
      });
    }
  }), [config, updateConfig]);

  return {
    // State
    config,
    isExpanded,
    filterResult,
    analytics,
    
    // Actions
    updateConfig,
    setIsExpanded,
    saveFilter,
    loadFilter,
    deleteFilter,
    clearAllFilters,
    
    // Quick filters
    quickFilters,
    
    // Computed values
    hasActiveFilters: filterResult.isFiltered,
    filterSummary: filterResult.appliedFilters,
    performance: filterResult.performance
  };
};
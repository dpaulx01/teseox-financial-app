// Performance optimization utilities for large datasets
import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { AccountNode } from './pnlCalculator';

// Virtual scrolling hook for large lists
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    );
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex,
      offsetY: Math.max(0, startIndex - overscan) * itemHeight
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      ...item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange.start, visibleRange.end]);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.offsetY,
    setScrollTop
  };
};

// Debounced search hook
export const useDebouncedSearch = (
  searchTerm: string,
  delay: number = 300
): string => {
  const [debouncedValue, setDebouncedValue] = React.useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  return debouncedValue;
};

// Memoized tree flattening with search and filtering
export const useFlattenedTree = (
  rootNode: AccountNode,
  expandedNodes: Set<string>,
  searchTerm: string,
  filters: Record<string, any> = {}
) => {
  return useMemo(() => {
    const flattenTree = (
      node: AccountNode,
      level: number = 0,
      parentPath: string = '',
      results: any[] = []
    ): any[] => {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      const nodeWithMeta = {
        ...node,
        level,
        fullPath: currentPath,
        hasChildren: node.children.length > 0,
        isExpanded: expandedNodes.has(node.code)
      };

      // Apply search filter
      const matchesSearch = !searchTerm || 
        node.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currentPath.toLowerCase().includes(searchTerm.toLowerCase());

      // Apply other filters
      const matchesFilters = Object.entries(filters).every(([key, filterValue]) => {
        switch (key) {
          case 'minAmount':
            return !filterValue || Math.abs(node.value) >= filterValue;
          case 'maxAmount':
            return !filterValue || Math.abs(node.value) <= filterValue;
          case 'showOnlyPositive':
            return !filterValue || node.value > 0;
          case 'showOnlyNegative':
            return !filterValue || node.value < 0;
          case 'accountLevels':
            return !filterValue || filterValue.includes(level + 1);
          default:
            return true;
        }
      });

      if (matchesSearch && matchesFilters) {
        results.push(nodeWithMeta);
      }

      // Recurse into children if node is expanded
      if (expandedNodes.has(node.code) && node.children.length > 0) {
        node.children.forEach(child => {
          flattenTree(child, level + 1, currentPath, results);
        });
      }

      return results;
    };

    return flattenTree(rootNode);
  }, [rootNode, expandedNodes, searchTerm, filters]);
};

// Chunk processing for large operations
export const processInChunks = async <T, R>(
  items: T[],
  processor: (item: T) => R | Promise<R>,
  chunkSize: number = 100,
  onProgress?: (progress: number) => void
): Promise<R[]> => {
  const results: R[] = [];
  const totalChunks = Math.ceil(items.length / chunkSize);

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    if (onProgress) {
      const currentChunk = Math.floor(i / chunkSize) + 1;
      onProgress((currentChunk / totalChunks) * 100);
    }

    // Allow other tasks to run
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
};

// Memoized calculations with cache invalidation
export class CalculationCache {
  private cache = new Map<string, { value: any; timestamp: number; dependencies: string[] }>();
  private maxSize = 100;
  private ttl = 300000; // 5 minutes

  generateKey(inputs: any[]): string {
    return JSON.stringify(inputs);
  }

  get<T>(key: string, dependencies: string[] = []): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Check dependencies - if any dependency changed, invalidate
    // This would need to be implemented based on your dependency tracking system

    return entry.value;
  }

  set<T>(key: string, value: T, dependencies: string[] = []): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      dependencies
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidateByDependency(dependency: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies.includes(dependency)) {
        this.cache.delete(key);
      }
    }
  }
}

// Global calculation cache instance
export const globalCalculationCache = new CalculationCache();

// Web Worker for heavy calculations
export const createCalculationWorker = (workerScript: string) => {
  return new Promise<Worker>((resolve, reject) => {
    try {
      const worker = new Worker(workerScript);
      worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
          resolve(worker);
        }
      };
      worker.onerror = reject;
    } catch (error) {
      reject(error);
    }
  });
};

// Performance monitoring hooks
export const usePerformanceMonitor = (componentName: string) => {
  const renderTimeRef = useRef<number>();
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    renderTimeRef.current = performance.now();
    renderCountRef.current += 1;
  });

  useEffect(() => {
    if (renderTimeRef.current) {
      const renderTime = performance.now() - renderTimeRef.current;
      
      // Log slow renders
      if (renderTime > 16) { // More than one frame at 60fps
        // console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`);
      }
    }
  });

  return {
    getRenderCount: () => renderCountRef.current,
    markRenderStart: () => { renderTimeRef.current = performance.now(); }
  };
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
};

// Memory usage monitoring
export const useMemoryMonitor = (intervalMs: number = 5000) => {
  const [memoryUsage, setMemoryUsage] = React.useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize / 1024 / 1024; // MB
        const total = memory.totalJSHeapSize / 1024 / 1024; // MB
        const percentage = (used / total) * 100;

        setMemoryUsage({ used, total, percentage });

        // Warn about high memory usage
        if (percentage > 80) {
          // console.warn(`High memory usage: ${percentage.toFixed(1)}% (${used.toFixed(1)}MB / ${total.toFixed(1)}MB)`);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryUsage;
};

// Optimized sorting for large datasets
export const useOptimizedSort = <T>(
  items: T[],
  sortKey: keyof T,
  sortOrder: 'asc' | 'desc' = 'asc',
  chunkSize: number = 1000
) => {
  return useMemo(() => {
    if (items.length <= chunkSize) {
      // Use native sort for small datasets
      return [...items].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
    } else {
      // Use merge sort for large datasets (more predictable performance)
      const mergeSort = (arr: T[]): T[] => {
        if (arr.length <= 1) return arr;

        const mid = Math.floor(arr.length / 2);
        const left = mergeSort(arr.slice(0, mid));
        const right = mergeSort(arr.slice(mid));

        return merge(left, right);
      };

      const merge = (left: T[], right: T[]): T[] => {
        const result: T[] = [];
        let leftIndex = 0;
        let rightIndex = 0;

        while (leftIndex < left.length && rightIndex < right.length) {
          const leftVal = left[leftIndex][sortKey];
          const rightVal = right[rightIndex][sortKey];
          
          let comparison = 0;
          if (typeof leftVal === 'string' && typeof rightVal === 'string') {
            comparison = leftVal.localeCompare(rightVal);
          } else if (typeof leftVal === 'number' && typeof rightVal === 'number') {
            comparison = leftVal - rightVal;
          }

          if (sortOrder === 'desc') {
            comparison = -comparison;
          }

          if (comparison <= 0) {
            result.push(left[leftIndex]);
            leftIndex++;
          } else {
            result.push(right[rightIndex]);
            rightIndex++;
          }
        }

        return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
      };

      return mergeSort([...items]);
    }
  }, [items, sortKey, sortOrder, chunkSize]);
};

// Request Animation Frame hook for smooth animations
export const useAnimationFrame = (callback: (deltaTime: number) => void) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};
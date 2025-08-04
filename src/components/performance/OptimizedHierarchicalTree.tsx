/**
 * Optimized Hierarchical Tree Component
 * Performance-optimized tree rendering without external dependencies
 */
import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { ChevronsRight, ChevronsDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { AccountNode } from '../../utils/pnlCalculator';
import SafeAnimationWrapper from '../animations/SafeAnimationWrapper';
import { AnimatedCounter } from '../animations/AnimatedComponents';
import InsightBubble from '../insights/InsightBubble';

interface OptimizedTreeNodeProps {
  node: AccountNode;
  level: number;
  expanded: Record<string, boolean>;
  expandAll: boolean;
  onToggle: (code: string) => void;
  showVertical: boolean;
  showHorizontal: boolean;
  insights: any[];
  viewType: string;
  isVisible: boolean;
}

// Memoized tree node
const OptimizedTreeNode: React.FC<OptimizedTreeNodeProps> = memo(({
  node,
  level,
  expanded,
  expandAll,
  onToggle,
  showVertical,
  showHorizontal,
  insights,
  viewType,
  isVisible
}) => {
  if (!isVisible) return null;

  const isExpanded = expandAll || expanded[node.code];
  const hasChildren = node.children.length > 0;
  const nodeInsight = insights.find(i => i.targetCode === node.code);
  const isExcluded = node.excluded || false;

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      onToggle(node.code);
    }
  }, [hasChildren, onToggle, node.code]);

  return (
    <>
      <div 
        onClick={handleToggle}
        className={`flex justify-between items-center p-2 transition-colors duration-200 group relative ${
          isExcluded ? 'opacity-50 line-through text-gray-500' : ''
        } ${
          hasChildren ? 'cursor-pointer hover:bg-glass hover:shadow-glow-sm' : ''
        } ${
          node.code.length <= 3 
            ? 'bg-gradient-to-r from-primary/10 to-accent/5 font-bold border-b-2 border-primary/30 backdrop-blur-sm' 
            : 'border-b border-border/30 hover:border-primary/20'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className="flex items-center min-w-0 flex-1">
          {hasChildren && (
            isExpanded 
              ? <ChevronsDown className="h-4 w-4 mr-2 text-primary flex-shrink-0" /> 
              : <ChevronsRight className="h-4 w-4 mr-2 text-text-muted flex-shrink-0" />
          )}
          {nodeInsight && (
            <InsightBubble type={nodeInsight.type} message={nodeInsight.message} />
          )}
          <span className="font-mono text-sm mr-2 text-primary/80 font-semibold flex-shrink-0">
            {node.code}
          </span>
          <span className="text-text-secondary group-hover:text-light transition-colors duration-200 truncate">
            {node.name}
          </span>
        </div>
        
        <div className="flex items-center flex-shrink-0">
          {showVertical && node.verticalPercentage !== undefined && (
            <span className="text-xs text-gray-400 mr-4">
              {node.verticalPercentage.toFixed(2)}%
            </span>
          )}
          {showHorizontal && node.horizontalChange && (
            <span className={`text-xs mr-4 ${
              node.horizontalChange.absolute >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(node.horizontalChange.absolute)}
              ({node.horizontalChange.percentage.toFixed(1)}%)
            </span>
          )}
          <SafeAnimationWrapper 
            fallback={
              <span className={`font-mono font-bold transition-colors duration-200 ${
                node.value >= 0 
                  ? 'text-accent shadow-glow-accent group-hover:text-glow' 
                  : 'text-danger shadow-glow-danger group-hover:text-glow'
              }`}>
                {isExcluded ? formatCurrency(node.originalValue || 0) : formatCurrency(node.value)}
              </span>
            }
          >
            <AnimatedCounter
              value={isExcluded ? (node.originalValue || 0) : node.value}
              formatFn={(value) => formatCurrency(value)}
              className={`font-mono font-bold transition-colors duration-200 ${
                node.value >= 0 
                  ? 'text-accent shadow-glow-accent group-hover:text-glow' 
                  : 'text-danger shadow-glow-danger group-hover:text-glow'
              }`}
              duration={0.2}
            />
          </SafeAnimationWrapper>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <OptimizedTreeChildren
          children={node.children}
          level={level + 1}
          expanded={expanded}
          expandAll={expandAll}
          onToggle={onToggle}
          showVertical={showVertical}
          showHorizontal={showHorizontal}
          insights={insights}
          viewType={viewType}
        />
      )}
    </>
  );
});

OptimizedTreeNode.displayName = 'OptimizedTreeNode';

// Optimized children renderer
const OptimizedTreeChildren: React.FC<{
  children: AccountNode[];
  level: number;
  expanded: Record<string, boolean>;
  expandAll: boolean;
  onToggle: (code: string) => void;
  showVertical: boolean;
  showHorizontal: boolean;
  insights: any[];
  viewType: string;
}> = memo(({ children, ...props }) => {
  return (
    <>
      {children.map(child => (
        <OptimizedTreeNode
          key={`${child.code}_${props.viewType}_${child.value}`}
          node={child}
          isVisible={true}
          {...props}
        />
      ))}
    </>
  );
});

OptimizedTreeChildren.displayName = 'OptimizedTreeChildren';

interface OptimizedHierarchicalTreeProps {
  treeData: AccountNode[];
  expanded: Record<string, boolean>;
  expandAll: boolean;
  onToggle: (code: string) => void;
  showVertical: boolean;
  showHorizontal: boolean;
  insights: any[];
  viewType: string;
  height?: number;
  className?: string;
  searchTerm?: string;
}

const OptimizedHierarchicalTree: React.FC<OptimizedHierarchicalTreeProps> = ({
  treeData,
  expanded,
  expandAll,
  onToggle,
  showVertical,
  showHorizontal,
  insights,
  viewType,
  height = 400,
  className = '',
  searchTerm = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleNodes, setVisibleNodes] = useState<number>(50);
  
  // Filter nodes based on search
  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData;
    
    const filterNodes = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.filter(node => {
        const matchesSearch = 
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.code.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (matchesSearch) return true;
        
        // Check if any children match
        if (node.children.length > 0) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0) {
            // Update node with filtered children
            return true;
          }
        }
        
        return false;
      });
    };
    
    return filterNodes(treeData);
  }, [treeData, searchTerm]);

  // Count total nodes for performance monitoring
  const totalNodeCount = useMemo(() => {
    let count = 0;
    const countNodes = (nodes: AccountNode[]) => {
      nodes.forEach(node => {
        count++;
        if ((expandAll || expanded[node.code]) && node.children.length > 0) {
          countNodes(node.children);
        }
      });
    };
    countNodes(filteredTreeData);
    return count;
  }, [filteredTreeData, expanded, expandAll]);

  // Load more nodes when scrolling
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage > 0.8 && visibleNodes < totalNodeCount) {
      setVisibleNodes(prev => Math.min(prev + 20, totalNodeCount));
    }
  }, [visibleNodes, totalNodeCount]);

  // Render only visible nodes
  const renderNodes = useCallback((nodes: AccountNode[], startIndex: number = 0): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let currentIndex = startIndex;

    for (const node of nodes) {
      if (currentIndex >= visibleNodes) break;
      
      result.push(
        <OptimizedTreeNode
          key={`${node.code}_${viewType}_${node.value}`}
          node={node}
          level={0}
          expanded={expanded}
          expandAll={expandAll}
          onToggle={onToggle}
          showVertical={showVertical}
          showHorizontal={showHorizontal}
          insights={insights}
          viewType={viewType}
          isVisible={currentIndex < visibleNodes}
        />
      );
      
      currentIndex++;
    }

    return result;
  }, [expanded, expandAll, onToggle, showVertical, showHorizontal, insights, viewType, visibleNodes]);

  if (filteredTreeData.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-400 ${className}`}>
        {searchTerm ? 'No se encontraron resultados' : 'No hay datos para mostrar'}
      </div>
    );
  }

  return (
    <div className={`optimized-tree ${className}`}>
      {/* Performance indicator */}
      <div className="text-xs text-gray-500 p-2 bg-slate-800/30 border-b border-border/30">
        📊 Nodos totales: {totalNodeCount} | Mostrando: {Math.min(visibleNodes, totalNodeCount)}
      </div>
      
      {/* Tree container */}
      <div
        ref={containerRef}
        className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ height: `${height}px` }}
        onScroll={handleScroll}
      >
        {renderNodes(filteredTreeData)}
        
        {visibleNodes < totalNodeCount && (
          <div className="text-center p-4 text-gray-500 text-sm">
            Cargando más nodos...
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(OptimizedHierarchicalTree);
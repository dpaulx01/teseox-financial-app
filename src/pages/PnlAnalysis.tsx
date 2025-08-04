import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronsRight, ChevronsDown, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Settings, Plus, Sparkles } from 'lucide-react';
// react-grid-layout imports (now available in Docker)
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Performance optimizations
import OptimizedHierarchicalTree from '../components/performance/OptimizedHierarchicalTree';
import { usePerformanceMonitor, useMemoryMonitor, useDebouncedSearch } from '../utils/performanceOptimization';

const ResponsiveGridLayout = WidthProvider(Responsive);
const hasGridLayout = true;

// Animation Components
import ParticleBackground from '../components/animations/ParticleBackground';
import SafeAnimationWrapper from '../components/animations/SafeAnimationWrapper';
import { 
  AnimatedCounter, 
  MorphingButton, 
  FloatingActionButton, 
  StaggerContainer 
} from '../components/animations/AnimatedComponents';
import { useAnimations } from '../hooks/useAnimations';

import { useFinancialData } from '../contexts/DataContext';
import { useMixedCosts } from '../contexts/MixedCostContext';
import { useDashboard } from '../contexts/DashboardContext';
import { formatCurrency } from '../utils/formatters';
import WaterfallChart from '../components/charts/WaterfallChart';
import { calculatePnl, calculatePnlWithDynamicConfig, PnlResult, PnlViewType, AccountNode, calculateVerticalAnalysis, calculateHorizontalAnalysis } from '../utils/pnlCalculator';
import { useAnalysisConfig } from '../services/analysisConfigService';
import { PnlInsightEngine, PnlInsight } from '../utils/pnlInsights';
import InsightBubble from '../components/insights/InsightBubble';

// Dashboard Components
import KPIWidget from '../components/dashboard/KPIWidget';
import WidgetContainer from '../components/dashboard/WidgetContainer';
import TableWidget from '../components/dashboard/TableWidget';
import PredictiveWidget from '../components/dashboard/PredictiveWidget';
import ScenariosWidget from '../components/dashboard/ScenariosWidget';
import PerformanceMonitor from '../components/performance/PerformanceMonitor';

// ResponsiveGridLayout is imported conditionally above

const PnlAnalysis: React.FC = () => {
  const { data } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  const { config: analysisConfig, loading: configLoading } = useAnalysisConfig();
  const { 
    currentLayout, 
    isEditMode, 
    setEditMode,
    gridSettings,
    addWidget,
    presets,
    loadPreset
  } = useDashboard();
  const { isAnimationEnabled } = useAnimations();

  // Performance monitoring
  const { getRenderCount } = usePerformanceMonitor('PnlAnalysis');
  const memoryUsage = useMemoryMonitor(3000); // Check every 3 seconds
  
  const [view, setView] = useState<PnlViewType>('contable');
  const [selectedMonth, setSelectedMonth] = useState<string>('Anual');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showVertical, setShowVertical] = useState(false);
  const [showHorizontal, setShowHorizontal] = useState(false);
  const [selectedComparisonMonth, setSelectedComparisonMonth] = useState<string>('');
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [isDashboardMode, setIsDashboardMode] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState<string | null>(null);
  const [useVirtualization, setUseVirtualization] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Debounced search for better performance
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 300);

  const months = useMemo(() => {
    if (!data) return [];
    return ['Anual', ...Object.keys(data.monthly)];
  }, [data]);

  const currentMonth = selectedMonth || 'Anual';
  const comparisonMonth = selectedComparisonMonth || (months.length > 2 ? months[months.indexOf(currentMonth) - 1] || months[0] : months[0]);

  const [pnlResult, setPnlResult] = useState<PnlResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculatePnlData = async () => {
      if (!data || configLoading) {
        setPnlResult(null);
        return;
      }
      
      setIsCalculating(true);
      try {
        // Usar configuración dinámica si está disponible, sino usar fallback
        let result: PnlResult;
        
        if (analysisConfig) {
          result = await calculatePnlWithDynamicConfig(data, currentMonth, view, mixedCosts, analysisConfig);
        } else {
          result = await calculatePnl(data, currentMonth, view, mixedCosts);
        }
        
        if (showVertical) {
          result = calculateVerticalAnalysis(result);
        }

        if (showHorizontal) {
          let previousResult: PnlResult;
          if (analysisConfig) {
            previousResult = await calculatePnlWithDynamicConfig(data, comparisonMonth, view, mixedCosts, analysisConfig);
          } else {
            previousResult = await calculatePnl(data, comparisonMonth, view, mixedCosts);
          }
          result = calculateHorizontalAnalysis(result, previousResult);
        }
        
        setPnlResult(result);
      } catch (error) {
        console.error("Error calculating P&L:", error);
        
        // Fallback a configuración estática en caso de error
        try {
          let result = await calculatePnl(data, currentMonth, view, mixedCosts);
          
          if (showVertical) {
            result = calculateVerticalAnalysis(result);
          }

          if (showHorizontal) {
            const previousResult = await calculatePnl(data, comparisonMonth, view, mixedCosts);
            result = calculateHorizontalAnalysis(result, previousResult);
          }
          
          setPnlResult(result);
        } catch (fallbackError) {
          console.error("Fallback P&L calculation also failed:", fallbackError);
          setPnlResult(null);
        }
      } finally {
        setIsCalculating(false);
      }
    };

    calculatePnlData();
  }, [data, currentMonth, view, mixedCosts, showVertical, showHorizontal, comparisonMonth, analysisConfig, configLoading]);

  const [insights, setInsights] = useState<PnlInsight[]>([]);

  useEffect(() => {
    const calculateInsights = async () => {
      if (!pnlResult || !data) {
        setInsights([]);
        return;
      }
      
      try {
        if (showHorizontal) {
          let previousResult: PnlResult;
          if (analysisConfig) {
            previousResult = await calculatePnlWithDynamicConfig(data, comparisonMonth, view, mixedCosts, analysisConfig);
          } else {
            previousResult = await calculatePnl(data, comparisonMonth, view, mixedCosts);
          }
          const engine = new PnlInsightEngine(pnlResult, previousResult);
          setInsights(engine.run());
        } else {
          const engine = new PnlInsightEngine(pnlResult);
          setInsights(engine.run());
        }
      } catch (error) {
        console.error('Error calculating insights:', error);
        setInsights([]);
      }
    };

    calculateInsights();
  }, [pnlResult, showHorizontal, data, view, mixedCosts, comparisonMonth, analysisConfig]);


  const toggle = useCallback((key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Toggle all nodes expanded/collapsed with performance optimization
  const toggleAll = useCallback(() => {
    if (!pnlResult) return;
    
    const newState = !expandAll;
    
    // For performance, only collect codes when needed
    if (newState) {
      const allNodeCodes: string[] = [];
      const collectAllNodeCodes = (node: any) => {
        allNodeCodes.push(node.code);
        if (node.children && node.children.length > 0) {
          node.children.forEach(collectAllNodeCodes);
        }
      };
      
      pnlResult.treeData.forEach(collectAllNodeCodes);
      
      const newExpanded: Record<string, boolean> = {};
      allNodeCodes.forEach(code => {
        newExpanded[code] = true;
      });
      
      setExpanded(newExpanded);
    } else {
      // Collapse all - just clear the expanded state
      setExpanded({});
    }
    
    setExpandAll(newState);
  }, [pnlResult, expandAll]);

  // Render widget based on type
  const renderWidget = (widget: any) => {
    switch (widget.type) {
      case 'kpi':
        return <KPIWidget widget={widget} />;
      case 'table':
        return <TableWidget widget={widget} />;
      case 'predictive':
        return <PredictiveWidget widget={widget} />;
      case 'scenarios':
        return <ScenariosWidget widget={widget} />;
      case 'waterfall':
        return (
          <WidgetContainer widget={widget}>
            <WaterfallChart 
              data={pnlResult?.waterfallData || []}
              title=""
              className="h-full"
            />
          </WidgetContainer>
        );
      case 'insight':
        return (
          <WidgetContainer widget={widget}>
            <div className="space-y-3 h-full overflow-y-auto">
              <h4 className="text-sm font-semibold text-purple-400 mb-3">Insights Inteligentes</h4>
              {insights.slice(0, widget.settings.maxInsights || 5).map((insight, index) => (
                <InsightBubble 
                  key={index}
                  type={insight.type} 
                  message={insight.message} 
                />
              ))}
            </div>
          </WidgetContainer>
        );
      case 'hierarchical':
        return (
          <WidgetContainer widget={widget}>
            <div className="h-full overflow-y-auto">
              <h4 className="text-sm font-semibold text-purple-400 mb-3">Análisis Jerárquico</h4>
              <div className="text-xs">
                {pnlResult && pnlResult.treeData.map(node => renderNode(node))}
              </div>
            </div>
          </WidgetContainer>
        );
      default:
        return (
          <WidgetContainer widget={widget}>
            <div className="flex items-center justify-center h-full text-gray-400">
              Widget tipo: {widget.type}
            </div>
          </WidgetContainer>
        );
    }
  };

  // Prepare layout for react-grid-layout
  const layoutData = currentLayout?.widgets.map(widget => ({
    i: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    w: widget.size.w,
    h: widget.size.h,
    static: widget.isLocked
  })) || [];

  const handleLayoutChange = (layout: any) => {
    // Update widget positions when layout changes
    if (!currentLayout) return;
    
    layout.forEach((item: any) => {
      const widget = currentLayout.widgets.find(w => w.id === item.i);
      if (widget) {
        // Update widget position and size
        // This would be handled by the dashboard context
      }
    });
  };

  const renderNode = useCallback((node: AccountNode): React.ReactNode => {
    // Use expandAll state to determine if nodes should be expanded
    const isExpanded = expandAll || expanded[node.code];
    const hasChildren = node.children.length > 0;
    const nodeInsight = insights.find(i => i.targetCode === node.code);
    const isExcluded = node.excluded || false;

    // Crear key única que force re-render cuando cambian los datos
    const uniqueKey = `${node.code}_${view}_${node.value}_${node.excluded}_${(node as any)._recalculated || 0}`;
    
    return (
      <div key={uniqueKey}>
        <div 
          onClick={hasChildren ? () => toggle(node.code) : undefined}
          className={`flex justify-between items-center p-3 transition-all duration-300 group relative ${isExcluded ? 'opacity-50 line-through text-gray-500' : ''} ${hasChildren ? 'cursor-pointer hover:bg-glass hover:shadow-glow-sm' : ''} ${node.code.length <= 3 ? 'bg-gradient-to-r from-primary/10 to-accent/5 font-bold border-b-2 border-primary/30 backdrop-blur-sm' : 'border-b border-border/30 hover:border-primary/20'}`}>
          <div className="flex items-center">
            {hasChildren && (
              isExpanded ? <ChevronsDown className="h-4 w-4 mr-2 text-primary shadow-glow-primary transition-all duration-300" /> : <ChevronsRight className="h-4 w-4 mr-2 text-text-muted hover:text-primary transition-all duration-300" />
            )}
            {nodeInsight && (
              <InsightBubble type={nodeInsight.type} message={nodeInsight.message} />
            )}
            <span className="font-mono text-sm mr-2 text-primary/80 font-semibold">{node.code}</span>
            <span className="text-text-secondary group-hover:text-light transition-colors duration-300">{node.name}</span>
          </div>
          <div className="flex items-center">
            {showVertical && node.verticalPercentage !== undefined && (
              <span className="text-xs text-gray-400 mr-4">{node.verticalPercentage.toFixed(2)}%</span>
            )}
            {showHorizontal && node.horizontalChange && (
              <span className={`text-xs mr-4 ${node.horizontalChange.absolute >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(node.horizontalChange.absolute)}
                ({node.horizontalChange.percentage.toFixed(1)}%)
              </span>
            )}
            <SafeAnimationWrapper 
              fallback={
                <span className={`font-mono font-bold transition-all duration-300 ${node.value >= 0 ? 'text-accent shadow-glow-accent group-hover:text-glow' : 'text-danger shadow-glow-danger group-hover:text-glow'}`}>
                  {isExcluded ? formatCurrency(node.originalValue || 0) : formatCurrency(node.value)}
                </span>
              }
            >
              <AnimatedCounter
                value={isExcluded ? (node.originalValue || 0) : node.value}
                formatFn={(value) => formatCurrency(value)}
                className={`font-mono font-bold transition-all duration-300 ${node.value >= 0 ? 'text-accent shadow-glow-accent group-hover:text-glow' : 'text-danger shadow-glow-danger group-hover:text-glow'}`}
                duration={0.3}
              />
            </SafeAnimationWrapper>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="pl-4 animate-slide-up">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  }, [expandAll, expanded, insights, view, showVertical, showHorizontal, toggle]);

  if (!data || !pnlResult) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-text-muted">
            {configLoading ? 'Cargando configuración de análisis...' : isCalculating ? 'Calculando estado de resultados...' : 'Cargando datos financieros...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Particle Background - Temporarily disabled for performance */}
      {false && (
        <SafeAnimationWrapper>
          <ParticleBackground 
            particleCount={15}
            connectionDistance={100}
            financialTheme={true}
            interactive={false}
            showConnections={true}
            animationSpeed={0.3}
          />
        </SafeAnimationWrapper>
      )}
      {/* Enhanced Header with Dashboard Controls */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl lg:text-3xl font-display text-primary neon-text">
              Análisis de Estado de Resultados (PyG)
            </h2>
            <div className="flex items-center space-x-2">
              <MorphingButton
                onClick={() => setIsDashboardMode(!isDashboardMode)}
                variant={isDashboardMode ? 'primary' : 'secondary'}
                size="sm"
                className="px-3 py-2 text-xs"
              >
                <div className="flex items-center space-x-1">
                  <Grid3X3 className="h-4 w-4" />
                  <span>{isDashboardMode ? 'Dashboard' : 'Clásico'}</span>
                </div>
              </MorphingButton>
              {isDashboardMode && (
                <MorphingButton
                  onClick={() => setEditMode(!isEditMode)}
                  variant={isEditMode ? 'primary' : 'secondary'}
                  size="sm"
                  className="px-3 py-2 text-xs"
                >
                  <div className="flex items-center space-x-1">
                    <Settings className="h-4 w-4" />
                    <span>{isEditMode ? 'Salir' : 'Editar'}</span>
                  </div>
                </MorphingButton>
              )}
            </div>
          </div>
          <p className="text-lg lg:text-xl font-display text-accent text-glow mt-2">
            {isDashboardMode ? 'Dashboard Personalizable' : 'Vista Clásica'} • Perspectivas Financieras Clave
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select value={currentMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 hover:shadow-glow-sm font-mono text-sm rounded-lg">
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {showHorizontal && (
            <select value={selectedComparisonMonth} onChange={e => setSelectedComparisonMonth(e.target.value)} className="p-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 hover:shadow-glow-sm font-mono text-sm rounded-lg">
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <div className="glass-card p-1 rounded-lg flex border border-border shadow-inner-glow">
            <div className="flex items-center">
              <button 
                onClick={() => setView('contable')} 
                className={`px-6 py-3 rounded-md text-sm font-display font-semibold transition-all duration-300 relative group flex items-center space-x-2 ${view === 'contable' ? 'bg-primary text-dark-bg shadow-glow-md text-glow' : 'text-text-secondary hover:bg-glass hover:text-primary hover:shadow-glow-sm'}`}
              >
                <span>📊</span>
                <div className="flex flex-col items-start">
                  <span>P.E. Contable</span>
                  <span className="text-xs opacity-70">Estándar</span>
                </div>
              </button>
              <button
                onClick={() => setShowHelpModal('contable')}
                className="ml-1 p-1 rounded-full hover:bg-glass transition-colors"
              >
                <HelpCircle className="h-4 w-4 opacity-70" />
              </button>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setView('operativo')} 
                className={`px-6 py-3 rounded-md text-sm font-display font-semibold transition-all duration-300 relative group flex items-center space-x-2 ${view === 'operativo' ? 'bg-accent text-dark-bg shadow-glow-md text-glow' : 'text-text-secondary hover:bg-glass hover:text-accent hover:shadow-glow-sm'}`}
              >
                <span>📈</span>
                <div className="flex flex-col items-start">
                  <span>P.E. Operativo</span>
                  <span className="text-xs opacity-70">EBIT</span>
                </div>
              </button>
              <button
                onClick={() => setShowHelpModal('operativo')}
                className="ml-1 p-1 rounded-full hover:bg-glass transition-colors"
              >
                <HelpCircle className="h-4 w-4 opacity-70" />
              </button>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setView('caja')} 
                className={`px-6 py-3 rounded-md text-sm font-display font-semibold transition-all duration-300 relative group flex items-center space-x-2 ${view === 'caja' ? 'bg-warning text-dark-bg shadow-glow-md text-glow' : 'text-text-secondary hover:bg-glass hover:text-warning hover:shadow-glow-sm'}`}
              >
                <span>💰</span>
                <div className="flex flex-col items-start">
                  <span>P.E. de Caja</span>
                  <span className="text-xs opacity-70">EBITDA</span>
                </div>
              </button>
              <button
                onClick={() => setShowHelpModal('caja')}
                className="ml-1 p-1 rounded-full hover:bg-glass transition-colors"
              >
                <HelpCircle className="h-4 w-4 opacity-70" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <MorphingButton
              onClick={() => setShowVertical(!showVertical)}
              variant={showVertical ? 'primary' : 'secondary'}
              size="sm"
              className="text-xs relative z-30"
            >
              {showVertical ? '📊 Vertical ON' : '📊 Vertical'}
            </MorphingButton>
            <MorphingButton
              onClick={() => setShowHorizontal(!showHorizontal)}
              variant={showHorizontal ? 'primary' : 'secondary'}
              size="sm"
              className="text-xs relative z-30"
            >
              {showHorizontal ? '📈 Horizontal ON' : '📈 Horizontal'}
            </MorphingButton>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Costos Mixtos:</span>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mixedCosts.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {mixedCosts.length > 0 ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard Mode */}
      {isDashboardMode ? (
        <div className="space-y-4">
          {/* Missing Dependencies Warning */}
          {!hasGridLayout && (
            <motion.div
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center space-x-3">
                <div className="text-yellow-400 text-xl">⚠️</div>
                <div>
                  <div className="text-yellow-400 font-semibold">Dependencias Faltantes</div>
                  <p className="text-gray-300 text-sm mt-1">
                    Para habilitar la funcionalidad de drag-and-drop del dashboard, instala:
                  </p>
                  <div className="bg-slate-900 p-2 rounded mt-2 font-mono text-xs text-green-400">
                    npm install react-grid-layout react-resizable --legacy-peer-deps
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Dashboard Toolbar */}
          {isEditMode && (
            <motion.div
              className="glass-card p-4 rounded-lg border border-purple-500/30"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-purple-400">Personalizar Dashboard</h3>
                  <div className="flex items-center space-x-2">
                    {presets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => loadPreset(preset.id)}
                        className="px-3 py-1 text-xs rounded border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
                <MorphingButton
                  onClick={() => {
                    addWidget({
                      type: 'kpi',
                      title: 'Nuevo KPI',
                      size: { w: 3, h: 2 },
                      position: { x: 0, y: 0 },
                      settings: { metric: 'ingresos', format: 'currency', showTrend: true },
                      isVisible: true,
                      isLocked: false,
                    });
                  }}
                  variant="primary"
                  size="md"
                  className=""
                >
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Agregar Widget</span>
                  </div>
                </MorphingButton>
              </div>
            </motion.div>
          )}

          {/* Responsive Grid Layout */}
          {currentLayout && currentLayout.widgets.length > 0 ? (
            hasGridLayout && ResponsiveGridLayout ? (
              <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layoutData }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: gridSettings.cols, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={gridSettings.rowHeight}
                margin={gridSettings.margin}
                isDraggable={true}
                isResizable={true}
                onLayoutChange={handleLayoutChange}
                compactType="vertical"
                preventCollision={false}
              >
                {currentLayout.widgets.map(widget => (
                  <div key={widget.id} className="widget-container">
                    {renderWidget(widget)}
                  </div>
                ))}
              </ResponsiveGridLayout>
            ) : (
              // Fallback grid layout without drag/drop
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentLayout.widgets.map(widget => (
                  <div key={widget.id} className="widget-container">
                    {renderWidget(widget)}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="text-6xl">🎛️</div>
              <div className="text-xl text-purple-400 font-semibold">Dashboard Vacío</div>
              <p className="text-gray-400 text-center max-w-md">
                {isEditMode 
                  ? 'Agrega widgets para personalizar tu dashboard de análisis PyG.'
                  : 'Activa el modo edición para personalizar tu dashboard.'}
              </p>
              {!isEditMode && (
                <MorphingButton
                  onClick={() => setEditMode(true)}
                  variant="primary"
                  size="lg"
                >
                  Personalizar Dashboard
                </MorphingButton>
              )}
              {isEditMode && (
                <MorphingButton
                  onClick={() => loadPreset('executive')}
                  variant="primary"
                  size="lg"
                >
                  Cargar Dashboard Ejecutivo
                </MorphingButton>
              )}
            </div>
          )}
        </div>
      ) : (
        // Classic View (your original layout)
        <StaggerContainer className="space-y-6" staggerDelay={0.1}>
          <WaterfallChart 
            data={pnlResult.waterfallData}
            title={`Estado de Resultados: ${pnlResult.analysisType === 'contable' ? 'P.E. Contable - Estándar' : pnlResult.analysisType === 'operativo' ? 'P.E. Operativo - EBIT' : 'P.E. de Caja - EBITDA'}`}
            className="animate-scale-in hologram-card p-6 rounded-xl shadow-hologram hover:shadow-glow-xl transition-all duration-500 relative overflow-hidden"
          />

      <div className="hologram-card p-6 rounded-2xl shadow-hologram hover:shadow-glow-lg transition-all duration-500 animate-scale-in relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-display text-primary text-glow relative z-10">
            Estado de Resultados Detallado y Jerárquico
            <span className="text-sm font-normal text-text-muted ml-2">
              ({pnlResult.analysisType.toUpperCase()})
            </span>
          </h3>
          <div className="flex items-center space-x-2">
            <MorphingButton
              onClick={toggleAll}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              {expandAll ? '📁 Colapsar Todo' : '📂 Expandir Todo'}
            </MorphingButton>
          </div>
        </div>
        <div className="glass-card border border-border rounded-lg relative">
          {/* Performance toggle */}
          <div className="flex justify-between items-center p-2 border-b border-border/30">
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={useVirtualization}
                  onChange={(e) => setUseVirtualization(e.target.checked)}
                  className="rounded"
                />
                <span>Virtualización</span>
              </label>
              {memoryUsage && (
                <span className="text-xs text-gray-400">
                  RAM: {memoryUsage.percentage.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Renders: {getRenderCount()}
            </div>
          </div>
          
          {/* Search bar for filtering */}
          <div className="p-2 border-b border-border/30">
            <input
              type="text"
              placeholder="Buscar cuentas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1 text-sm bg-transparent border border-border/30 rounded focus:border-primary/50 focus:outline-none"
            />
          </div>

          {/* Optimized hierarchical tree */}
          {useVirtualization ? (
            <OptimizedHierarchicalTree
              treeData={pnlResult.treeData}
              expanded={expanded}
              expandAll={expandAll}
              onToggle={toggle}
              showVertical={showVertical}
              showHorizontal={showHorizontal}
              insights={insights}
              viewType={view}
              height={400}
              searchTerm={debouncedSearchTerm}
              className="optimized-tree-container"
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {pnlResult.treeData
                .filter(node => 
                  !debouncedSearchTerm || 
                  node.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                  node.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                )
                .map(node => renderNode(node))
              }
            </div>
          )}
        </div>
        <div className="border-t-2 border-primary bg-gradient-to-r from-primary/10 to-accent/10 p-4 font-bold backdrop-blur-sm relative">
          <div className="flex justify-between items-center">
            <span className="text-lg font-display text-primary neon-text">
              {pnlResult.analysisType.toUpperCase()}
              <span className="text-sm font-normal text-text-dim ml-2 font-mono">
                ({currentMonth === 'Anual' ? 'Anual' : currentMonth})
              </span>
            </span>
            <span className={`text-xl font-mono data-display ${pnlResult.summaryKpis.utilidad >= 0 ? 'text-accent shadow-glow-accent' : 'text-danger shadow-glow-danger'}`}>
              {formatCurrency(pnlResult.summaryKpis.utilidad)}
            </span>
          </div>
        </div>
      </div>
        </StaggerContainer>
      )}

      {/* Performance Monitor */}
      <PerformanceMonitor 
        isVisible={useVirtualization || (memoryUsage?.percentage || 0) > 70}
        maxDataPoints={30}
        warningThresholds={{
          renderTime: 16,
          memoryPercentage: 75,
          fps: 30
        }}
      />
      
      {/* Floating Action Button - Safe */}
      {isDashboardMode && isEditMode && (
        <SafeAnimationWrapper>
          <FloatingActionButton
            icon={Sparkles}
            label="Configuración"
            onClick={() => {
              // console.log('Settings clicked');
            }}
            position="bottom-right"
            color="#8B5CF6"
          />
        </SafeAnimationWrapper>
      )}

      {/* Modal de Ayuda */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelpModal(null)}
          >
            <motion.div 
              className="glass-card p-6 rounded-xl max-w-md w-full border border-border shadow-glow-xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {showHelpModal === 'contable' ? '📊' : showHelpModal === 'operativo' ? '📈' : '💰'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-light">
                      {showHelpModal === 'contable' ? 'PyG Contable' : showHelpModal === 'operativo' ? 'PyG Operativo' : 'PyG de Caja'}
                    </h3>
                    <p className="text-text-muted font-mono text-sm">
                      {showHelpModal === 'contable' ? 'Estándar' : showHelpModal === 'operativo' ? 'EBIT' : 'EBITDA'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(null)}
                  className="p-2 rounded-full hover:bg-glass transition-colors"
                >
                  <X className="h-5 w-5 text-text-muted" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-text-secondary leading-relaxed">
                  <p className="font-semibold text-light mb-2">🎯 Interpretación</p>
                  <p>
                    {showHelpModal === 'contable' && 
                      'Estado de resultados completo que incluye todos los ingresos, costos y gastos contables: depreciación, amortizaciones, intereses, impuestos y todos los demás gastos. Muestra la utilidad neta real según normas contables y fiscales.'
                    }
                    {showHelpModal === 'operativo' && 
                      'Estado de resultados operativo (EBIT) que excluye únicamente los gastos financieros (intereses y comisiones bancarias). Incluye depreciación y amortizaciones. Ideal para evaluar la eficiencia operativa sin considerar la estructura de financiamiento.'
                    }
                    {showHelpModal === 'caja' && 
                      'Estado de resultados basado en flujo de efectivo (EBITDA). Excluye todos los gastos que no requieren salida inmediata de efectivo: depreciación de activos fijos, amortizaciones de intangibles, e intereses financieros. Muestra la generación real de caja operativa.'
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PnlAnalysis;
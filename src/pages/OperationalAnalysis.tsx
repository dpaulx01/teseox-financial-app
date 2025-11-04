import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Factory, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  Percent,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Activity,
  Zap,
  Users,
  Calendar,
  Clock,
  Eye,
  Search,
  Settings
} from 'lucide-react';
import { useFinancialData } from '../contexts/DataContext';
import { 
  ProductionData, 
  OperationalMetrics, 
  ProductionConfig, 
  CombinedData 
} from '../types';
import {
  loadProductionData,
  loadProductionConfig,
  calculateOperationalMetrics,
  saveProductionConfig,
  saveCombinedData,
  loadCombinedData,
  validateProductionConfig,
} from '../utils/productionStorage';
import { suggestConfigValues, validateSuggestions } from '../utils/configSuggestions';
import YearSelector from '../components/production/YearSelector';
import AdvancedOperationalAnalytics from '../components/operational/AdvancedOperationalAnalytics';
import OperationalScenarioSimulator from '../components/operational/OperationalScenarioSimulator';
import OperationalAnalysisTypeSelector, { OperationalAnalysisType } from '../components/operational/OperationalAnalysisTypeSelector';
import DetailedOperationalAnalysis from '../components/operational/DetailedOperationalAnalysis';
import OperationalAnalysisViewTypeSelector, { OperationalAnalysisViewType } from '../components/operational/OperationalAnalysisViewTypeSelector';
import { formatCurrency } from '../utils/formatters';
import KpiCard from '../components/ui/KpiCard';
import OperationalInsights from '../components/operational/OperationalInsights';

interface OperationalAnalysisProps {
  onNavigateToConfig?: () => void;
}

const OperationalAnalysis: React.FC<OperationalAnalysisProps> = ({ onNavigateToConfig }) => {
  const { data: financialData } = useFinancialData();
  
  const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = useMemo(() => ({
    capacidadMaximaMensual: 1000,
    costoFijoProduccion: 50000,
    metaPrecioPromedio: 180,
    metaMargenMinimo: 25,
  }), []);
  
  // Estados
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [combinedData, setCombinedData] = useState<CombinedData | null>(null);
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics[]>([]);
  const [config, setConfig] = useState<ProductionConfig>(DEFAULT_PRODUCTION_CONFIG);
  const [hasCustomConfig, setHasCustomConfig] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'annual' | 'advanced' | 'simulator' | 'config'>('overview');
  const [analysisView, setAnalysisView] = useState<OperationalAnalysisViewType>('contable');
  const [detailedView, setDetailedView] = useState<'operational' | 'ebitda'>('operational');
  const [detailedAnalysisType, setDetailedAnalysisType] = useState<OperationalAnalysisType>('efficiency');
  const [configAlert, setConfigAlert] = useState<{ tone: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Cargar datos al iniciar y cuando cambie el año
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar datos de producción del año seleccionado desde MySQL
        const production = await loadProductionData(selectedYear);
        const prodConfig = await loadProductionConfig(selectedYear);
        
        if (production.length > 0) {
          setProductionData(production);
          setSelectedMonth(production[0].month);
        } else {
          setProductionData([]);
          setSelectedMonth('');
        }
        
        const configToUse = prodConfig ?? DEFAULT_PRODUCTION_CONFIG;
        setConfig(configToUse);
        setHasCustomConfig(!!prodConfig);

        if (financialData && production.length > 0) {
          const metrics = calculateOperationalMetrics(production, financialData, configToUse);
          setOperationalMetrics(metrics);
        } else {
          setOperationalMetrics([]);
        }

        const combined = await loadCombinedData(selectedYear);
        setCombinedData(combined);
        setConfigAlert(null);
      } catch (error) {
        console.error('Error loading production data:', error);
        setProductionData([]);
        setOperationalMetrics([]);
      }
    };

    loadData();
  }, [financialData, selectedYear]);

  useEffect(() => {
    if (!configAlert) {
      return;
    }
    const timer = window.setTimeout(() => setConfigAlert(null), 4000);
    return () => window.clearTimeout(timer);
  }, [configAlert]);

  // Meses disponibles ordenados cronológicamente
  const availableMonths = useMemo(() => {
    const months = productionData.map(p => p.month);
    // Ordenar meses cronológicamente (enero, febrero, marzo, etc.)
    return months.sort((a, b) => {
      const monthOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return monthOrder.indexOf(a) - monthOrder.indexOf(b);
    });
  }, [productionData]);

  // Datos del mes seleccionado o datos anuales
  const selectedMonthData = useMemo(() => {
    if (!selectedMonth) return null;
    
    if (viewMode === 'annual') {
      // Para vista anual, calcular métricas consolidadas ponderadas
      const totalProducidos = productionData.reduce((sum, p) => sum + p.metrosProducidos, 0);
      const totalVendidos = productionData.reduce((sum, p) => sum + p.metrosVendidos, 0);
      
      // Calcular totales financieros para promedios ponderados correctos
      const totalIngresosPorVentas = operationalMetrics.reduce((sum, m) => {
        const prodData = productionData.find(p => p.month === m.month);
        return sum + (m.precioVentaPorMetro * (prodData?.metrosVendidos || 0));
      }, 0);
      
      const totalCostosPorProduccion = operationalMetrics.reduce((sum, m) => {
        const prodData = productionData.find(p => p.month === m.month);
        return sum + (m.costoProduccionPorMetro * (prodData?.metrosProducidos || 0));
      }, 0);
      
      // Promedios ponderados por volumen
      const promedioPrecio = totalVendidos > 0 ? totalIngresosPorVentas / totalVendidos : 0;
      const promedioCosto = totalProducidos > 0 ? totalCostosPorProduccion / totalProducidos : 0;
      const promedioMargenPorMetro = promedioPrecio - promedioCosto;
      const promedioMargen = promedioPrecio > 0 ? (promedioMargenPorMetro / promedioPrecio) * 100 : 0;
      
      // Calcular totales financieros anuales
      const totalIngresos = financialData ? Object.values(financialData.monthly).reduce((sum, month) => sum + month.ingresos, 0) : 0;
      const totalCostoVentas = financialData ? Object.values(financialData.monthly).reduce((sum, month) => sum + (month.costoVentasTotal || 0), 0) : 0;
      const totalGastosOperativos = financialData ? Object.values(financialData.monthly).reduce((sum, month) => sum + (month.gastosOperativos || 0), 0) : 0;
      
      const annualProduction = {
        month: 'Anual',
        metrosProducidos: totalProducidos,
        metrosVendidos: totalVendidos
      };
      
      const annualOperational = {
        month: 'Anual',
        precioVentaPorMetro: promedioPrecio,
        costoProduccionPorMetro: promedioCosto,
        margenPorMetro: promedioMargenPorMetro,
        margenPorcentual: promedioMargen,
        eficienciaVentas: totalProducidos > 0 ? (totalVendidos / totalProducidos) * 100 : 0
      };
      
      const annualFinancial = {
        ingresos: totalIngresos,
        costoVentasTotal: totalCostoVentas,
        gastosOperativos: totalGastosOperativos,
        utilidadBruta: totalIngresos - totalCostoVentas,
        ebitda: totalIngresos - totalCostoVentas - totalGastosOperativos
      };
      
      return { production: annualProduction, operational: annualOperational, financial: annualFinancial };
    } else {
      // Para vista mensual normal
      const production = productionData.find(p => p.month === selectedMonth);
      const operational = operationalMetrics.find(m => m.month === selectedMonth);
      const financial = financialData?.monthly[selectedMonth];
      
      return { production, operational, financial };
    }
  }, [selectedMonth, productionData, operationalMetrics, financialData, viewMode]);

  // KPIs principales
  const mainKPIs = useMemo(() => {
    if (!selectedMonthData?.operational || !selectedMonthData?.production) return [];

    const { operational, production } = selectedMonthData;
    
    const baseKPIs = [
      {
        title: viewMode === 'annual' ? 'Precio Promedio/m²' : 'Precio Venta/m²',
        value: formatCurrency(operational.precioVentaPorMetro),
        icon: DollarSign,
        color: 'accent'
      },
      {
        title: viewMode === 'annual' ? 'Costo Promedio/m²' : 'Costo Producción/m²',
        value: formatCurrency(operational.costoProduccionPorMetro),
        icon: Factory,
        color: 'warning'
      },
      {
        title: viewMode === 'annual' ? 'Margen Promedio/m²' : 'Margen/m²',
        value: formatCurrency(operational.margenPorMetro),
        icon: TrendingUp,
        color: operational.margenPorMetro >= 0 ? 'accent' : 'danger'
      },
      {
        title: viewMode === 'annual' ? 'Eficiencia Global' : 'Eficiencia Ventas',
        value: `${operational.eficienciaVentas.toFixed(1)}%`,
        icon: Target,
        color: operational.eficienciaVentas >= 80 ? 'accent' : operational.eficienciaVentas >= 60 ? 'warning' : 'danger'
      }
    ];
    
    // Para vista anual, agregar métricas adicionales
    if (viewMode === 'annual') {
      baseKPIs.push({
        title: 'Total Producidos',
        value: `${production.metrosProducidos.toLocaleString('es-EC')} m²`,
        icon: Activity,
        color: 'primary'
      });
    }
    
    return baseKPIs;
  }, [selectedMonthData, viewMode]);

  // Métricas de rendimiento (ponderadas correctamente)
  const performanceMetrics = useMemo(() => {
    if (!operationalMetrics.length || !config || !productionData.length) return null;

    const totalProducidos = productionData.reduce((sum, p) => sum + (p.metrosProducidos || 0), 0);
    const totalVendidos = productionData.reduce((sum, p) => sum + (p.metrosVendidos || 0), 0);
    
    // Promedios ponderados por volumen (consistente con cálculos anuales)
    const totalIngresosPorVentas = operationalMetrics.reduce((sum, m) => {
      const prodData = productionData.find(p => p.month === m.month);
      return sum + (m.precioVentaPorMetro * (prodData?.metrosVendidos || 0));
    }, 0);
    
    const promedioPrecio = totalVendidos > 0 ? totalIngresosPorVentas / totalVendidos : 0;
    
    // Calcular margen ponderado usando datos financieros si están disponibles
    const promedioMargen = financialData 
      ? Object.values(financialData.monthly).reduce((sum, month) => {
          return sum + (month.ingresos > 0 ? (month.utilidadNeta / month.ingresos) * 100 : 0);
        }, 0) / Object.keys(financialData.monthly).length
      : operationalMetrics.reduce((sum, m) => sum + (m.margenPorcentual || 0), 0) / operationalMetrics.length;
    
    // Capacidad utilizada con validación
    const capacidadUtilizada = (config.capacidadMaximaMensual > 0 && operationalMetrics.length > 0) 
      ? (totalProducidos / (config.capacidadMaximaMensual * operationalMetrics.length)) * 100 
      : 0;

    return {
      totalProducidos,
      totalVendidos,
      eficienciaGlobal: totalProducidos > 0 ? (totalVendidos / totalProducidos) * 100 : 0,
      promedioMargen,
      promedioPrecio,
      capacidadUtilizada
    };
  }, [operationalMetrics, productionData, config, financialData]);

  const handleConfigFieldChange = useCallback((field: keyof ProductionConfig, value: number) => {
    setConfig((prev) => ({
      ...prev,
      [field]: Number.isFinite(value) ? value : 0,
    }));
  }, []);

  const handleAnalysisSuggest = useCallback(() => {
    if (!financialData || productionData.length === 0) {
      setConfigAlert({
        tone: 'error',
        message: 'Se requieren datos financieros y de producción para sugerir valores.',
      });
      return;
    }

    const suggestions = suggestConfigValues(financialData, productionData);
    const warnings = validateSuggestions(suggestions);
    setConfig((prev) => ({ ...prev, ...suggestions }));

    if (warnings.length) {
      setConfigAlert({
        tone: 'warning',
        message: `Valores aplicados con observaciones: ${warnings.join(' ')}`,
      });
    } else {
      setConfigAlert({
        tone: 'success',
        message: 'Valores sugeridos aplicados basados en datos reales.',
      });
    }
  }, [financialData, productionData]);

  const handleAnalysisSave = useCallback(async () => {
    const validationErrors = validateProductionConfig(config);
    if (validationErrors.length) {
      setConfigAlert({ tone: 'error', message: validationErrors.join('. ') });
      return;
    }

    try {
      setConfigLoading(true);
      await saveProductionConfig(config, selectedYear);
      setHasCustomConfig(true);

      if (financialData && productionData.length > 0) {
        const metrics = calculateOperationalMetrics(productionData, financialData, config);
        setOperationalMetrics(metrics);

        const combined: CombinedData = {
          financial: financialData,
          production: productionData,
          operational: metrics,
          config,
          lastUpdated: new Date().toISOString(),
        };

        await saveCombinedData(combined, selectedYear);
        setCombinedData(combined);
        setConfigAlert({ tone: 'success', message: 'Configuración guardada y métricas recalculadas.' });
      } else {
        setConfigAlert({
          tone: 'warning',
          message: 'Configuración guardada. Carga datos financieros y de producción para recalcular métricas.',
        });
      }
    } catch (error) {
      setConfigAlert({
        tone: 'error',
        message: (error as Error).message || 'No se pudo guardar la configuración operativa.',
      });
    } finally {
      setConfigLoading(false);
    }
  }, [config, financialData, productionData, selectedYear]);

  // Validaciones robustas de datos
  if (!productionData.length && !combinedData) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Factory className="w-24 h-24 text-primary mx-auto opacity-50" />
          <div>
            <h2 className="text-2xl font-display text-primary mb-2">
              No hay datos de producción
            </h2>
            <p className="text-text-muted font-mono mb-6">
              Configure primero los datos de producción en la sección de Configuración
            </p>
            <button
              onClick={() => onNavigateToConfig ? onNavigateToConfig() : setViewMode('config')}
              className="cyber-button"
            >
              Ir a Configuración
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Validar datos mínimos requeridos
  if (!operationalMetrics.length && productionData.length > 0) {
    let helperMessage = 'Se requieren datos financieros para calcular las métricas operacionales';
    if (financialData) {
      helperMessage = hasCustomConfig
        ? 'No fue posible calcular las métricas operacionales con la configuración actual'
        : 'Define la capacidad y costos en la sección Configuración para habilitar el análisis automático';
    }

    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AlertCircle className="w-24 h-24 text-warning mx-auto opacity-50" />
          <div>
            <h2 className="text-2xl font-display text-warning mb-2">
              Datos incompletos
            </h2>
            <p className="text-text-muted font-mono mb-6">
              {helperMessage}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 🎯 NIVEL 1 - HEADER & CONFIGURACIÓN GLOBAL */}
      <div className="relative overflow-hidden">
        <div className="hologram-card p-6 rounded-3xl shadow-hologram border border-primary/30 bg-gradient-to-br from-primary/5 via-dark-card/80 to-accent/5">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern" />
          </div>
          
          <div className="relative z-10">
            {/* Main Header */}
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center space-y-4 xl:space-y-0 mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-primary/30 to-accent/20 rounded-2xl shadow-glow-primary border border-primary/40">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full shadow-glow-accent animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Análisis Operativo
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                      <span className="font-mono">Performance Integral</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-warning rounded-full" />
                      <span className="font-mono">{productionData.length} meses de datos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Controls - Nivel 1 */}
              <div className="glass-card p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-primary">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-semibold">Período:</span>
                    </div>
                    <YearSelector
                      selectedYear={selectedYear}
                      onYearChange={setSelectedYear}
                      className="min-w-[140px]"
                    />
                  </div>
                  
                  <div className="w-px h-6 bg-primary/30 hidden sm:block" />
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-primary">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-semibold">Mes:</span>
                    </div>
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)} 
                      className="px-3 py-2 glass-card border border-primary/30 text-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 font-mono rounded-lg bg-primary/5 min-w-[120px]"
                      disabled={availableMonths.length === 0}
                    >
                      {availableMonths.length > 0 ? (
                        availableMonths.map(month => (
                          <option key={month} value={month} className="bg-dark-card text-text-secondary">
                            {month}
                          </option>
                        ))
                      ) : (
                        <option value="">No hay datos para {selectedYear}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Indicators */}
            {selectedMonthData?.operational && (
              <div className="flex justify-center">
                <div className="flex items-center space-x-4 bg-glass/30 backdrop-blur-sm p-3 rounded-xl border border-border/30">
                  <div className="text-center">
                    <div className="text-xs text-text-muted mb-1">Margen Actual</div>
                    <div className={`font-mono font-bold text-sm ${
                      selectedMonthData.operational.margenPorcentual >= 20 ? 'text-success' :
                      selectedMonthData.operational.margenPorcentual >= 10 ? 'text-warning' : 'text-danger'
                    }`}>
                      {selectedMonthData.operational.margenPorcentual.toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-px h-8 bg-border/50" />
                  <div className="text-center">
                    <div className="text-xs text-text-muted mb-1">Eficiencia</div>
                    <div className={`font-mono font-bold text-sm ${
                      selectedMonthData.operational.eficienciaVentas >= 90 ? 'text-success' :
                      selectedMonthData.operational.eficienciaVentas >= 75 ? 'text-warning' : 'text-danger'
                    }`}>
                      {selectedMonthData.operational.eficienciaVentas.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📊 NIVEL 2 - SELECTOR DE MODO DE ANÁLISIS */}
      <div className="hologram-card p-6 rounded-2xl shadow-hologram border border-accent/20">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-accent to-primary rounded-full" />
            <h2 className="text-xl font-display font-bold text-accent">Seleccionar Modo de Análisis</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-accent/50 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { id: 'overview', label: 'General', icon: Eye, description: 'Vista general de KPIs', color: 'primary' },
              { id: 'detailed', label: 'Detallado', icon: Search, description: 'Análisis por tipos', color: 'accent' },
              { id: 'annual', label: 'Anual', icon: Calendar, description: 'Consolidado anual', color: 'warning' },
              { id: 'advanced', label: 'Avanzado', icon: TrendingUp, description: 'Métricas avanzadas', color: 'success' },
              { id: 'simulator', label: 'Simulador', icon: Settings, description: 'Escenarios Monte Carlo', color: 'info' },
              { id: 'config', label: 'Configuración', icon: Settings, description: 'Ajusta metas operativas', color: 'accent' }
            ].map((view) => {
              const IconComponent = view.icon;
              const isActive = viewMode === view.id;
              
              return (
                <motion.button
                  key={view.id}
                  onClick={() => setViewMode(view.id as any)}
                  className={`group relative p-4 rounded-xl text-center transition-all duration-300 ${
                    isActive
                      ? `bg-${view.color}/20 border-2 border-${view.color}/50 shadow-glow-${view.color}`
                      : 'glass-card border border-border/30 hover:border-accent/50 hover:bg-accent/5'
                  }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg mx-auto w-fit transition-all duration-300 ${
                      isActive 
                        ? `bg-${view.color}/30 border border-${view.color}/40` 
                        : 'bg-accent/10 border border-accent/20 group-hover:bg-accent/20'
                    }`}>
                      <IconComponent className={`w-6 h-6 transition-colors duration-300 ${
                        isActive ? `text-${view.color}` : 'text-accent group-hover:text-accent'
                      }`} />
                    </div>
                    
                    <div>
                      <div className={`font-display font-bold text-sm transition-colors duration-300 ${
                        isActive ? `text-${view.color}` : 'text-text-primary group-hover:text-accent'
                      }`}>
                        {view.label}
                      </div>
                      <p className={`text-xs mt-1 transition-colors duration-300 ${
                        isActive ? `text-${view.color}/80` : 'text-text-muted group-hover:text-text-secondary'
                      }`}>
                        {view.description}
                      </p>
                    </div>
                  </div>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeViewIndicator"
                      className={`absolute top-2 right-2 w-3 h-3 bg-${view.color} rounded-full shadow-glow-${view.color}`}
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {viewMode === 'config' && (
        <motion.div
          key="config-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {configAlert && (
            <div
              className={`p-4 rounded-xl border text-sm font-mono ${
                configAlert.tone === 'success'
                  ? 'border-success/40 bg-success/10 text-success'
                  : configAlert.tone === 'warning'
                  ? 'border-warning/40 bg-warning/10 text-warning'
                  : 'border-danger/40 bg-danger/10 text-danger'
              }`}
            >
              {configAlert.message}
            </div>
          )}

          <div className="hologram-card p-6 rounded-2xl shadow-hologram">
            <div className="flex items-center space-x-3 mb-6">
              <Settings className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-display text-primary text-glow">
                Configuración Operativa del Año {selectedYear}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">
                  Capacidad Máxima Mensual (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={config.capacidadMaximaMensual}
                  onChange={(e) => handleConfigFieldChange('capacidadMaximaMensual', Number(e.target.value))}
                  disabled={configLoading}
                  className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">
                  Costo Fijo Producción ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.costoFijoProduccion}
                  onChange={(e) => handleConfigFieldChange('costoFijoProduccion', Number(e.target.value))}
                  disabled={configLoading}
                  className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">
                  Meta Precio Promedio ($/m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.metaPrecioPromedio}
                  onChange={(e) => handleConfigFieldChange('metaPrecioPromedio', Number(e.target.value))}
                  disabled={configLoading}
                  className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-display text-text-secondary mb-2">
                  Meta Margen Mínimo (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.metaMargenMinimo}
                  onChange={(e) => handleConfigFieldChange('metaMargenMinimo', Number(e.target.value))}
                  disabled={configLoading}
                  className="w-full p-3 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between">
              <button
                onClick={handleAnalysisSuggest}
                disabled={!financialData || productionData.length === 0 || configLoading}
                className="cyber-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Target className="w-4 h-4" />
                <span>Auto-Sugerir con Datos Reales</span>
              </button>

              <button
                onClick={handleAnalysisSave}
                disabled={configLoading}
                className="cyber-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {configLoading ? (
                  <span>Guardando…</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar y Recalcular</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono text-text-muted">
              <div className="glass-card p-4 border border-border/40 rounded-lg">
                <p className="text-xs uppercase tracking-wide text-text-secondary mb-1">Estado</p>
                <p className={hasCustomConfig ? 'text-success font-semibold' : 'text-warning font-semibold'}>
                  {hasCustomConfig ? 'Configuración personalizada activa' : 'Usando valores predeterminados'}
                </p>
              </div>
              <div className="glass-card p-4 border border-border/40 rounded-lg">
                <p className="text-xs uppercase tracking-wide text-text-secondary mb-1">Datos financieros</p>
                <p className={financialData ? 'text-accent font-semibold' : 'text-warning font-semibold'}>
                  {financialData ? 'Datos cargados' : 'Pendiente de carga'}
                </p>
              </div>
              <div className="glass-card p-4 border border-border/40 rounded-lg">
                <p className="text-xs uppercase tracking-wide text-text-secondary mb-1">Datos producción</p>
                <p className={productionData.length > 0 ? 'text-accent font-semibold' : 'text-warning font-semibold'}>
                  {productionData.length > 0 ? `${productionData.length} meses sincronizados` : 'Sin datos disponibles'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ⚙️ NIVEL 3 - OPCIONES CONTEXTUALES */}
      {viewMode !== 'config' && (viewMode === 'detailed' || viewMode === 'annual') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="hologram-card p-5 rounded-xl shadow-hologram border border-warning/20 bg-warning/5"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-5 bg-gradient-to-b from-warning to-accent rounded-full" />
              <h3 className="text-lg font-display font-bold text-warning">
                Opciones de {viewMode === 'detailed' ? 'Análisis Detallado' : 'Vista Anual'}
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-warning/50 to-transparent" />
            </div>
            
            {viewMode === 'detailed' && (
              <OperationalAnalysisTypeSelector
                selectedType={detailedAnalysisType}
                onTypeChange={setDetailedAnalysisType}
              />
            )}
            
            {viewMode === 'annual' && (
              <OperationalAnalysisViewTypeSelector
                selectedType={analysisView}
                onTypeChange={setAnalysisView}
              />
            )}
          </div>
        </motion.div>
      )}

      {/* 📊 CONTENIDO PRINCIPAL */}
      <div className="space-y-6">
        {/* KPIs Section */}
        {mainKPIs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
              <h3 className="text-2xl font-display font-bold text-primary">KPIs Principales</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
              <div className="text-sm text-text-muted font-mono bg-glass/30 px-3 py-1 rounded-full">
                {selectedMonth} • {selectedYear}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mainKPIs.map((kpi, index) => (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="group"
                >
                  <KpiCard {...kpi} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* 🗂️ CONTENIDO ESPECÍFICO POR MODO */}
      {viewMode === 'annual' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="annual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Consolidado Anual */}
            <div className="hologram-card p-6 rounded-2xl shadow-hologram">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-warning to-primary rounded-full" />
                <h3 className="text-2xl font-display text-primary text-glow">
                  Consolidado Anual - Vista {analysisView === 'caja' ? 'EBITDA' : analysisView === 'operativo' ? 'Operativa' : 'Contable'}
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
                <div className="text-sm text-text-muted font-mono bg-glass/30 px-3 py-1 rounded-full">
                  {selectedYear} • Todos los Meses
                </div>
              </div>
              
              {operationalMetrics.length > 0 && (
                <div className="space-y-6">
                  
                  {/* Métricas Totales Anuales */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
                      <div className="text-2xl font-mono text-accent mb-2">
                        {productionData.reduce((sum, p) => sum + (p.metrosProducidos || 0), 0).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-text-muted">Total m² Producidos</div>
                    </div>
                    
                    <div className="glass-card p-4 border border-primary/30 rounded-lg text-center">
                      <div className="text-2xl font-mono text-primary mb-2">
                        {productionData.reduce((sum, p) => sum + (p.metrosVendidos || 0), 0).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-text-muted">Total m² Vendidos</div>
                    </div>
                    
                    <div className="glass-card p-4 border border-warning/30 rounded-lg text-center">
                      <div className="text-2xl font-mono text-warning mb-2">
                        {(() => {
                          const totalVendidos = productionData.reduce((sum, p) => sum + (p.metrosVendidos || 0), 0);
                          const totalIngresosPorVentas = operationalMetrics.reduce((sum, m) => {
                            const prodData = productionData.find(p => p.month === m.month);
                            return sum + (m.precioVentaPorMetro * (prodData?.metrosVendidos || 0));
                          }, 0);
                          const promedioPonderado = totalVendidos > 0 ? totalIngresosPorVentas / totalVendidos : 0;
                          return formatCurrency(promedioPonderado);
                        })()}
                      </div>
                      <div className="text-sm text-text-muted">Precio Promedio/m² (Ponderado)</div>
                    </div>
                    
                    <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
                      <div className="text-2xl font-mono text-accent mb-2">
                        {analysisView === 'caja' 
                          ? formatCurrency(financialData?.yearly?.ebitda || 0)
                          : analysisView === 'operativo'
                          ? formatCurrency(financialData?.yearly?.utilidadOperacional || 0)
                          : formatCurrency(financialData?.yearly?.utilidadNeta || 0)
                        }
                      </div>
                      <div className="text-sm text-text-muted">
                        {analysisView === 'caja' ? 'EBITDA Anual' : 
                         analysisView === 'operativo' ? 'Utilidad Operativa Anual' : 
                         'Utilidad Neta Anual'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Segmentación de Costos - USANDO DATOS MENSUALES COMO LA TABLA */}
                  {financialData && availableMonths.length > 0 && (
                    <div className="hologram-card p-6 rounded-2xl shadow-hologram">
                      <h4 className="text-xl font-display text-primary text-glow mb-4">
                        Segmentación de Costos (Anual) - Vista {analysisView === 'caja' ? 'EBITDA' : analysisView === 'operativo' ? 'Operativa' : 'Contable'}
                      </h4>
                      
                      {(() => {
                        // CALCULAR TOTALES ANUALES USANDO LOS MISMOS DATOS QUE LA TABLA
                        let totalMateriaPrima = 0;
                        let totalProduccion = 0;
                        let totalOperativo = 0;
                        
                        availableMonths.forEach(month => {
                          const monthFinancial = financialData.monthly[month];
                          if (monthFinancial) {
                            if (analysisView === 'caja') {
                              // Vista EBITDA (Caja): Ajustar costos excluyendo depreciación
                              totalMateriaPrima += monthFinancial.costoMateriaPrima || 0;
                              // Reducir costos de producción eliminando % de depreciación
                              totalProduccion += (monthFinancial.costoProduccion || 0) - (monthFinancial.depreciacion || 0) * 0.6;
                              // Reducir costos operativos eliminando % de depreciación
                              totalOperativo += (monthFinancial.costoOperativo || 0) - (monthFinancial.depreciacion || 0) * 0.4;
                            } else if (analysisView === 'operativo') {
                              // Vista Operativa (EBIT): Incluir depreciación, excluir intereses
                              totalMateriaPrima += monthFinancial.costoMateriaPrima || 0;
                              totalProduccion += monthFinancial.costoProduccion || 0;
                              totalOperativo += (monthFinancial.costoOperativo || 0) - (monthFinancial.gastosFinancieros || 0);
                            } else {
                              // Vista Contable: Incluir todos los costos
                              totalMateriaPrima += monthFinancial.costoMateriaPrima || 0;
                              totalProduccion += monthFinancial.costoProduccion || 0;
                              totalOperativo += monthFinancial.costoOperativo || 0;
                            }
                          }
                        });
                        
                        return (
                          <>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
                                <div className="text-2xl font-mono text-accent mb-2">
                                  {formatCurrency(totalMateriaPrima)}
                                </div>
                                <div className="text-sm text-text-muted">Costo Materia Prima</div>
                                <div className="text-xs text-text-muted mt-1">5.1.1.6</div>
                              </div>
                              
                              <div className="glass-card p-4 border border-primary/30 rounded-lg text-center">
                                <div className="text-2xl font-mono text-primary mb-2">
                                  {formatCurrency(totalProduccion)}
                                </div>
                                <div className="text-sm text-text-muted">Costo Producción</div>
                                <div className="text-xs text-text-muted mt-1">
                                  {analysisView === 'caja' ? '5.1.x (sin depreciación 60%)' : 
                                   analysisView === 'operativo' ? '5.1.x (con depreciación)' : 
                                   '5.1.x (todos los costos)'}
                                </div>
                              </div>
                              
                              <div className="glass-card p-4 border border-warning/30 rounded-lg text-center">
                                <div className="text-2xl font-mono text-warning mb-2">
                                  {formatCurrency(totalOperativo)}
                                </div>
                                <div className="text-sm text-text-muted">Costo Operativo</div>
                                <div className="text-xs text-text-muted mt-1">
                                  {analysisView === 'caja' ? '5.2.x + 5.3.x (sin depreciación 40%)' : 
                                   analysisView === 'operativo' ? '5.2.x + 5.3.x (sin intereses)' : 
                                   '5.2.x + 5.3.x (todos)'}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      
                      {/* Comparación con métricas operativas - USANDO DATOS CALCULADOS */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-mono text-text-secondary mb-1">
                              {(() => {
                                // Calcular totales usando datos mensuales - USAR CAMPOS QUE SÍ FUNCIONAN
                                let totalCostos = 0;
                                availableMonths.forEach(month => {
                                  const monthFinancial = financialData.monthly[month];
                                  if (monthFinancial) {
                                    if (analysisView === 'caja') {
                                      // Vista EBITDA (Caja): Usar costos sin depreciación
                                      const materiaPrima = monthFinancial.costoMateriaPrima || 0;
                                      const produccion = (monthFinancial.costoProduccion || 0) - (monthFinancial.depreciacion || 0) * 0.6;
                                      const operativo = (monthFinancial.costoOperativo || 0) - (monthFinancial.depreciacion || 0) * 0.4;
                                      totalCostos += materiaPrima + produccion + operativo;
                                    } else if (analysisView === 'operativo') {
                                      // Vista Operativa (EBIT): Incluir depreciación, excluir intereses
                                      totalCostos += (monthFinancial.costoVentasTotal || 0) + 
                                                    (monthFinancial.gastosOperativos || 0) - 
                                                    (monthFinancial.gastosFinancieros || 0);
                                    } else {
                                      // Vista Contable: Incluir todos los costos
                                      totalCostos += (monthFinancial.costoVentasTotal || 0) + 
                                                    (monthFinancial.gastosOperativos || 0) +
                                                    (monthFinancial.gastosFinancieros || 0);
                                    }
                                  }
                                });
                                return formatCurrency(totalCostos);
                              })()}
                            </div>
                            <div className="text-sm text-text-muted">Total Costos (Vista {analysisView === 'caja' ? 'EBITDA' : analysisView === 'operativo' ? 'Operativa' : 'Contable'})</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-mono text-text-secondary mb-1">
                              {(() => {
                                // Calcular utilidad total usando datos mensuales
                                let totalUtilidad = 0;
                                availableMonths.forEach(month => {
                                  const monthFinancial = financialData.monthly[month];
                                  if (monthFinancial) {
                                    totalUtilidad += analysisView === 'caja' 
                                      ? (monthFinancial.ebitda || 0)
                                      : analysisView === 'operativo'
                                      ? (monthFinancial.utilidadOperacional || 0)
                                      : (monthFinancial.utilidadNeta || 0);
                                  }
                                });
                                return formatCurrency(totalUtilidad);
                              })()}
                            </div>
                            <div className="text-sm text-text-muted">{analysisView === 'caja' ? 'EBITDA Anual' : analysisView === 'operativo' ? 'Utilidad Operativa Anual' : 'Utilidad Neta Anual'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tabla Detallada por Mes */}
                  <div className="glass-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-primary/10 border-b border-primary/30">
                          <tr>
                            <th className="text-left p-4 font-display text-primary">Mes</th>
                            <th className="text-right p-4 font-display text-primary">Producidos (m²)</th>
                            <th className="text-right p-4 font-display text-primary">Vendidos (m²)</th>
                            <th className="text-right p-4 font-display text-primary">Precio/m²</th>
                            <th className="text-right p-4 font-display text-primary">Costo/m²</th>
                            <th className="text-right p-4 font-display text-primary">Margen/m²</th>
                            <th className="text-right p-4 font-display text-primary">{analysisView === 'caja' ? 'Margen EBITDA %' : analysisView === 'operativo' ? 'Margen Operativo %' : 'Margen Neto %'}</th>
                            <th className="text-right p-4 font-display text-primary">Eficiencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableMonths.map((month) => {
                            const prod = productionData.find(p => p.month === month);
                            const metrics = operationalMetrics.find(m => m.month === month);
                            const monthFinancial = financialData?.monthly[month];
                            
                            if (!prod || !metrics) return null;
                            
                            // Calcular métricas según vista actual
                            let costoAjustado = metrics.costoProduccionPorMetro;
                            let margenAjustado = metrics.margenPorMetro;
                            let margenPorcentual = metrics.margenPorcentual;
                            
                            if (monthFinancial && prod.metrosVendidos > 0) {
                              if (analysisView === 'caja') {
                                // Para vista EBITDA (Caja), usar datos financieros directos
                                const costoRealPorMetro = monthFinancial.costoVentasTotal / prod.metrosVendidos;
                                costoAjustado = costoRealPorMetro;
                                
                                // Calcular margen EBITDA por metro
                                const ebitdaPorMetro = monthFinancial.ebitda / prod.metrosVendidos;
                                margenAjustado = ebitdaPorMetro;
                                
                                // Margen EBITDA porcentual
                                margenPorcentual = monthFinancial.ingresos > 0 
                                  ? (monthFinancial.ebitda / monthFinancial.ingresos) * 100 
                                  : 0;
                              } else if (analysisView === 'operativo') {
                                // Para vista Operativa (EBIT), usar utilidad operacional
                                const costoOperativoPorMetro = (monthFinancial.costoVentasTotal + monthFinancial.gastosOperativos - (monthFinancial.gastosFinancieros || 0)) / prod.metrosVendidos;
                                costoAjustado = costoOperativoPorMetro;
                                
                                // Calcular margen operativo por metro
                                const utilidadOperativaPorMetro = (monthFinancial.utilidadOperacional || 0) / prod.metrosVendidos;
                                margenAjustado = utilidadOperativaPorMetro;
                                
                                // Margen operativo porcentual
                                margenPorcentual = monthFinancial.ingresos > 0 
                                  ? ((monthFinancial.utilidadOperacional || 0) / monthFinancial.ingresos) * 100 
                                  : 0;
                              } else {
                                // Para vista Contable, usar utilidad neta
                                const costoContablePorMetro = (monthFinancial.costoVentasTotal + monthFinancial.gastosOperativos + (monthFinancial.gastosFinancieros || 0)) / prod.metrosVendidos;
                                costoAjustado = costoContablePorMetro;
                                
                                // Calcular margen neto por metro
                                const utilidadNetaPorMetro = monthFinancial.utilidadNeta / prod.metrosVendidos;
                                margenAjustado = utilidadNetaPorMetro;
                                
                                // Margen neto porcentual
                                margenPorcentual = monthFinancial.ingresos > 0 
                                  ? (monthFinancial.utilidadNeta / monthFinancial.ingresos) * 100 
                                  : 0;
                              }
                            }
                            
                            return (
                              <tr key={month} className="border-b border-border/50 hover:bg-glass/50 transition-colors">
                                <td className="p-4 font-mono text-text-secondary font-semibold">{month}</td>
                                <td className="p-4 font-mono text-text-secondary text-right">
                                  {prod.metrosProducidos.toLocaleString('es-EC', { minimumFractionDigits: 0 })}
                                </td>
                                <td className="p-4 font-mono text-text-secondary text-right">
                                  {prod.metrosVendidos.toLocaleString('es-EC', { minimumFractionDigits: 0 })}
                                </td>
                                <td className="p-4 font-mono text-primary text-right font-semibold">
                                  {formatCurrency(metrics.precioVentaPorMetro)}
                                </td>
                                <td className="p-4 font-mono text-warning text-right">
                                  {formatCurrency(costoAjustado)}
                                </td>
                                <td className={`p-4 font-mono text-right font-semibold ${
                                  margenAjustado >= 0 ? 'text-accent' : 'text-danger'
                                }`}>
                                  {formatCurrency(margenAjustado)}
                                </td>
                                <td className={`p-4 font-mono text-right font-semibold ${
                                  margenPorcentual >= 20 ? 'text-accent' : 
                                  margenPorcentual >= 10 ? 'text-warning' : 'text-danger'
                                }`}>
                                  {margenPorcentual.toFixed(1)}%
                                </td>
                                <td className={`p-4 font-mono text-right font-semibold ${
                                  metrics.eficienciaVentas >= 90 ? 'text-accent' : 
                                  metrics.eficienciaVentas >= 70 ? 'text-warning' : 'text-danger'
                                }`}>
                                  {metrics.eficienciaVentas.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {viewMode === 'overview' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Métricas de Rendimiento - Adapta según el contexto */}
            {(performanceMetrics || selectedMonthData) && (
              <div className="hologram-card p-6 rounded-2xl shadow-hologram">
                <h3 className="text-2xl font-display text-primary text-glow mb-6">
                  {viewMode === 'annual' ? 'Rendimiento Global' : `Rendimiento ${selectedMonth}`}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {viewMode === 'annual' && performanceMetrics ? (
                    // Vista Global/Anual
                    <>
                      <div className="glass-card p-6 border border-accent/30 rounded-lg text-center">
                        <Activity className="w-8 h-8 text-accent mx-auto mb-3" />
                        <p className="text-3xl font-mono text-accent mb-2">
                          {performanceMetrics.totalProducidos.toLocaleString('es-EC')}
                        </p>
                        <p className="text-sm text-text-muted">Total Metros² Producidos</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-primary/30 rounded-lg text-center">
                        <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
                        <p className="text-3xl font-mono text-primary mb-2">
                          {performanceMetrics.capacidadUtilizada.toFixed(1)}%
                        </p>
                        <p className="text-sm text-text-muted">Capacidad Utilizada</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-warning/30 rounded-lg text-center">
                        <Target className="w-8 h-8 text-warning mx-auto mb-3" />
                        <p className="text-3xl font-mono text-warning mb-2">
                          {performanceMetrics.eficienciaGlobal.toFixed(1)}%
                        </p>
                        <p className="text-sm text-text-muted">Eficiencia Global</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-accent/30 rounded-lg text-center">
                        <Users className="w-8 h-8 text-accent mx-auto mb-3" />
                        <p className="text-3xl font-mono text-accent mb-2">
                          {performanceMetrics.totalVendidos.toLocaleString('es-EC')}
                        </p>
                        <p className="text-sm text-text-muted">Total Metros² Vendidos</p>
                      </div>
                    </>
                  ) : selectedMonthData && config ? (
                    // Vista Mensual
                    <>
                      <div className="glass-card p-6 border border-accent/30 rounded-lg text-center">
                        <Activity className="w-8 h-8 text-accent mx-auto mb-3" />
                        <p className="text-3xl font-mono text-accent mb-2">
                          {selectedMonthData.production?.metrosProducidos.toLocaleString('es-EC')}
                        </p>
                        <p className="text-sm text-text-muted">Metros² Producidos</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-primary/30 rounded-lg text-center">
                        <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                        <p className="text-3xl font-mono text-primary mb-2">
                          {selectedMonthData.production?.metrosVendidos.toLocaleString('es-EC')}
                        </p>
                        <p className="text-sm text-text-muted">Metros² Vendidos</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-warning/30 rounded-lg text-center">
                        <Target className="w-8 h-8 text-warning mx-auto mb-3" />
                        <p className="text-3xl font-mono text-warning mb-2">
                          {selectedMonthData.operational?.eficienciaVentas.toFixed(1)}%
                        </p>
                        <p className="text-sm text-text-muted">Eficiencia Ventas</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-accent/30 rounded-lg text-center">
                        <Zap className="w-8 h-8 text-accent mx-auto mb-3" />
                        <p className={`text-3xl font-mono mb-2 ${
                          selectedMonthData.production && config.capacidadMaximaMensual > 0 
                            ? (selectedMonthData.production.metrosProducidos / config.capacidadMaximaMensual * 100) >= 90 
                              ? 'text-accent' 
                              : (selectedMonthData.production.metrosProducidos / config.capacidadMaximaMensual * 100) >= 70 
                              ? 'text-warning' 
                              : 'text-danger'
                            : 'text-text-secondary'
                        }`}>
                          {selectedMonthData.production && config.capacidadMaximaMensual > 0 
                            ? ((selectedMonthData.production.metrosProducidos / config.capacidadMaximaMensual) * 100).toFixed(1)
                            : '0.0'
                          }%
                        </p>
                        <p className="text-sm text-text-muted">Capacidad Utilizada</p>
                      </div>
                    </>
                  ) : selectedMonthData && (
                    // Vista Mensual sin config (fallback con 3 tarjetas)
                    <>
                      <div className="glass-card p-6 border border-accent/30 rounded-lg text-center">
                        <Activity className="w-8 h-8 text-accent mx-auto mb-3" />
                        <p className="text-3xl font-mono text-accent mb-2">
                          {selectedMonthData.production?.metrosProducidos.toLocaleString('es-EC')}
                        </p>
                        <p className="text-sm text-text-muted">Metros² Producidos</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-primary/30 rounded-lg text-center">
                        <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                        <p className="text-3xl font-mono text-primary mb-2">
                          {selectedMonthData.production?.metrosVendidos.toLocaleString('es-EC')}
                        </p>
                        <p className="text-sm text-text-muted">Metros² Vendidos</p>
                      </div>
                      
                      <div className="glass-card p-6 border border-warning/30 rounded-lg text-center">
                        <Target className="w-8 h-8 text-warning mx-auto mb-3" />
                        <p className="text-3xl font-mono text-warning mb-2">
                          {selectedMonthData.operational?.eficienciaVentas.toFixed(1)}%
                        </p>
                        <p className="text-sm text-text-muted">Eficiencia Ventas</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Operational Insights */}
            {financialData && productionData.length > 0 && operationalMetrics.length > 0 && (
              <OperationalInsights
                financialData={financialData}
                productionData={productionData}
                operationalMetrics={operationalMetrics}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            )}

            {/* Alertas y Recomendaciones */}
            {selectedMonthData?.operational && config && (
              <div className="hologram-card p-6 rounded-2xl shadow-hologram">
                <h3 className="text-2xl font-display text-primary text-glow mb-6">
                  Alertas y Recomendaciones
                </h3>
                
                <div className="space-y-4">
                  {/* Alerta de margen */}
                  {selectedMonthData.operational.margenPorcentual < config.metaMargenMinimo && (
                    <div className="flex items-start space-x-3 p-4 bg-danger/10 border border-danger/30 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-danger font-display font-semibold">
                          Margen por debajo de la meta
                        </p>
                        <p className="text-text-muted text-sm font-mono">
                          Margen actual: {selectedMonthData.operational.margenPorcentual.toFixed(1)}% 
                          (Meta: {config.metaMargenMinimo}%)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Alerta de precio */}
                  {selectedMonthData.operational.precioVentaPorMetro < config.metaPrecioPromedio && (
                    <div className="flex items-start space-x-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-warning font-display font-semibold">
                          Precio promedio por debajo de la meta
                        </p>
                        <p className="text-text-muted text-sm font-mono">
                          Precio actual: {formatCurrency(selectedMonthData.operational.precioVentaPorMetro)} 
                          (Meta: {formatCurrency(config.metaPrecioPromedio)})
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Confirmación positiva */}
                  {selectedMonthData.operational.margenPorcentual >= config.metaMargenMinimo && 
                   selectedMonthData.operational.precioVentaPorMetro >= config.metaPrecioPromedio && (
                    <div className="flex items-start space-x-3 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-accent font-display font-semibold">
                          Objetivos cumplidos para {selectedMonth}
                        </p>
                        <p className="text-text-muted text-sm font-mono">
                          Margen y precio están dentro de las metas establecidas
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {viewMode === 'detailed' && financialData && (
        <AnimatePresence mode="wait">
          <motion.div
            key="detailed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Análisis Detallado */}
            <div className="hologram-card p-6 rounded-2xl shadow-hologram">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-accent to-primary rounded-full" />
                <h3 className="text-2xl font-display text-accent text-glow">
                  Análisis Detallado - {detailedAnalysisType === 'efficiency' ? 'Eficiencia' : detailedAnalysisType === 'profitability' ? 'Rentabilidad' : 'Performance'}
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-accent/50 to-transparent" />
                <div className="text-sm text-text-muted font-mono bg-glass/30 px-3 py-1 rounded-full">
                  {selectedMonth} • {selectedYear}
                </div>
              </div>
            
              <DetailedOperationalAnalysis
              analysisType={detailedAnalysisType}
              financialData={financialData}
              productionData={productionData}
              operationalMetrics={operationalMetrics}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Vista de Análisis Avanzado */}
      {viewMode === 'advanced' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="advanced"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AdvancedOperationalAnalytics
              financialData={financialData}
              productionData={productionData}
              operationalMetrics={operationalMetrics}
              selectedYear={selectedYear}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Vista de Simulador de Escenarios */}
      {viewMode === 'simulator' && (
        <AnimatePresence mode="wait">
          <motion.div
            key="simulator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <OperationalScenarioSimulator
              financialData={financialData}
              productionData={productionData}
              operationalMetrics={operationalMetrics}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default OperationalAnalysis;

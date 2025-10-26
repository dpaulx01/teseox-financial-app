import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

import { useFinancialData } from '../contexts/DataContext';
import { useMixedCosts } from '../contexts/MixedCostContext';
import { formatCurrency } from '../utils/formatters';
import { BreakEvenAnalysisType, MultiLevelBreakEvenData, BreakEvenResult, ProductBreakEven, MultiProductBreakEvenData, MixedCost, MixedCostAnalysis, CombinedData } from '../types';
import { Target, TrendingUp, DollarSign, Activity, Zap, BarChart3, BookOpen, HelpCircle, X, Settings } from 'lucide-react';
import AccountClassificationPanel from '../components/breakeven/AccountClassificationPanel';
import AnalysisTypeSelector from '../components/breakeven/AnalysisTypeSelector';
import StatisticalAnalysis from '../components/breakeven/StatisticalAnalysis';
import ProductMixPanel from '../components/breakeven/ProductMixPanel';
import MixedCostPanel from '../components/breakeven/MixedCostPanel';
import { calculateMultiLevelBreakEven, simulateBreakEvenLevel, clearBreakEvenCache } from '../utils/multiLevelBreakEven';
import { calculateBreakEvenStatistics, calculateEnhancedBreakEvenStatistics, BreakEvenStatistics } from '../utils/statisticalAnalysis';
import { calculateMultiProductBreakEven, optimizeProductMix } from '../utils/multiProductBreakEven';
import { loadCombinedData } from '../utils/productionStorage';
import { ANALYSIS_VISUAL_CONFIG } from '../constants/breakEvenConfig';
import { useSimpleInsights } from '../hooks/useSimpleInsights';
import InsightWrapper from '../components/insights/InsightWrapper';
import { validateDataIntegrity, generateIntegrityReport, DataIntegrityResult } from '../utils/dataIntegrityValidator';
import { MonteCarloControls } from '../components/breakeven/MonteCarloControls';
import { SimpleSimulationControls } from '../components/breakeven/SimpleSimulationControls';
import { useYear } from '../contexts/YearContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  icon?: React.ReactNode;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  icon
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState(value.toString());
  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = (newValue: number) => {
    setIsAnimating(true);
    onChange(newValue);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleManualInputChange = (inputValue: string) => {
    setManualValue(inputValue);
  };

  const handleManualInputBlur = () => {
    const numValue = parseFloat(manualValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      handleChange(clampedValue);
      setManualValue(clampedValue.toString());
    } else {
      setManualValue(value.toString());
    }
    setShowManualInput(false);
  };

  const handleManualInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualInputBlur();
    } else if (e.key === 'Escape') {
      setManualValue(value.toString());
      setShowManualInput(false);
    }
  };

  return (
    <div className="glass-card rounded-xl border border-border/60 bg-dark-card/80 p-6 shadow-glass hover:shadow-glow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && <div className="text-primary">{icon}</div>}
          <label className="text-sm font-medium text-text-muted uppercase tracking-wide">
            {label}
          </label>
        </div>
        {showManualInput ? (
          <div className="flex items-center gap-2">
            {unit === '$' && <span className="text-lg font-mono text-text-muted">$</span>}
            <input
              type="number"
              value={manualValue}
              onChange={(e) => handleManualInputChange(e.target.value)}
              onBlur={handleManualInputBlur}
              onKeyDown={handleManualInputKeyDown}
              autoFocus
              step={step}
              min={min}
              max={max}
              className="w-32 px-3 py-1 bg-dark-card border border-primary/50 rounded-lg text-xl font-mono text-primary text-right focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            {unit === '%' && <span className="text-lg font-mono text-text-muted">%</span>}
          </div>
        ) : (
          <button
            onClick={() => {
              setManualValue(value.toString());
              setShowManualInput(true);
            }}
            className={`text-xl font-mono font-bold text-primary transition-all duration-200 hover:text-accent cursor-pointer px-2 py-1 rounded ${isAnimating ? 'scale-110' : ''}`}
            title="Clic para ingresar valor manual"
          >
            {unit === '%' ? `${value}%` : unit === '$' ? formatCurrency(value) : value}{unit && unit !== '%' && unit !== '$' ? ` ${unit}` : ''}
          </button>
        )}
      </div>

      <div className="relative">
        <div className="h-3 bg-dark-card/50 rounded-full border border-border/40 relative overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 relative"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer z-30"
        />

        <div
          className="absolute top-1/2 w-5 h-5 -mt-2.5 bg-primary rounded-full border-2 border-white shadow-md transition-all duration-200 hover:scale-110 cursor-pointer"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-text-dim font-mono">
        <span>{unit === '$' ? formatCurrency(min) : min}</span>
        <span>{unit === '$' ? formatCurrency(max) : max}</span>
      </div>
    </div>
  );
};

interface MultiLevelMetricCardProps {
  analysisType: BreakEvenAnalysisType;
  result: BreakEvenResult;
  isSimulated?: boolean;
  onShowHelp?: () => void;
  showUnits?: boolean;
  isSelected: boolean;
  unitaryData?: {
    m2Vendidos: number;
    precioVentaPorM2: number;
    costoPorM2: number;
    costoPorM2PorTipo?: {
      contable: number;
      operativo: number;
      caja: number;
    };
    margenPorM2PorTipo?: {
      contable: number;
      operativo: number;
      caja: number;
    };
    puntosEquilibrioM2: {
      contable: number;
      operativo: number;
      caja: number;
    };
    margenPorcentualM2: number;
  };
}

const MultiLevelMetricCard: React.FC<MultiLevelMetricCardProps> = ({
  analysisType,
  result,
  isSimulated = false,
  onShowHelp,
  showUnits = false,
  isSelected,
  unitaryData
}) => {
  const config = ANALYSIS_VISUAL_CONFIG[analysisType];
  
  const getIcon = () => {
    if (isSimulated) return <Zap className="w-6 h-6" />;
    switch (analysisType) {
      case 'contable': return <BookOpen className="w-6 h-6" />;
      case 'operativo': return <TrendingUp className="w-6 h-6" />;
      case 'caja': return <DollarSign className="w-6 h-6" />;
    }
  };

  const getTitle = () => {
    if (isSimulated) return 'Simulación Activa';
    switch (analysisType) {
      case 'contable': return 'P.E. Contable';
      case 'operativo': return 'P.E. Operativo';
      case 'caja': return 'P.E. de Caja';
    }
  };

  const getSubtitle = () => {
    if (isSimulated) {
      switch (analysisType) {
        case 'contable': return 'Contable Simulado';
        case 'operativo': return 'EBIT Simulado';
        case 'caja': return 'EBITDA Simulado';
      }
    }
    switch (analysisType) {
      case 'contable': return 'Estándar';
      case 'operativo': return 'EBIT';
      case 'caja': return 'EBITDA';
    }
  };

  return (
    <div className={`glass-card rounded-xl border p-6 shadow-glass transition-all duration-300 ${isSelected ? `border-${config.color}/70 bg-${config.color}/10 shadow-glow-sm scale-102` : `border-${config.color}/40 bg-dark-card/70 hover:bg-dark-card/90`}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg bg-dark-card/60 border border-${config.color}/30 text-${config.color}`}>
          {getIcon()}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-medium text-text-muted uppercase tracking-wide">
              {getTitle()}
            </div>
            <div className="text-xs text-text-dim font-mono">
              {getSubtitle()}
              {isSimulated && <span className="ml-2 text-accent">SIM</span>}
            </div>
          </div>
          {!isSimulated && onShowHelp && (
            <button
              onClick={onShowHelp}
              className={`p-1 rounded-full transition-all duration-200 hover:scale-110 text-${config.color}/60 hover:text-${config.color} hover:bg-${config.color}/20`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className={`text-4xl font-mono font-bold text-${config.color} transition-all duration-300`}>
        {showUnits && unitaryData ?
          `${Math.round(unitaryData.puntosEquilibrioM2[analysisType]).toLocaleString()} m²` :
          formatCurrency(result.puntoEquilibrio)
        }
      </div>
    </div>
  );
};

const BreakEvenAnalysis: React.FC = () => {
  const { data } = useFinancialData();
  const { selectedYear } = useYear();
  const { updateMixedCosts, updateCustomClassifications } = useMixedCosts();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<BreakEvenAnalysisType>('contable');
  // Estados para simulación simple
  const [priceChange, setPriceChange] = useState<number>(0);
  const [fixedCostChange, setFixedCostChange] = useState<number>(0);
  const [variableCostRateChange, setVariableCostRateChange] = useState<number>(0);

  // Estados para simulación Monte Carlo
  const [enableMonteCarlo, setEnableMonteCarlo] = useState<boolean>(false);
  const [monteCarloIterations, setMonteCarloIterations] = useState<number>(1000);

  const initialMcParams = {
    distribution: 'normal' as 'normal' | 'triangular' | 'uniform',
    mean: 0,
    stdDev: 5,
    min: -10,
    max: 10,
    mode: 2
  };

  const [priceChangeParams, setPriceChangeParams] = useState(initialMcParams);
  const [fixedCostChangeParams, setFixedCostChangeParams] = useState({ ...initialMcParams, stdDev: 5000, min: -10000, max: 10000, mode: 1000 });
  const [variableCostRateChangeParams, setVariableCostRateChangeParams] = useState({ ...initialMcParams, stdDev: 3 });
  const [customClassifications, setCustomClassifications] = useState<Record<string, string>>({});
  const [useCustomClassifications, setUseCustomClassifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState<BreakEvenAnalysisType | null>(null);
  const [showUnitsAnalysis, setShowUnitsAnalysis] = useState(false);
  const [targetProfit, setTargetProfit] = useState<number>(0);
  const [showCVUAnalysis, setShowCVUAnalysis] = useState(false);
  const [showStatisticalAnalysis, setShowStatisticalAnalysis] = useState(false);
  const [isMultiProductMode, setIsMultiProductMode] = useState(false);
  const [productMix, setProductMix] = useState<ProductBreakEven[]>([]);
  const [multiProductData, setMultiProductData] = useState<MultiProductBreakEvenData | null>(null);
  const [mixedCostAnalysis, setMixedCostAnalysis] = useState<{totalFixed: number; totalVariable: number; adjustedCosts: MixedCost[]} | null>(null);
  const [detectedMixedAccounts, setDetectedMixedAccounts] = useState<Array<{ code: string; name: string; value: number }>>([]);
  const prevValuesRef = useRef<{CFT: number, CVU: number, PVU: number} | null>(null);
  const [combinedData, setCombinedData] = useState<CombinedData | null>(null);
  const [combinedLoading, setCombinedLoading] = useState<boolean>(false);
  const [combinedError, setCombinedError] = useState<string | null>(null);

  // Debug logging removed for performance

  // Interface initialization effect
  useEffect(() => {
    // Interface ready
  }, [data]);

  useEffect(() => {
    let isMounted = true;

    const fetchCombinedData = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      setCombinedLoading(true);
      setCombinedError(null);
      try {
        const yearToLoad = selectedYear ?? new Date().getFullYear();
        const result = await loadCombinedData(yearToLoad);
        if (isMounted) {
          setCombinedData(result);
        }
      } catch (error) {
        if (isMounted) {
          setCombinedData(null);
          setCombinedError(error instanceof Error ? error.message : 'Error cargando datos combinados');
        }
      } finally {
        if (isMounted) {
          setCombinedLoading(false);
        }
      }
    };

    fetchCombinedData();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  // Cargar clasificaciones guardadas
  useEffect(() => {
    const saved = localStorage.getItem('artyco-breakeven-classifications');
    
    if (saved && saved !== 'null' && saved !== '{}') {
      try {
        const parsedClassifications = JSON.parse(saved);
        
        // Verificar que realmente hay clasificaciones Y que no están vacías
        const hasRealCustomizations = Object.keys(parsedClassifications).length > 0 && 
          Object.values(parsedClassifications).some(val => val && val.trim() !== '');
        
        if (hasRealCustomizations) {
          setCustomClassifications(parsedClassifications);
          setUseCustomClassifications(true);
        } else {
          // Limpiar localStorage si no hay clasificaciones reales
          localStorage.removeItem('artyco-breakeven-classifications');
          setCustomClassifications({});
          setUseCustomClassifications(false);
        }
      } catch (error) {
        // console.error('Error parsing saved classifications:', error);
        localStorage.removeItem('artyco-breakeven-classifications');
        setCustomClassifications({});
        setUseCustomClassifications(false);
      }
    } else {
      setCustomClassifications({});
      setUseCustomClassifications(false);
    }
  }, []);

  if (!data) return null;

  const months = ['Anual', 'Promedio', ...Object.keys(data.monthly)];
  const currentMonth = selectedMonth || months[0]; // Anual por defecto
  
  if (!currentMonth || (currentMonth !== 'Anual' && currentMonth !== 'Promedio' && !data.monthly[currentMonth])) {
    return (
      <div className="p-8 text-center">
        <div className="glass-card p-8 rounded-xl">
          <p className="text-text-muted font-display">No hay datos disponibles para mostrar.</p>
        </div>
      </div>
    );
  }

  // Calcular datos para los tres niveles - CON LOGS DETALLADOS PARA DEBUGGING
  const multiLevelData: MultiLevelBreakEvenData = useMemo(() => {
    const mixedCosts = mixedCostAnalysis?.adjustedCosts || [];
    
    const result = calculateMultiLevelBreakEven(data, currentMonth, customClassifications, mixedCosts);
    
    // Debug logs removidos - código en producción
    
    return result;
  }, [data, currentMonth, customClassifications, useCustomClassifications, mixedCostAnalysis?.adjustedCosts]);

  // 🚨 VALIDADOR DE INTEGRIDAD DE DATOS
  const integrityValidation: DataIntegrityResult = useMemo(() => {
    return validateDataIntegrity(
      multiLevelData.contable,
      multiLevelData.operativo,
      multiLevelData.caja
    );
  }, [multiLevelData]);

  // Mostrar alerta crítica si hay inconsistencias
  React.useEffect(() => {
    if (!integrityValidation.isValid && integrityValidation.criticalIssues.length > 0) {
      const report = generateIntegrityReport(integrityValidation);
      // console.error('🚨 INTEGRIDAD DE DATOS COMPROMETIDA:', report);
      
      // Opcional: Mostrar alerta al usuario (comentado para evitar spam)
      // alert(report);
    }
  }, [integrityValidation]);

  // Obtener resultado actual según tipo seleccionado
  const currentResult = multiLevelData[analysisType];
  
  // Sistema de insights inteligentes - INTEGRACIÓN REAL CON DATOS SIMPLIFICADOS
  const {
    insights,
    getInsightForElement,
    criticalInsights,
    warningInsights,
    infoInsights,
    hasInsights
  } = useSimpleInsights({
    multiLevelData,
    currentAnalysisType: analysisType,
    customClassifications,
    enabled: true
  });

  // Función para manejar acciones de insights
  const handleInsightAction = (action: string, params?: any) => {
    switch (action) {
      case 'navigate':
        if (params?.panel === 'mixed-cost-panel') {
          // Scroll a la sección de costos mixtos
          document.getElementById('mixed-cost-panel')?.scrollIntoView({ behavior: 'smooth' });
        } else if (params?.panel === 'cost-analysis') {
          // Activar el panel de clasificación de cuentas
          document.getElementById('account-classification-panel')?.scrollIntoView({ behavior: 'smooth' });
        } else if (params?.panel === 'revenue-analysis') {
          // Cambiar a análisis P&L para ver ingresos
          window.location.hash = '#pnl';
        } else if (params?.panel === 'analysis-comparison') {
          // Mostrar el panel de comparación de análisis
          // console.log('🔄 Activando comparación de análisis multi-nivel');
          // Scroll al selector de tipo de análisis para que vea las diferencias
          document.getElementById('analysis-type-selector')?.scrollIntoView({ behavior: 'smooth' });
          // También mostrar un toast o modal con información detallada
          // Crear un toast elegante integrado con el tema
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 z-[10000] glass-card p-6 rounded-xl border-2 border-accent/50 bg-dark-card/95 backdrop-blur-md shadow-glass max-w-md';
          toast.innerHTML = `
            <div class="relative">
                <div class="flex items-center gap-3 mb-3">
                  <div class="p-2 bg-accent/20 rounded-lg">
                    <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h4 class="text-lg font-display text-accent">💡 Análisis de Brecha</h4>
                </div>
                <p class="text-sm text-text-secondary leading-relaxed mb-4">
                  Tu <strong>PE Operativo vs PE de Caja</strong> tienen <span class="text-accent font-bold">${Math.abs(multiLevelData.operativo.puntoEquilibrio - multiLevelData.caja.puntoEquilibrio).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span> de diferencia.
                </p>
                <p class="text-xs text-text-muted">
                  Esto indica que los gastos no monetarios (depreciación, amortizaciones) tienen un impacto significativo en tu análisis.
                </p>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="absolute top-0 right-0 p-1 text-text-muted hover:text-text-secondary">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          `;
          document.body.appendChild(toast);
          // Auto-remove after 8 seconds
          setTimeout(() => toast.remove(), 8000);
        }
        break;
      case 'simulate':
        if (params?.type && params?.suggestedIncrease) {
          // Activar simulación con valores sugeridos
          setPriceChange(params.suggestedIncrease);
          // Scroll al área de simulación
          document.getElementById('simulation-controls')?.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      default:
        // console.log('Acción de insight:', action, params);
    }
  };
  
  // Detectar cambios reales en los valores (simplificado)
  useEffect(() => {
    const currentValues = {
      CFT: currentResult.costosFijos,
      CVU: currentResult.costosVariables,
      PVU: currentResult.ingresos
    };
    
    if (prevValuesRef.current) {
      const changed = 
        Math.abs(prevValuesRef.current.CFT - currentValues.CFT) > 100 ||
        Math.abs(prevValuesRef.current.CVU - currentValues.CVU) > 100 ||
        Math.abs(prevValuesRef.current.PVU - currentValues.PVU) > 100;
        
      if (changed) {
        // Values updated
      }
    }
    
    prevValuesRef.current = currentValues;
  }, [currentResult.costosFijos, currentResult.costosVariables, currentResult.ingresos]);
  
  // LOG ELIMINADO: Causaba loop infinito

  // Obtener cuentas clasificadas como mixtas para el análisis
  const mixedAccounts = useMemo(() => {
    // Combinar cuentas detectadas automáticamente con clasificaciones manuales
    const combinedAccounts: Array<{ code: string; name: string; value: number }> = [];
    
    // 1. Agregar cuentas detectadas automáticamente por el Clasificador IA
    detectedMixedAccounts.forEach(account => {
      if (Math.abs(account.value) > 0) { // Incluir todas las cuentas MIX sin importar el valor
        combinedAccounts.push(account);
      }
    });
    
    // 2. Agregar cuentas clasificadas manualmente como MIX (si no están ya incluidas)
    if (data?.raw && useCustomClassifications) {
      data.raw
        .filter(row => {
          const codigo = row['COD.'] || '';
          
          // Solo considerar mixtas las cuentas que realmente lo necesitan
          if (customClassifications[codigo] === 'MIX') {
            // Verificar que no esté ya en las detectadas automáticamente
            return !detectedMixedAccounts.some(detected => detected.code === codigo);
          }
          
          return false;
        })
        .forEach(row => {
          const codigo = row['COD.'] || '';
          const cuenta = row['CUENTA'] || '';
          
          // Obtener el valor para el período actual
          let valor = 0;
          if (currentMonth === 'Anual') {
            Object.keys(data.monthly).forEach(month => {
              const monthValue = row[month];
              if (monthValue) {
                valor += typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue)) || 0;
              }
            });
          } else if (currentMonth === 'Promedio') {
            const monthValues: number[] = [];
            Object.keys(data.monthly).forEach(month => {
              const monthValue = row[month];
              if (monthValue) {
                monthValues.push(typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue)) || 0);
              }
            });
            valor = monthValues.length > 0 ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length : 0;
          } else {
            const monthValue = row[currentMonth];
            if (monthValue) {
              valor = typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue)) || 0;
            }
          }
          
          if (Math.abs(valor) > 100) { // Solo si es significativo
            combinedAccounts.push({
              code: codigo,
              name: cuenta,
              value: Math.abs(valor)
            });
          }
        });
    }
    
    return combinedAccounts;
  }, [data, customClassifications, useCustomClassifications, currentMonth, detectedMixedAccounts]);

  // TODAS las cuentas MIX detectadas por IA (para mostrar las filtradas)
  const allDetectedMixAccounts = useMemo(() => {
    const allMixAccounts: Array<{ code: string; name: string; value: number }> = [];
    
    // Obtener TODAS las cuentas clasificadas como MIX por el clasificador IA
    if (data?.raw && useCustomClassifications) {
      Object.entries(customClassifications).forEach(([codigo, clasificacion]) => {
        if (clasificacion === 'MIX') {
          const accountRow = data.raw.find(row => row['COD.'] === codigo);
          if (accountRow) {
            const cuenta = accountRow['CUENTA'] || '';
            
            // Calcular valor para el período actual
            let valor = 0;
            if (currentMonth === 'Anual') {
              Object.keys(data.monthly).forEach(month => {
                const monthValue = accountRow[month];
                if (monthValue) {
                  valor += typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue)) || 0;
                }
              });
            } else if (currentMonth === 'Promedio') {
              const monthValues: number[] = [];
              Object.keys(data.monthly).forEach(month => {
                const monthValue = accountRow[month];
                if (monthValue) {
                  monthValues.push(typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue)) || 0);
                }
              });
              valor = monthValues.length > 0 ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length : 0;
            } else {
              const monthValue = accountRow[currentMonth];
              if (monthValue) {
                valor = typeof monthValue === 'number' ? monthValue : parseFloat(String(monthValue)) || 0;
              }
            }
            
            allMixAccounts.push({
              code: codigo,
              name: cuenta,
              value: Math.abs(valor)
            });
          }
        }
      });
    }
    
    return allMixAccounts;
  }, [data, customClassifications, useCustomClassifications, currentMonth]);

  // Calcular métricas unitarias (m²) para TODOS los tipos de análisis usando DATOS REALES
  const unitaryMetrics = useMemo(() => {
    if (!combinedData || !combinedData.production || combinedData.production.length === 0) {
      return null;
    }

    const yearlyData = combinedData.financial?.yearly;
    if (!yearlyData) {
      return null;
    }

    try {
      let realM2Vendidos = 0;
      let realPrecioPorM2 = 0;
      let realCostoVariablePorM2 = 0;

      if (currentMonth === 'Anual') {
        const totalM2 = combinedData.production.reduce((sum, p) => sum + (p.metrosVendidos || 0), 0);
        realM2Vendidos = totalM2;

        if (realM2Vendidos > 0) {
          realPrecioPorM2 = yearlyData.ingresos / realM2Vendidos;
          realCostoVariablePorM2 = yearlyData.costosVariables / realM2Vendidos;
        }
      } else if (currentMonth === 'Promedio') {
        const totalM2 = combinedData.production.reduce((sum, p) => sum + (p.metrosVendidos || 0), 0);
        const monthsCount = combinedData.production.length || 1;
        const avgM2 = totalM2 / monthsCount;
        realM2Vendidos = avgM2;

        if (realM2Vendidos > 0) {
          const avgIngresos = yearlyData.ingresos / monthsCount;
          const avgCostosVariables = yearlyData.costosVariables / monthsCount;
          realPrecioPorM2 = avgIngresos / realM2Vendidos;
          realCostoVariablePorM2 = avgCostosVariables / realM2Vendidos;
        }
      } else {
        const productionMonth = combinedData.production.find((p) => p.month === currentMonth);
        const monthlyFinancial = combinedData.financial?.monthly?.[currentMonth];

        if (productionMonth && monthlyFinancial) {
          realM2Vendidos = productionMonth.metrosVendidos || 0;
          if (realM2Vendidos > 0) {
            realPrecioPorM2 = monthlyFinancial.ingresos / realM2Vendidos;
            realCostoVariablePorM2 = monthlyFinancial.costosVariables / realM2Vendidos;
          }
        }
      }

      if (realM2Vendidos <= 0 || realPrecioPorM2 <= 0) {
        return null;
      }

      const puntosEquilibrioM2: Record<BreakEvenAnalysisType, number> = {
        contable: 0,
        operativo: 0,
        caja: 0
      };

      const costoPorM2PorTipo: Record<BreakEvenAnalysisType, number> = {
        contable: 0,
        operativo: 0,
        caja: 0
      };

      const margenPorM2PorTipo: Record<BreakEvenAnalysisType, number> = {
        contable: 0,
        operativo: 0,
        caja: 0
      };

      (['contable', 'operativo', 'caja'] as BreakEvenAnalysisType[]).forEach((type) => {
        const currentLevel = multiLevelData?.[type];
        if (!currentLevel) {
          return;
        }

        const fixedCostsForType = currentLevel.costosFijos;
        const derivedCostoVariablePorM2 = realCostoVariablePorM2;
        const totalCostoPorM2ForType = realM2Vendidos > 0
          ? derivedCostoVariablePorM2 + (fixedCostsForType / realM2Vendidos)
          : derivedCostoVariablePorM2;

        const margenContribucionRealPorM2 = realM2Vendidos > 0
          ? currentLevel.margenContribucion / realM2Vendidos
          : 0;

        costoPorM2PorTipo[type] = totalCostoPorM2ForType;
        margenPorM2PorTipo[type] = margenContribucionRealPorM2;
        puntosEquilibrioM2[type] = margenContribucionRealPorM2 > 0
          ? fixedCostsForType / margenContribucionRealPorM2
          : (fixedCostsForType < 0 ? 0 : Infinity);
      });

      return {
        m2Vendidos: realM2Vendidos,
        precioVentaPorM2: realPrecioPorM2,
        costoPorM2: costoPorM2PorTipo.contable,
        costoPorM2PorTipo,
        margenPorM2PorTipo,
        puntosEquilibrioM2,
        margenPorcentualM2: realPrecioPorM2 > 0 ? (margenPorM2PorTipo.contable / realPrecioPorM2) * 100 : 0,
        isRealData: true
      };
    } catch (error) {
      return null;
    }
  }, [combinedData, currentMonth, multiLevelData]);

  // Análisis CVU (Costo-Volumen-Utilidad) 
  const cvuAnalysis = useMemo(() => {
    const margenContribucionPorc = currentResult.margenContribucionPorc;
    
    // Ventas necesarias para utilidad objetivo (Valor Monetario)
    const ventasParaUtilidad = margenContribucionPorc > 0 ? 
      (currentResult.costosFijos + targetProfit) / margenContribucionPorc : 0;
    
    // Ventas necesarias para utilidad objetivo (Unidades m²)
    const m2ParaUtilidad = (unitaryMetrics && unitaryMetrics.margenPorM2PorTipo && unitaryMetrics.margenPorM2PorTipo[analysisType] > 0) ? 
      (currentResult.costosFijos + targetProfit) / unitaryMetrics.margenPorM2PorTipo[analysisType] : 0;
    
    // Margen de Seguridad
    const margenSeguridadMonetario = currentResult.ingresos - currentResult.puntoEquilibrio;
    const margenSeguridadPorcentual = currentResult.ingresos > 0 ? 
      (margenSeguridadMonetario / currentResult.ingresos) * 100 : 0;
    
    const margenSeguridadM2 = unitaryMetrics ? unitaryMetrics.m2Vendidos - unitaryMetrics.puntosEquilibrioM2[analysisType] : 0;
    
    // 🚨 CORRECCIÓN CRÍTICA: Margen de seguridad % debe calcularse POR SEPARADO para unidades
    const margenSeguridadPorcentualM2 = unitaryMetrics && unitaryMetrics.m2Vendidos > 0 ? 
      (margenSeguridadM2 / unitaryMetrics.m2Vendidos) * 100 : 0;
    
    return {
      ventasParaUtilidad,
      m2ParaUtilidad,
      margenSeguridadMonetario,
      margenSeguridadPorcentual, // Para vista monetaria
      margenSeguridadPorcentualM2, // Para vista unitaria
      margenSeguridadM2,
      grado_apalancamiento_operativo: margenContribucionPorc > 0 ? 
        currentResult.margenContribucion / (currentResult.margenContribucion - currentResult.costosFijos) : 0
    };
  }, [currentResult, targetProfit, unitaryMetrics, analysisType]);

  // Calcular análisis estadístico enhanced (solo si hay múltiples meses)
  const statisticalAnalysis = useMemo(() => {
    const months = Object.keys(data?.monthly || {});
    if (months.length < 2) return null;
    
    const mixedCosts = mixedCostAnalysis?.adjustedCosts || [];
    return calculateEnhancedBreakEvenStatistics(data, customClassifications, mixedCosts);
  }, [data, customClassifications, mixedCostAnalysis?.adjustedCosts]);

  // Calcular análisis multiproducto (solo en modo multiproducto)
  const multiProductAnalysis = useMemo(() => {
    if (!isMultiProductMode || productMix.length === 0) return null;
    
    try {
      return calculateMultiProductBreakEven(
        productMix, 
        currentResult.costosFijos, 
        analysisType,
        currentResult.costosFijos // Ya ajustados por tipo de análisis
      );
    } catch (error) {
      // console.error('Error en análisis multiproducto:', error);
      return null;
    }
  }, [isMultiProductMode, productMix, currentResult.costosFijos, analysisType]);

  // Actualizar multiProductData cuando cambie el análisis
  useEffect(() => {
    setMultiProductData(multiProductAnalysis);
  }, [multiProductAnalysis]);

  // Para mostrar los datos multiproducto, simplemente los tendremos disponibles en multiProductAnalysis

  // Helper para obtener valores de simulación según el modo
  const getSimulatedValue = (metric: 'puntoEquilibrio' | 'margenContribucionPorc' | 'utilidadNeta' | 'ebitda', statType: 'mean' | 'median' | 'min' | 'max' | 'p10' | 'p90' = 'mean') => {
    if (enableMonteCarlo && simulatedResult && typeof simulatedResult[metric] === 'object') {
      return simulatedResult[metric][statType];
    }
    return simulatedResult[metric];
  };

  // Simular escenarios
  const simulatedResult = useMemo(() => {
    if (enableMonteCarlo) {
      // Simulación Monte Carlo
      return simulateBreakEvenLevel(
        analysisType,
        currentResult,
        {
          numIterations: monteCarloIterations,
          priceChange: priceChangeParams,
          fixedCostChange: fixedCostChangeParams,
          variableCostRateChange: variableCostRateChangeParams
        }
      );
    } else {
      // Simulación simple
      return simulateBreakEvenLevel(
        analysisType,
        currentResult,
        {
          priceChange: priceChange,
          fixedCostChange: fixedCostChange,
          variableCostRateChange
        }
      );
    }
  }, [
    analysisType, 
    currentResult, 
    enableMonteCarlo,
    monteCarloIterations,
    priceChange, 
    fixedCostChange, 
    variableCostRateChange,
    priceChangeParams,
    fixedCostChangeParams,
    variableCostRateChangeParams
  ]);

  // Datos para el gráfico multinivel
  const multiLevelChartData = useMemo(() => {
    const maxSales = Math.max(
      getSimulatedValue('puntoEquilibrio'),
      multiLevelData.contable.puntoEquilibrio,
      multiLevelData.operativo.puntoEquilibrio,
      multiLevelData.caja.puntoEquilibrio
    ) * 1.8 || 20000;
    
    const steps = 50;
    const chartData = [];

    for (let i = 0; i <= steps; i++) {
      const sales = (maxSales / steps) * i;
      
      // En un gráfico de punto de equilibrio, los ingresos siempre son iguales a las ventas (línea diagonal)
      // Lo que cambia con la simulación son los ratios de costos
      const variableCosts = sales * (simulatedResult.ingresos > 0 ? simulatedResult.costosVariables / simulatedResult.ingresos : 0);
      const totalCosts = simulatedResult.costosFijos + variableCosts;
      
      chartData.push({
        ventas: sales,
        'Ingresos': sales,
        'Costos Totales': totalCosts,
        'P.E. Contable': multiLevelData.contable.puntoEquilibrio,
        'P.E. Operativo': multiLevelData.operativo.puntoEquilibrio,
        'P.E. Caja': multiLevelData.caja.puntoEquilibrio,
        'P.E. Simulado': getSimulatedValue('puntoEquilibrio')
      });
    }
    return chartData;
  }, [multiLevelData, simulatedResult]);

  const resetSimulation = () => {
    setPriceChange(0);
    setFixedCostChange(0);
    setVariableCostRateChange(0);
    setPriceChangeParams({ mean: 0, stdDev: 5 });
    setFixedCostChangeParams({ mean: 0, stdDev: 5000 });
    setVariableCostRateChangeParams({ mean: 0, stdDev: 3 });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-display text-primary neon-text">
            Análisis Multinivel de Punto de Equilibrio
          </h2>
          <p className="text-lg lg:text-xl font-display text-accent font-semibold mt-2">
            Perspectivas profesionales: Contable, Operativo y de Caja
          </p>
          <div className="flex items-center gap-4 mt-2">
            {currentMonth === 'Promedio' && (
              <span className="text-info text-xs font-mono animate-pulse px-2 py-1 rounded-full bg-info/10 border border-info/30">
                MODO PROMEDIO MENSUAL ACTIVO
              </span>
            )}
            {isMultiProductMode && (
              <span className="text-purple text-xs font-mono animate-pulse px-2 py-1 rounded-full bg-purple/10 border border-purple/30">
                MODO MULTIPRODUCTO ACTIVO - {productMix.length} productos
              </span>
            )}
            {useCustomClassifications && (
              <span className="text-accent text-xs font-mono animate-pulse px-2 py-1 rounded-full bg-accent/10 border border-accent/30">
                MODO PERSONALIZADO ACTIVO
              </span>
            )}
            
            {/* Indicador de Estado de Cuentas Mixtas */}
            {(() => {
              const mixedCount = Object.values(customClassifications).filter(c => c === 'MIX').length;
              const hasMixedCostAnalysis = mixedCostAnalysis && mixedCostAnalysis.adjustedCosts.length > 0;
              
              if (mixedCount === 0) {
                return null; // No mostrar nada si no hay cuentas mixtas
              }
              
              if (hasMixedCostAnalysis) {
                return (
                  <span className="text-primary text-xs font-mono px-2 py-1 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-1 cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => document.getElementById('mixed-cost-panel')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Settings className="w-3 h-3" />
                    Cuentas Mixtas: IA Aplicada ({mixedCount})
                  </span>
                );
              } else if (useCustomClassifications) {
                return (
                  <span className="text-warning text-xs font-mono px-2 py-1 rounded-full bg-warning/10 border border-warning/30 flex items-center gap-1 cursor-pointer hover:bg-warning/20 transition-colors"
                    onClick={() => document.getElementById('mixed-cost-panel')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Activity className="w-3 h-3" />
                    Cuentas Mixtas: Fallback a Fijo ({mixedCount})
                  </span>
                );
              }
              
              return null;
            })()}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (!unitaryMetrics) {
                alert('No hay datos de producción disponibles. Por favor, carga los datos de producción desde la página de Configuración de Datos.');
                return;
              }
              setShowUnitsAnalysis(!showUnitsAnalysis);
            }}
            className={`px-3 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
              !unitaryMetrics 
                ? 'opacity-50 cursor-not-allowed border-border text-text-dim'
                : showUnitsAnalysis
                  ? 'border-accent/50 bg-accent/10 text-accent shadow-glass'
                  : 'border-border hover:border-primary/30 text-text-secondary hover:bg-glass/50'
            }`}
            disabled={!unitaryMetrics}
            title={!unitaryMetrics ? 'No hay datos de producción disponibles' : 'Cambiar vista entre valores monetarios y unidades'}
          >
            {showUnitsAnalysis ? '📏 m² ON' : '💰 $ ON'}
          </button>
          
          <button
            onClick={() => setShowCVUAnalysis(!showCVUAnalysis)}
            className={`px-3 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
              showCVUAnalysis
                ? 'border-warning/50 bg-warning/10 text-warning shadow-glow-warning'
                : 'border-border hover:border-primary/30 text-text-secondary hover:bg-glass/50'
            }`}
          >
            {showCVUAnalysis ? '📈 CVU ON' : '📈 CVU'}
          </button>
          
          <button
            onClick={() => setIsMultiProductMode(!isMultiProductMode)}
            className={`px-3 py-2 rounded-lg border transition-all duration-300 text-sm font-display relative z-30 ${
              isMultiProductMode
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-glow-purple'
                : 'border-border hover:border-purple-400/30 text-text-secondary hover:bg-glass/50'
            }`}
          >
            {isMultiProductMode ? '📦 Multi ON' : '📦 Mono'}
          </button>

          {statisticalAnalysis && (
            <button
              onClick={() => setShowStatisticalAnalysis(true)}
              className="px-3 py-2 rounded-lg border border-info/50 bg-info/10 text-info shadow-glow-info transition-all duration-300 text-sm font-display relative z-30 hover:bg-info/20"
            >
              <Settings className="w-4 h-4 inline mr-1" />
              📊 Promedio Mensual
            </button>
          )}

          {/* 🚨 INDICADOR DE INTEGRIDAD DE DATOS */}
          {!integrityValidation.isValid && (
            <button
              onClick={() => {
                const report = generateIntegrityReport(integrityValidation);
                alert(`🚨 ALERTA DE INTEGRIDAD DE DATOS:\n\n${report}`);
              }}
              className="px-3 py-2 rounded-lg border border-danger/50 bg-danger/10 text-danger shadow-glow-danger transition-all duration-300 text-sm font-display relative z-30 hover:bg-danger/20 animate-pulse"
              title="Haz clic para ver detalles de los problemas detectados"
            >
              🚨 DATOS CRÍTICOS
            </button>
          )}

          
          <AccountClassificationPanel 
            onClassificationChange={(classifications) => {
              setCustomClassifications(classifications);
              const hasRealCustomizations = Object.keys(classifications).length > 0 && 
                Object.values(classifications).some(val => val && val.trim() !== '');
              setUseCustomClassifications(hasRealCustomizations);
              
              // Actualizar el contexto global con las clasificaciones
              const globalClassifications: Record<string, 'CFT' | 'CVU' | 'PVU' | 'MIX'> = {};
              Object.entries(classifications).forEach(([key, value]) => {
                if (value && ['CFT', 'CVU', 'PVU', 'MIX'].includes(value)) {
                  globalClassifications[key] = value as 'CFT' | 'CVU' | 'PVU' | 'MIX';
                }
              });
              updateCustomClassifications(globalClassifications);
              
              // No necesario forzar recálculo - useMemo se actualiza automáticamente por dependencies
              
              // Si es un reset (clasificaciones vacías), limpiar también cuentas mixtas detectadas
              if (Object.keys(classifications).length === 0) {
                setDetectedMixedAccounts([]);
                setMixedCostAnalysis(null);
                clearBreakEvenCache(); // Limpiar caché global
              }
              
              if (hasRealCustomizations) {
                localStorage.setItem('artyco-breakeven-classifications', JSON.stringify(classifications));
              } else if (Object.keys(classifications).length === 0) {
                // Solo borrar localStorage si es un reset explícito (clasificaciones completamente vacías)
                // console.log(`🗑️ BORRANDO LOCALSTORAGE: Reset explícito (0 clasificaciones)`);
                localStorage.removeItem('artyco-breakeven-classifications');
              } else {
                // No borrar localStorage solo porque las clasificaciones no tienen valores válidos
                // console.log(`⏸️ MANTENIENDO LOCALSTORAGE: Clasificaciones presentes pero inválidas`);
              }
            }}
            multiLevelData={{
              CFT: currentResult.costosFijos,
              CVU: currentResult.costosVariables,
              PVU: currentResult.ingresos
            }}
            onMixedAccountsDetected={(mixedAccounts) => {
              setDetectedMixedAccounts(mixedAccounts);
              // Limpiar caché para forzar recálculo cuando se detecten nuevas cuentas mixtas
              clearBreakEvenCache();
            }}
            onFlowEvent={() => {}}
          />

          
          <select 
            value={currentMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            className="p-2 glass-card border border-border text-text-secondary focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 hover:shadow-glow-sm font-mono text-sm rounded-lg"
          >
            {months.map(m => (
              <option key={m} value={m} className="bg-dark-card text-text-secondary">
                {m === 'Anual' ? '📊 Consolidado Anual' : 
                 m === 'Promedio' ? '📈 Promedio Mensual' : m}
              </option>
            ))}
          </select>
        </div>
      </div>
      {combinedLoading && !combinedError && (
        <div className="rounded-lg border border-info/40 bg-info/5 px-4 py-2 text-sm font-mono text-info">
          Sincronizando métricas reales de producción desde la base de datos…
        </div>
      )}
      {combinedError && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-2 text-sm font-mono text-danger">
          Error al cargar datos reales de producción: {combinedError}
        </div>
      )}

      {/* Panel de Insights Críticos */}
      {criticalInsights.length > 0 && (
        <div className="mb-6">
          <div className="glass-card p-6 rounded-xl border-2 border-danger/50 bg-danger/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-danger/20 border border-danger/30">
                <Settings className="w-6 h-6 text-danger animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-display text-danger font-bold">
                  🚨 Alertas Críticas Detectadas por IA
                </h3>
                <p className="text-text-muted text-sm">
                  {criticalInsights.length} problema(s) crítico(s) requieren atención inmediata
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {criticalInsights.map((insight) => (
                <div key={insight.id} className="p-4 bg-danger/5 rounded-lg border border-danger/20">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-display text-sm text-danger font-bold mb-2">
                        {insight.title}
                      </h4>
                      <p className="text-text-secondary text-sm mb-3">
                        {insight.message}
                      </p>
                      {insight.historicalContext && (
                        <div className="text-xs text-text-dim mb-2">
                          📊 {insight.historicalContext.period} • {insight.historicalContext.comparison}
                        </div>
                      )}
                      {insight.suggestedAction && (
                        <button
                          onClick={() => handleInsightAction(insight.suggestedAction!.action, insight.suggestedAction!.params)}
                          className="text-sm px-4 py-2 rounded bg-danger/20 hover:bg-danger/30 text-danger transition-colors font-display"
                        >
                          {insight.suggestedAction.label} →
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-mono text-text-dim bg-glass px-2 py-1 rounded">
                      {(insight.confidence * 100).toFixed(0)}% confianza
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Panel de Insights de Advertencia */}
      {warningInsights.length > 0 && criticalInsights.length === 0 && (
        <div className="mb-6">
          <div className="glass-card p-4 rounded-xl border border-warning/50 bg-warning/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
                <Settings className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-display text-warning font-bold">
                  💡 Oportunidades de Mejora Detectadas
                </h3>
                <p className="text-text-muted text-sm">
                  {warningInsights.length} insight(s) para optimizar tu análisis
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {warningInsights.slice(0, 2).map((insight) => (
                <div key={insight.id} className="flex justify-between items-center p-3 bg-warning/5 rounded border border-warning/10">
                  <div className="flex-1">
                    <span className="text-sm font-display text-text-secondary font-bold">{insight.title}</span>
                    <p className="text-xs text-text-muted mt-1">{insight.message}</p>
                  </div>
                  {insight.suggestedAction && (
                    <button
                      onClick={() => handleInsightAction(insight.suggestedAction!.action, insight.suggestedAction!.params)}
                      className="text-xs px-3 py-1 rounded bg-warning/20 hover:bg-warning/30 text-warning transition-colors ml-3"
                    >
                      {insight.suggestedAction.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning for negative margin */}
      {currentResult.margenContribucion < 0 && (
        <div className="glass-card p-6 rounded-xl border-2 border-danger/50 bg-danger/10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-danger/20 border border-danger/30">
              <Activity className="w-6 h-6 text-danger animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-display text-danger mb-2">
                ⚠️ Margen de Contribución Negativo
              </h3>
              <p className="text-text-secondary mb-3 font-mono">
                Los costos variables ({formatCurrency(currentResult.costosVariables)}) son mayores 
                que los ingresos ({formatCurrency(currentResult.ingresos)}).
              </p>
              <div className="text-sm text-text-dim">
                <strong>Implicación:</strong> No existe punto de equilibrio matemáticamente posible. 
                La empresa pierde dinero en cada venta. Se requiere reestructuración urgente de costos o precios.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Productos Múltiples */}
      {isMultiProductMode && (
        <ProductMixPanel 
          onProductMixChange={setProductMix}
          costosFijos={currentResult.costosFijos}
          currentMonth={currentMonth}
          className="mb-6"
        />
      )}

      {/* Panel de Costos Mixtos */}
      <div id="mixed-cost-panel">
        <MixedCostPanel
        mixedAccounts={detectedMixedAccounts}
        allMixAccounts={allDetectedMixAccounts}
        onMixedCostsAnalysis={(analysis) => {
          // Actualizar el contexto global con los costos mixtos
          updateMixedCosts(analysis.adjustedCosts);
          
          // Solo actualizar si el análisis realmente cambió
          setMixedCostAnalysis(prevAnalysis => {
            const hasChanged = !prevAnalysis || 
              prevAnalysis.totalFixed !== analysis.totalFixed || 
              prevAnalysis.totalVariable !== analysis.totalVariable ||
              prevAnalysis.adjustedCosts.length !== analysis.adjustedCosts.length;
            
            if (hasChanged) {
              // Análisis de costos mixtos actualizado - forzar recálculo de métricas
              // Limpiar caché para asegurar recálculo inmediato
              clearBreakEvenCache();
            }
            
            return analysis;
          });
        }}
        totalRevenue={data?.yearly?.ingresos || 0}
        totalUnits={unitaryMetrics?.m2Vendidos || 0}
        financialData={data}
        currentMonth={currentMonth}
        className="mb-6"
        />
      </div>

      {/* Compact Analysis Selector + Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Compact Type Selector */}
        <div className="xl:col-span-1">
          <div className="glass-card p-4 rounded-xl border border-border/60 bg-dark-card/80 shadow-glass h-full">
            <h3 className="text-lg font-medium text-primary mb-4">
              Tipo de Análisis
            </h3>
              
              <div className="space-y-3">
                {Object.values({
                  contable: { id: 'contable', name: 'Contable', subtitle: 'Estándar', icon: BookOpen, color: 'primary' },
                  operativo: { id: 'operativo', name: 'Operativo', subtitle: 'EBIT', icon: TrendingUp, color: 'accent' },
                  caja: { id: 'caja', name: 'Caja', subtitle: 'EBITDA', icon: DollarSign, color: 'warning' }
                }).map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = analysisType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => setAnalysisType(type.id as BreakEvenAnalysisType)}
                      className={`w-full p-3 rounded-lg border transition-all duration-300 text-left ${
                        isSelected
                          ? `border-2 border-${type.color}/70 bg-${type.color}/20 shadow-glow-lg scale-105 z-10`
                          : 'border-border hover:border-primary/30 hover:bg-glass/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-5 h-5 ${isSelected ? `text-${type.color}` : 'text-text-muted'}`} />
                        <div className="flex-1">
                          <div className={`font-display font-bold text-sm ${isSelected ? `text-${type.color}` : 'text-text-secondary'}`}>
                            {type.name}
                          </div>
                          <div className="text-xs text-text-dim font-mono">
                            {type.subtitle}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Compact Metrics con Insights */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightWrapper
            insight={getInsightForElement('contable-breakeven-card')}
            position="top-right"
            onAction={handleInsightAction}
          >
            <MultiLevelMetricCard
              analysisType="contable"
              result={multiLevelData.contable}
              onShowHelp={() => setShowHelpModal('contable')}
              showUnits={showUnitsAnalysis}
              unitaryData={unitaryMetrics}
              isSelected={analysisType === 'contable'}
            />
          </InsightWrapper>
          
          <InsightWrapper
            insight={getInsightForElement('operativo-breakeven-card')}
            position="top-right"
            onAction={handleInsightAction}
          >
            <MultiLevelMetricCard
              analysisType="operativo"
              result={multiLevelData.operativo}
              onShowHelp={() => setShowHelpModal('operativo')}
              showUnits={showUnitsAnalysis}
              unitaryData={unitaryMetrics}
              isSelected={analysisType === 'operativo'}
            />
          </InsightWrapper>
          
          <InsightWrapper
            insight={getInsightForElement('cash-breakeven-card')}
            position="top-right"
            onAction={handleInsightAction}
          >
            <MultiLevelMetricCard
              analysisType="caja"
              result={multiLevelData.caja}
              onShowHelp={() => setShowHelpModal('caja')}
              showUnits={showUnitsAnalysis}
              unitaryData={unitaryMetrics}
              isSelected={analysisType === 'caja'}
            />
          </InsightWrapper>
        </div>
      </div>

      <div className="space-y-4">
        {/* Simulación Activa - Sección Dedicada */}
        {(priceChange !== 0 || fixedCostChange !== 0 || variableCostRateChange !== 0 || 
          enableMonteCarlo || 
          (enableMonteCarlo && (priceChangeParams.mean !== 0 || fixedCostChangeParams.mean !== 0 || variableCostRateChangeParams.mean !== 0))) && 
         currentResult.margenContribucion > 0 && (
          <div className="glass-card p-8 rounded-2xl border border-accent/50 bg-dark-card/80 shadow-glass">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                <Zap className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-display text-accent font-semibold">
                  🎯 Simulación Activa
                </h3>
                <p className="text-text-muted font-mono">
                  Análisis {analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Modificado
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setPriceChange(0);
                setFixedCostChange(0);
                setVariableCostRateChange(0);
              }}
              className="cyber-button px-4 py-2 text-sm relative z-30"
            >
              <Zap className="w-4 h-4 mr-2" />
              RESET
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Métricas Principales */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">Punto de Equilibrio</div>
                <div className="text-2xl font-mono font-bold text-accent">
                  {formatCurrency(getSimulatedValue('puntoEquilibrio'))}
                </div>
                <div className="text-xs text-text-dim mt-1">
                  {getSimulatedValue('puntoEquilibrio') > currentResult.puntoEquilibrio ? '↗️' : '↘️'} 
                  {currentResult.puntoEquilibrio > 0 
                    ? ((getSimulatedValue('puntoEquilibrio') - currentResult.puntoEquilibrio) / currentResult.puntoEquilibrio * 100).toFixed(1) + '%'
                    : 'N/A'
                  }
                </div>
              </div>
              
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">Margen Contribución</div>
                <div className="text-2xl font-mono font-bold text-primary">
                  {(getSimulatedValue('margenContribucionPorc') * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-text-dim mt-1">
                  {getSimulatedValue('margenContribucionPorc') > currentResult.margenContribucionPorc ? '↗️' : '↘️'} 
                  {isFinite(getSimulatedValue('margenContribucionPorc')) && isFinite(currentResult.margenContribucionPorc)
                    ? ((getSimulatedValue('margenContribucionPorc') - currentResult.margenContribucionPorc) * 100).toFixed(1) + 'pp'
                    : 'N/A'
                  }
                </div>
              </div>
              
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">Utilidad Neta</div>
                <div className={`text-xl font-mono font-bold ${getSimulatedValue('utilidadNeta') >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {formatCurrency(getSimulatedValue('utilidadNeta'))}
                </div>
                <div className="text-xs text-text-dim mt-1">
                  {getSimulatedValue('utilidadNeta') > currentResult.utilidadNeta ? '↗️' : '↘️'} 
                  {formatCurrency(getSimulatedValue('utilidadNeta') - currentResult.utilidadNeta)}
                </div>
              </div>
              
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">EBITDA</div>
                <div className="text-xl font-mono font-bold text-warning">
                  {formatCurrency(getSimulatedValue('ebitda'))}
                </div>
                <div className="text-xs text-text-dim mt-1">
                  {getSimulatedValue('ebitda') > currentResult.ebitda ? '↗️' : '↘️'}
                  {formatCurrency(getSimulatedValue('ebitda') - currentResult.ebitda)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no se puede simular */}
      {(priceChange !== 0 || fixedCostChange !== 0 || variableCostRateChange !== 0) && 
       currentResult.margenContribucion <= 0 && (
        <div className="glass-card p-6 rounded-xl border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-warning/20 border border-warning/30">
              <Activity className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-display text-warning mb-1">
                ⚠️ Simulación No Disponible
              </h3>
              <p className="text-text-muted text-sm">
                No se puede simular escenarios con margen de contribución negativo. 
                Los costos variables superan los ingresos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Análisis CVU - Costo-Volumen-Utilidad */}
      {showCVUAnalysis && (
        <div className="glass-card p-6 rounded-xl border border-warning/50 bg-dark-card/80 shadow-glass">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                <Target className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <h3 className="text-2xl font-display text-warning font-semibold">
                    📈 Análisis CVU (Costo-Volumen-Utilidad)
                  </h3>
                  <p className="text-text-muted font-mono text-sm">
                    {showUnitsAnalysis && unitaryMetrics ? 
                      `Análisis unitario en m² | P.E: ${Math.round(unitaryMetrics.puntosEquilibrioM2[analysisType]).toLocaleString()} m² | MC: $${(currentResult.margenContribucion / (unitaryMetrics.m2Vendidos || 1)).toFixed(0)} por m²` : 
                      `Análisis ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} | P.E: ${formatCurrency(currentResult.puntoEquilibrio)}`
                    }
                  </p>
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Utilidad Objetivo - Rediseñado para Claridad */}
              <div className="glass-card p-4 rounded-lg">
                <div className="text-sm text-text-muted mb-2 flex items-center gap-2">
                  🎯 Utilidad Objetivo
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-text-dim">$</span>
                  <input
                    type="number"
                    value={targetProfit}
                    onChange={(e) => setTargetProfit(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1 px-2 py-1 text-sm bg-glass border border-border rounded text-text-secondary focus:ring-1 focus:ring-warning font-mono"
                  />
                </div>
                
                {targetProfit > 0 && (
                  <div className="border-t border-border/50 pt-2">
                    <div className="text-xs text-text-dim mb-1">Ventas requeridas:</div>
                    <div className="text-base font-mono font-bold text-warning">
                      {showUnitsAnalysis ? 
                        `${Math.round(cvuAnalysis.m2ParaUtilidad).toLocaleString()} m²` : 
                        formatCurrency(cvuAnalysis.ventasParaUtilidad)
                      }
                    </div>
                    <div className="text-xs text-text-dim mt-1">
                      {currentResult.ingresos > 0 && cvuAnalysis.ventasParaUtilidad > currentResult.ingresos ? 
                        `+${(((cvuAnalysis.ventasParaUtilidad / currentResult.ingresos) - 1) * 100).toFixed(1)}% vs actual` : 
                        'Objetivo alcanzable con ventas actuales'
                      }
                    </div>
                  </div>
                )}
                
                {targetProfit === 0 && (
                  <div className="text-xs text-text-dim text-center italic py-2">
                    Ingresa utilidad objetivo arriba
                  </div>
                )}
              </div>
              
              {/* Margen de Seguridad */}
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">Margen de Seguridad</div>
                <div className={`text-xl font-mono font-bold ${cvuAnalysis.margenSeguridadMonetario > 0 ? 'text-accent' : 'text-danger'}`}>
                  {showUnitsAnalysis ? 
                    `${Math.round(cvuAnalysis.margenSeguridadM2).toLocaleString()} m²` : 
                    formatCurrency(cvuAnalysis.margenSeguridadMonetario)
                  }
                </div>
                <div className="text-xs text-text-dim mt-1">
                  {showUnitsAnalysis ? 
                    `${cvuAnalysis.margenSeguridadPorcentualM2.toFixed(1)}% de los m² vendidos` :
                    `${cvuAnalysis.margenSeguridadPorcentual.toFixed(1)}% de las ventas actuales`
                  }
                </div>
              </div>
              
              {/* Situación Actual */}
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">Ventas Actuales</div>
                <div className="text-xl font-mono font-bold text-primary">
                  {showUnitsAnalysis ? 
                    `${Math.round(unitaryMetrics?.m2Vendidos || 0).toLocaleString()} m²` : 
                    formatCurrency(currentResult.ingresos)
                  }
                </div>
                <div className="text-xs text-text-dim mt-1">
                  vs P.E: {showUnitsAnalysis ?
                    `${Math.round(unitaryMetrics?.puntosEquilibrioM2?.[analysisType] || 0).toLocaleString()} m²` :
                    formatCurrency(currentResult.puntoEquilibrio)
                  }
                </div>
              </div>
              
              {/* Apalancamiento Operativo */}
              <div className="glass-card p-4 rounded-lg text-center">
                <div className="text-sm text-text-muted mb-1">Apalancamiento Operativo</div>
                <div className="text-xl font-mono font-bold text-accent">
                  {cvuAnalysis.grado_apalancamiento_operativo.toFixed(2)}x
                </div>
                <div className="text-xs text-text-dim mt-1">
                  Sensibilidad al volumen
                </div>
              </div>
          </div>

          {/* Interpretación CVU */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="text-sm font-display text-warning mb-2">💡 Interpretación CVU</h4>
                <div className="space-y-2 text-xs text-text-muted">
                  {(() => {
                    const margenActual = showUnitsAnalysis ? cvuAnalysis.margenSeguridadPorcentualM2 : cvuAnalysis.margenSeguridadPorcentual;
                    const unidad = showUnitsAnalysis ? 'm²' : '$';
                    
                    if (margenActual > 20) {
                      return <div className="text-accent">✅ Margen de seguridad saludable ({margenActual.toFixed(1)}% en {unidad})</div>;
                    } else if (margenActual > 0) {
                      return <div className="text-warning">⚠️ Margen de seguridad bajo ({margenActual.toFixed(1)}% en {unidad})</div>;
                    } else {
                      return <div className="text-danger">❌ Sin margen de seguridad - Por debajo del P.E.</div>;
                    }
                  })()}
                  
                  <div>
                    <strong>Apalancamiento Operativo:</strong> {cvuAnalysis.grado_apalancamiento_operativo.toFixed(2)}x
                    {cvuAnalysis.grado_apalancamiento_operativo > 3 ? (
                      <div className="text-danger text-xs mt-1">⚡ Muy alto - Una caída del 10% en ventas = {(cvuAnalysis.grado_apalancamiento_operativo * 10).toFixed(1)}% caída en utilidad</div>
                    ) : cvuAnalysis.grado_apalancamiento_operativo > 2 ? (
                      <div className="text-warning text-xs mt-1">⚠️ Alto - Una caída del 10% en ventas = {(cvuAnalysis.grado_apalancamiento_operativo * 10).toFixed(1)}% caída en utilidad</div>
                    ) : cvuAnalysis.grado_apalancamiento_operativo > 1.5 ? (
                      <div className="text-info text-xs mt-1">📊 Moderado - Una caída del 10% en ventas = {(cvuAnalysis.grado_apalancamiento_operativo * 10).toFixed(1)}% caída en utilidad</div>
                    ) : (
                      <div className="text-accent text-xs mt-1">🔒 Bajo - Estructura financiera estable</div>
                    )}
                  </div>
                  
                  {showUnitsAnalysis && unitaryMetrics && (
                    <div className="mt-2 p-2 bg-accent/10 rounded border border-accent/20">
                      <strong>Vista Unitaria:</strong> P.E. en {Math.round(unitaryMetrics.puntosEquilibrioM2[analysisType]).toLocaleString()} m² con MC real de ${(currentResult.margenContribucion / unitaryMetrics.m2Vendidos).toFixed(0)} por m²
                    </div>
                  )}
                </div>
              </div>
              
              <div className="glass-card p-4 rounded-lg">
                <h4 className="text-sm font-display text-primary mb-2">📚 Fórmulas CVU Clave</h4>
                <div className="space-y-2 text-xs text-text-muted font-mono">
                  <div>
                    <strong className="text-warning">P.E. en Unidades =</strong> Costos Fijos ÷ Margen Contribución Unitario
                  </div>
                  <div>
                    <strong className="text-accent">P.E. en Valor =</strong> Costos Fijos ÷ Razón Margen Contribución
                  </div>
                  <div>
                    <strong className="text-primary">Margen Seguridad =</strong> (Ventas Actuales - P.E.) ÷ Ventas Actuales
                  </div>
                  <div>
                    <strong className="text-info">Apalancamiento Op. =</strong> Margen Contribución ÷ Utilidad Operativa
                  </div>
                  {showUnitsAnalysis && unitaryMetrics && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="text-accent">
                        <strong>Datos Reales:</strong> {Math.round(unitaryMetrics.m2Vendidos).toLocaleString()} m² vendidos
                      </div>
                      <div>
                        MC Real: ${(currentResult.margenContribucion / (unitaryMetrics.m2Vendidos || 1)).toFixed(0)} por m² | Precio: ${Math.round(unitaryMetrics.precioVentaPorM2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="glass-card p-4 rounded-lg">
                <h4 className="text-sm font-display text-primary mb-2">🎯 Recomendaciones</h4>
                <div className="space-y-1 text-xs text-text-muted">
                  {targetProfit > 0 && (
                    <div>• Necesitas incrementar ventas {((cvuAnalysis.ventasParaUtilidad / currentResult.ingresos - 1) * 100).toFixed(1)}% para alcanzar utilidad objetivo</div>
                  )}
                  {cvuAnalysis.margenSeguridadPorcentual < 10 && (
                    <div>• Considera reducir costos fijos o mejorar márgenes</div>
                  )}
                  <div>• Cada 1% de aumento en ventas impacta {cvuAnalysis.grado_apalancamiento_operativo.toFixed(1)}% en utilidad</div>
                </div>
              </div>
            </div>
        </div>
      )}
      </div>

      {/* Main Analysis Grid - Compacto */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Interactive Chart */}
        <div className="xl:col-span-4 glass-card p-6 rounded-xl border border-border/60 bg-dark-card/80 shadow-glass transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-medium text-primary flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Gráfico Multinivel - {analysisType.toUpperCase()}
            </h3>
            <div className="flex items-center space-x-2 text-xs font-mono text-text-dim">
              <div className="w-2 h-2 bg-primary rounded"></div>
              <span>TIEMPO REAL</span>
            </div>
          </div>
            
            <div className="relative h-[380px] w-full">
              <Line
                data={{
                  labels: multiLevelChartData.map(d => d.ventas),
                  datasets: [
                    {
                      label: 'Ingresos',
                      data: multiLevelChartData.map(d => ({
                        x: d.ventas,
                        y: d.Ingresos
                      })),
                      borderColor: '#10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      fill: true,
                      tension: 0.4,
                      borderWidth: 2,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                    },
                    {
                      label: 'Costos Totales',
                      data: multiLevelChartData.map(d => ({
                        x: d.ventas,
                        y: d['Costos Totales']
                      })),
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      fill: true,
                      tension: 0.4,
                      borderWidth: 2,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                    },
                    {
                      label: 'P.E. Contable',
                      data: [
                        { x: multiLevelData.contable.puntoEquilibrio, y: 0 },
                        { x: multiLevelData.contable.puntoEquilibrio, y: Math.max(...multiLevelChartData.map(d => d.Ingresos)) * 1.2 }
                      ],
                      borderColor: '#3b82f6',
                      borderDash: [8, 4],
                      borderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 8,
                      fill: false,
                      showLine: true,
                    },
                    {
                      label: 'P.E. Operativo',
                      data: [
                        { x: multiLevelData.operativo.puntoEquilibrio, y: 0 },
                        { x: multiLevelData.operativo.puntoEquilibrio, y: Math.max(...multiLevelChartData.map(d => d.Ingresos)) * 1.2 }
                      ],
                      borderColor: '#06b6d4',
                      borderDash: [4, 8],
                      borderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 8,
                      fill: false,
                      showLine: true,
                    },
                    {
                      label: 'P.E. Caja',
                      data: [
                        { x: multiLevelData.caja.puntoEquilibrio, y: 0 },
                        { x: multiLevelData.caja.puntoEquilibrio, y: Math.max(...multiLevelChartData.map(d => d.Ingresos)) * 1.2 }
                      ],
                      borderColor: '#f59e0b',
                      borderDash: [2, 6],
                      borderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 8,
                      fill: false,
                      showLine: true,
                    },
                    {
                      label: 'P.E. Simulado',
                      data: [
                        { x: getSimulatedValue('puntoEquilibrio'), y: 0 },
                        { x: getSimulatedValue('puntoEquilibrio'), y: Math.max(...multiLevelChartData.map(d => d.Ingresos)) * 1.2 }
                      ],
                      borderColor: '#ec4899',
                      borderDash: [10, 2],
                      borderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 8,
                      fill: false,
                      showLine: true,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  resizeDelay: 0,
                  interaction: {
                    mode: 'x',
                    intersect: false,
                    axis: 'x',
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: '#9ca3af',
                        font: { size: 12, family: 'system-ui' },
                        padding: 12,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const datasetLabel = context.dataset.label || '';
                          const isBreakEvenLine = datasetLabel.includes('P.E');
                          const value = isBreakEvenLine
                            ? context.parsed.x
                            : context.parsed.y;
                          
                          if (datasetLabel) {
                            return `${datasetLabel}: ${formatCurrency(value || 0)}`;
                          }
                          return formatCurrency(value || 0);
                        },
                        title: function(context) {
                          return `Ventas: ${formatCurrency(context[0].parsed.x)}`;
                        }
                      },
                      backgroundColor: 'rgba(31, 41, 55, 0.95)',
                      borderColor: 'rgba(107, 114, 128, 0.3)',
                      borderWidth: 1,
                      titleColor: '#f3f4f6',
                      bodyColor: '#d1d5db',
                      padding: 12,
                    },
                  },
                  scales: {
                    x: {
                      type: 'linear',
                      title: { display: true, text: 'Ventas', color: '#9ca3af', font: { size: 12 } },
                      ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                          return `${(Number(value)/1000).toFixed(0)}k`;
                        }
                      },
                      grid: { color: 'rgba(107, 114, 128, 0.15)' },
                    },
                    y: {
                      title: { display: true, text: 'Valor', color: '#9ca3af', font: { size: 12 } },
                      ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                          return `${(Number(value)/1000).toFixed(0)}k`;
                        }
                      },
                      grid: { color: 'rgba(107, 114, 128, 0.15)' },
                    },
                  },
                }}
              />
            </div>
        </div>

        {/* Integrated Controls Panel */}
        <div className="xl:col-span-1" id="simulation-controls">
          <div className="glass-card p-4 rounded-xl border border-border/60 bg-dark-card/80 shadow-glass h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-primary flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Simulación {enableMonteCarlo ? '(Monte Carlo)' : '(Simple)'}
                </h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMonteCarlo}
                      onChange={(e) => setEnableMonteCarlo(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-4 rounded-full transition-colors ${enableMonteCarlo ? 'bg-accent' : 'bg-glass'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${enableMonteCarlo ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} />
                    </div>
                    <span className="ml-2 text-xs text-text-muted">MC</span>
                  </label>
                  <button
                    onClick={resetSimulation}
                    className="text-xs px-1 py-0.5 rounded bg-accent/20 hover:bg-accent/30 text-accent transition-colors relative z-30"
                  >
                    RESET
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {enableMonteCarlo ? (
                  <MonteCarloControls
                    iterations={monteCarloIterations}
                    onIterationsChange={setMonteCarloIterations}
                    distributions={[
                      {
                        title: 'Precios',
                        params: priceChangeParams,
                        unit: '%',
                        onChange: (next) => setPriceChangeParams(next),
                      },
                      {
                        title: 'C. Fijos',
                        params: fixedCostChangeParams,
                        unit: '$',
                        onChange: (next) => setFixedCostChangeParams(next),
                      },
                      {
                        title: 'Tasa C. Var.',
                        params: variableCostRateChangeParams,
                        unit: '%',
                        onChange: (next) => setVariableCostRateChangeParams(next),
                      },
                    ]}
                  />
                ) : (
                  <SimpleSimulationControls
                    priceChange={priceChange}
                    onPriceChange={setPriceChange}
                    fixedCostChange={fixedCostChange}
                    onFixedCostChange={setFixedCostChange}
                    currentFixedCosts={currentResult.costosFijos}
                    variableCostRateChange={variableCostRateChange}
                    onVariableCostRateChange={setVariableCostRateChange}
                  />
                )}
              </div>

              {/* Current Analysis Metrics */}
              <div className="mt-4 p-3 glass-card rounded-lg">
                <h4 className="text-xs font-display text-accent mb-2">
                  {analysisType.toUpperCase()} {enableMonteCarlo ? 'Estadísticas' : 'Actual'}
                </h4>
                <div className="space-y-1 text-xs">
                  {enableMonteCarlo ? (
                    <>
                      {/* Monte Carlo Statistics */}
                      <div className="flex justify-between">
                        <span className="text-text-muted">P.E. Media:</span>
                        <span className="font-mono text-primary">
                          {formatCurrency(getSimulatedValue('puntoEquilibrio', 'mean'))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">P.E. Mediana:</span>
                        <span className="font-mono text-primary">
                          {formatCurrency(getSimulatedValue('puntoEquilibrio', 'median'))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">P.E. Rango:</span>
                        <span className="font-mono text-xs text-text-dim">
                          {formatCurrency(getSimulatedValue('puntoEquilibrio', 'p10'))} - {formatCurrency(getSimulatedValue('puntoEquilibrio', 'p90'))}
                        </span>
                      </div>
                      <div className="border-t border-border pt-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Margen %:</span>
                          <span className="font-mono text-accent">
                            {(getSimulatedValue('margenContribucionPorc', 'mean') * 100).toFixed(1)}% ± {(getSimulatedValue('margenContribucionPorc', 'stdDev') * 100).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">U.Neta Media:</span>
                          <span className={`font-mono ${getSimulatedValue('utilidadNeta', 'mean') >= 0 ? 'text-accent' : 'text-danger'}`}>
                            {formatCurrency(getSimulatedValue('utilidadNeta', 'mean'))}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-primary/10 rounded border border-primary/20">
                        <div className="text-xs text-primary font-mono text-center">
                          {monteCarloIterations} iteraciones
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Simple metrics */}
                      <div className="flex justify-between">
                        <span className="text-text-muted">P.E:</span>
                        <span className="font-mono text-primary">
                          {showUnitsAnalysis ? 
                            `${Math.round(unitaryMetrics?.puntosEquilibrioM2?.[analysisType] || 0).toLocaleString()} m²` : 
                            formatCurrency(getSimulatedValue('puntoEquilibrio'))
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          {showUnitsAnalysis ? 'Precio/m²:' : 'Margen:'}
                        </span>
                        <span className="font-mono text-accent">
                          {showUnitsAnalysis ? 
                            `$${Math.round(unitaryMetrics?.precioVentaPorM2 || 0)}` : 
                            `${(simulatedResult.margenContribucionPorc * 100).toFixed(1)}%`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          {showUnitsAnalysis ? 'Costo/m²:' : 'U.Neta:'}
                        </span>
                        <span className={`font-mono ${showUnitsAnalysis ? 'text-warning' : (simulatedResult.utilidadNeta >= 0 ? 'text-accent' : 'text-danger')}`}>
                          {showUnitsAnalysis ? 
                            `$${Math.round(unitaryMetrics?.costoPorM2 || 0)}` : 
                            formatCurrency(simulatedResult.utilidadNeta)
                          }
                        </span>
                      </div>
                      {showUnitsAnalysis && (
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                          <span className="text-text-muted">m² Vendidos:</span>
                          <span className="font-mono text-text-secondary">
                            {Math.round(unitaryMetrics?.m2Vendidos || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal Explicativo para Tarjetas */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelpModal(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-dark-card/95 backdrop-blur-md p-8 rounded-2xl border-2 border-primary/50 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                    {showHelpModal === 'contable' && <BookOpen className="w-8 h-8 text-primary" />}
                    {showHelpModal === 'operativo' && <TrendingUp className="w-8 h-8 text-accent" />}
                    {showHelpModal === 'caja' && <DollarSign className="w-8 h-8 text-warning" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-display text-primary font-semibold">
                      P.E. {showHelpModal === 'contable' ? 'Contable' : showHelpModal === 'operativo' ? 'Operativo' : 'de Caja'}
                    </h2>
                    <p className="text-text-muted font-mono text-sm">
                      {showHelpModal === 'contable' ? 'Estándar' : showHelpModal === 'operativo' ? 'EBIT' : 'EBITDA'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(null)}
                  className="p-2 rounded-lg hover:bg-glass transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-lg font-display text-text-secondary mb-2">
                    📊 Valor Calculado
                  </h3>
                  <p className="text-2xl font-mono font-bold text-primary">
                    {showHelpModal === 'contable' && formatCurrency(multiLevelData.contable.puntoEquilibrio)}
                    {showHelpModal === 'operativo' && formatCurrency(multiLevelData.operativo.puntoEquilibrio)}
                    {showHelpModal === 'caja' && formatCurrency(multiLevelData.caja.puntoEquilibrio)}
                  </p>
                  <p className="text-text-muted text-sm mt-2">
                    Nivel de ventas mínimo requerido para alcanzar el equilibrio
                  </p>
                </div>

                <div className="glass-card p-4 rounded-lg">
                  <h3 className="text-lg font-display text-text-secondary mb-2">
                    🎯 Interpretación
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    {showHelpModal === 'contable' && 
                      'Punto donde la utilidad neta contable es cero. Incluye todos los costos y gastos contables: depreciación de activos fijos, amortizaciones de intangibles, intereses financieros, impuestos y todos los demás gastos según normas contables.'
                    }
                    {showHelpModal === 'operativo' && 
                      'Punto donde las operaciones cubren todos los costos excepto financieros (EBIT = 0). Incluye depreciación y amortizaciones pero excluye intereses y gastos financieros. Ideal para evaluar la eficiencia operativa sin considerar la estructura de financiamiento.'
                    }
                    {showHelpModal === 'caja' && 
                      'Punto donde el flujo de efectivo operativo se equilibra (EBITDA = 0). Excluye todos los gastos que no requieren salida inmediata de efectivo: depreciación de activos fijos, amortizaciones de intangibles, e intereses financieros. Muestra el punto de equilibrio en términos de generación de caja.'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3 rounded text-center">
                    <div className="text-sm text-text-muted">Margen</div>
                    <div className="text-lg font-mono text-accent">
                      {showHelpModal === 'contable' && `${(multiLevelData.contable.margenContribucionPorc * 100).toFixed(1)}%`}
                      {showHelpModal === 'operativo' && `${(multiLevelData.operativo.margenContribucionPorc * 100).toFixed(1)}%`}
                      {showHelpModal === 'caja' && `${(multiLevelData.caja.margenContribucionPorc * 100).toFixed(1)}%`}
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded text-center">
                    <div className="text-sm text-text-muted">U. Neta</div>
                    <div className="text-lg font-mono text-primary">
                      {showHelpModal === 'contable' && formatCurrency(multiLevelData.contable.utilidadNeta)}
                      {showHelpModal === 'operativo' && formatCurrency(multiLevelData.operativo.utilidadNeta)}
                      {showHelpModal === 'caja' && formatCurrency(multiLevelData.caja.utilidadNeta)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Análisis Estadístico */}
      <AnimatePresence>
        {showStatisticalAnalysis && statisticalAnalysis && (
          <StatisticalAnalysis
            statistics={statisticalAnalysis}
            onClose={() => setShowStatisticalAnalysis(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BreakEvenAnalysis;

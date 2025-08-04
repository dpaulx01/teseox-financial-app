// Enhanced KPI Widget with custom KPIs support
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Banknote,
  BarChart3,
  Trophy,
  Settings,
  AlertTriangle,
  CheckCircle,
  Flame
} from 'lucide-react';
import { KPIWidgetSettings, WidgetConfig } from '../../types/dashboard';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { calculatePnl } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import WidgetContainer from './WidgetContainer';
import { CustomKPI, KPIFormula } from './CustomKPIManager';

interface EnhancedKPIWidgetSettings extends KPIWidgetSettings {
  customKPIId?: string;
  showProgress?: boolean;
  showBenchmark?: boolean;
  animateValue?: boolean;
  alertThreshold?: number;
}

interface EnhancedKPIWidgetProps {
  widget: WidgetConfig;
  customKPIs?: CustomKPI[];
}

const EnhancedKPIWidget: React.FC<EnhancedKPIWidgetProps> = ({ 
  widget, 
  customKPIs = [] 
}) => {
  const { data } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  const settings = widget.settings as EnhancedKPIWidgetSettings;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Calculate PyG result
  const pnlResult = useMemo(() => {
    if (!data) return null;
    
    try {
      return calculatePnl(data, 'Anual', 'contable', mixedCosts);
    } catch (error) {
      // console.error('Error calculating P&L for KPI widget:', error);
      return null;
    }
  }, [data, mixedCosts]);

  // Find custom KPI if specified
  const customKPI = settings.customKPIId 
    ? customKPIs.find(kpi => kpi.id === settings.customKPIId)
    : null;

  // Calculate custom KPI value
  const calculateCustomKPIValue = (formula: KPIFormula): number => {
    if (!pnlResult) return 0;

    const getOperandValue = (operand: any): number => {
      let value = 0;
      
      switch (operand.type) {
        case 'constant':
          value = Number(operand.value);
          break;
        case 'kpi':
          switch (operand.value) {
            case 'ingresos':
              value = pnlResult.summaryKpis.ingresos;
              break;
            case 'costos':
              value = pnlResult.summaryKpis.costos;
              break;
            case 'utilidad':
              value = pnlResult.summaryKpis.utilidad;
              break;
            case 'gastosOperacionales':
              value = pnlResult.summaryKpis.gastosOperacionales;
              break;
            case 'ebitda':
              // Approximate EBITDA
              value = pnlResult.summaryKpis.utilidad + (Math.abs(pnlResult.summaryKpis.costos) * 0.15);
              break;
            default:
              value = 0;
          }
          break;
        case 'account':
          // For account-based calculations, we'd need to traverse the tree
          value = 0;
          break;
      }

      // Apply modifiers
      if (operand.modifier === 'abs') {
        value = Math.abs(value);
      } else if (operand.modifier === 'negate') {
        value = -value;
      }

      return value;
    };

    if (formula.type === 'simple') {
      const numeratorValue = getOperandValue(formula.numerator);
      const denominatorValue = formula.denominator ? getOperandValue(formula.denominator) : 1;
      
      return denominatorValue !== 0 ? numeratorValue / denominatorValue : 0;
    } else {
      // Complex formula
      let result = getOperandValue(formula.numerator);
      
      if (formula.operations) {
        formula.operations.forEach(operation => {
          const operandValue = getOperandValue(operation.operand);
          
          switch (operation.operator) {
            case 'add':
              result += operandValue;
              break;
            case 'subtract':
              result -= operandValue;
              break;
            case 'multiply':
              result *= operandValue;
              break;
            case 'divide':
              result = operandValue !== 0 ? result / operandValue : 0;
              break;
          }
        });
      }
      
      return result;
    }
  };

  // Calculate KPI data
  const kpiData = useMemo(() => {
    if (!data || !pnlResult) return null;

    let value = 0;
    let previousValue = 0;
    let format = settings.format;
    let name = '';
    let color = '#00F0FF';
    let target = settings.target;

    // Use custom KPI if specified
    if (customKPI) {
      value = calculateCustomKPIValue(customKPI.formula);
      name = customKPI.name;
      format = customKPI.format;
      color = customKPI.color;
      target = customKPI.target;
      // Mock previous value for trend calculation
      previousValue = value * 0.92;
    } else {
      // Standard KPI calculations
      switch (settings.metric) {
        case 'ingresos':
          value = pnlResult.summaryKpis.ingresos;
          name = 'Ingresos';
          previousValue = value * 0.92; // Mock 8% growth
          break;
        case 'costos':
          value = Math.abs(pnlResult.summaryKpis.costos);
          name = 'Costos';
          previousValue = value * 1.05; // Mock 5% cost increase
          break;
        case 'utilidad':
          value = pnlResult.summaryKpis.utilidad;
          name = 'Utilidad Neta';
          previousValue = value * 0.88; // Mock 12% growth
          break;
        case 'margen_neto':
          value = pnlResult.summaryKpis.ingresos !== 0 
            ? (pnlResult.summaryKpis.utilidad / pnlResult.summaryKpis.ingresos) * 100
            : 0;
          name = 'Margen Neto';
          format = 'percentage';
          previousValue = value * 0.95; // Mock improvement
          break;
        case 'margen_bruto':
          const margenBruto = pnlResult.summaryKpis.ingresos !== 0
            ? ((pnlResult.summaryKpis.ingresos - Math.abs(pnlResult.summaryKpis.costos)) / pnlResult.summaryKpis.ingresos) * 100
            : 0;
          value = margenBruto;
          name = 'Margen Bruto';
          format = 'percentage';
          previousValue = value * 0.98; // Mock slight improvement
          break;
        case 'ebitda':
          // Approximate EBITDA calculation
          value = pnlResult.summaryKpis.utilidad + (Math.abs(pnlResult.summaryKpis.costos) * 0.15); // Add back estimated D&A
          name = 'EBITDA';
          previousValue = value * 0.85; // Mock significant improvement
          break;
        default:
          value = 0;
          name = 'KPI Desconocido';
          previousValue = 0;
      }
    }
    
    // Calculate trend
    const changeAmount = value - previousValue;
    const changePercent = previousValue !== 0 ? (changeAmount / Math.abs(previousValue)) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    // Format value based on format type
    const formatted = format === 'currency' ? formatCurrency(value) :
                     format === 'percentage' ? `${value.toFixed(1)}%` :
                     format === 'ratio' ? `${value.toFixed(2)}:1` :
                     value.toLocaleString('es-CO', { maximumFractionDigits: 0 });

    // Calculate target progress
    const targetProgress = target ? Math.min((value / target) * 100, 100) : undefined;
    const targetMet = target ? value >= target : false;

    // Check alert condition
    const hasAlert = settings.alertThreshold ? 
      (value < settings.alertThreshold && trend === 'down') : false;

    return {
      name,
      value,
      formatted,
      change: Math.abs(changePercent),
      trend,
      color,
      target,
      targetProgress,
      targetMet,
      hasAlert,
      isCustom: !!customKPI
    };
  }, [data, pnlResult, settings, customKPI, calculateCustomKPIValue]);

  // Get appropriate icon based on metric
  const getKPIIcon = () => {
    if (customKPI) {
      return <BarChart3 className="h-6 w-6" style={{ color: customKPI.color }} />;
    }

    switch (settings.metric) {
      case 'ingresos':
        return <Banknote className="h-6 w-6 text-green-400" />;
      case 'costos':
        return <AlertTriangle className="h-6 w-6 text-red-400" />;
      case 'utilidad':
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      case 'margen_neto':
      case 'margen_bruto':
        return <BarChart3 className="h-6 w-6 text-purple-400" />;
      case 'ebitda':
        return <Flame className="h-6 w-6 text-orange-400" />;
      default:
        return <BarChart3 className="h-6 w-6 text-blue-400" />;
    }
  };

  // Get trend icon
  const getTrendIcon = () => {
    if (!kpiData) return null;
    
    switch (kpiData.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!kpiData) {
    return (
      <WidgetContainer widget={widget} onSettingsClick={() => setIsSettingsOpen(true)}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Cargando KPI...</div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <>
      <WidgetContainer widget={widget} onSettingsClick={() => setIsSettingsOpen(true)}>
        <div className="h-full flex flex-col justify-between p-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getKPIIcon()}
              <div>
                <h4 className="font-medium text-white text-sm leading-tight">
                  {widget.title}
                </h4>
                {kpiData.isCustom && (
                  <span className="text-xs text-purple-400">Personalizado</span>
                )}
              </div>
            </div>
            
            {/* Alert indicator */}
            {kpiData.hasAlert && (
              <motion.div
                className="w-3 h-3 bg-red-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </div>

          {/* Main Value */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              className="text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div 
                className="text-2xl font-bold mb-1"
                style={{ 
                  color: kpiData.color,
                  textShadow: `0 0 10px ${kpiData.color}40`
                }}
              >
                {kpiData.formatted}
              </div>
              
              {/* Trend indicator */}
              {settings.showTrend && (
                <div className="flex items-center justify-center space-x-1">
                  {getTrendIcon()}
                  <span className={`text-xs font-medium ${
                    kpiData.trend === 'up' ? 'text-green-400' :
                    kpiData.trend === 'down' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {kpiData.change.toFixed(1)}%
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Target Progress */}
          {settings.showTarget && kpiData.target && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Meta</span>
                <div className="flex items-center space-x-1">
                  {kpiData.targetMet && <CheckCircle className="h-3 w-3 text-green-400" />}
                  <span className={kpiData.targetMet ? 'text-green-400' : 'text-gray-400'}>
                    {settings.format === 'currency' 
                      ? formatCurrency(kpiData.target)
                      : settings.format === 'percentage'
                      ? `${kpiData.target.toFixed(1)}%`
                      : kpiData.target.toLocaleString()
                    }
                  </span>
                </div>
              </div>
              
              {settings.showProgress && kpiData.targetProgress && (
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <motion.div
                    className={`h-1.5 rounded-full ${
                      kpiData.targetMet ? 'bg-green-400' : 'bg-purple-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(kpiData.targetProgress, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Custom KPI Info */}
          {kpiData.isCustom && customKPI && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400 leading-relaxed">
                {customKPI.description}
              </p>
            </div>
          )}
        </div>
      </WidgetContainer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <EnhancedKPIWidgetSettingsModal
          widget={widget}
          customKPIs={customKPIs}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
};

// Enhanced Settings Modal Component
interface EnhancedKPIWidgetSettingsModalProps {
  widget: WidgetConfig;
  customKPIs: CustomKPI[];
  onClose: () => void;
}

const EnhancedKPIWidgetSettingsModal: React.FC<EnhancedKPIWidgetSettingsModalProps> = ({
  widget,
  customKPIs,
  onClose
}) => {
  const settings = widget.settings as EnhancedKPIWidgetSettings;
  const [localSettings, setLocalSettings] = useState<EnhancedKPIWidgetSettings>({ ...settings });

  const handleSave = () => {
    // console.log('Saving enhanced KPI widget settings:', localSettings);
    onClose();
  };

  const standardMetrics = [
    { id: 'ingresos', name: 'Ingresos' },
    { id: 'costos', name: 'Costos' },
    { id: 'utilidad', name: 'Utilidad Neta' },
    { id: 'margen_neto', name: 'Margen Neto' },
    { id: 'margen_bruto', name: 'Margen Bruto' },
    { id: 'ebitda', name: 'EBITDA' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 rounded-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold neon-text">
            Configurar KPI
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* KPI Source */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Fuente del KPI
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!localSettings.customKPIId}
                  onChange={() => setLocalSettings(prev => ({ 
                    ...prev, 
                    customKPIId: undefined 
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">KPI Estándar</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!!localSettings.customKPIId}
                  onChange={() => setLocalSettings(prev => ({ 
                    ...prev, 
                    customKPIId: customKPIs[0]?.id || 'custom'
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">KPI Personalizado</span>
              </label>
            </div>
          </div>

          {/* Standard Metric Selection */}
          {!localSettings.customKPIId && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Métrica
              </label>
              <select
                value={localSettings.metric}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  metric: e.target.value as any
                }))}
                className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                {standardMetrics.map(metric => (
                  <option key={metric.id} value={metric.id}>{metric.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom KPI Selection */}
          {localSettings.customKPIId && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                KPI Personalizado
              </label>
              <select
                value={localSettings.customKPIId}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  customKPIId: e.target.value
                }))}
                className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                {customKPIs.map(kpi => (
                  <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Display Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-400">Opciones de Visualización</h4>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showTrend}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showTrend: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar tendencia</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showTarget}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showTarget: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar meta</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showProgress}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showProgress: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar barra de progreso</span>
            </label>
          </div>

          {/* Target Value */}
          {localSettings.showTarget && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Valor Meta
              </label>
              <input
                type="number"
                value={localSettings.target || ''}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  target: e.target.value ? Number(e.target.value) : undefined
                }))}
                className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                placeholder="Valor objetivo"
              />
            </div>
          )}

          {/* Alert Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Umbral de Alerta (opcional)
            </label>
            <input
              type="number"
              value={localSettings.alertThreshold || ''}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                alertThreshold: e.target.value ? Number(e.target.value) : undefined
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              placeholder="Valor mínimo antes de alerta"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Guardar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedKPIWidget;
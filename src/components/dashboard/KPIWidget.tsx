// Enhanced KPI Widget with custom KPIs support
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../animations/AnimatedComponents';
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  Banknote,
  BarChart3,
  Trophy,
  Settings,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { KPIWidgetSettings, WidgetConfig } from '../../types/dashboard';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { calculatePnl } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import WidgetContainer from './WidgetContainer';
import { CustomKPI } from './CustomKPIManager';

interface KPIWidgetProps {
  widget: WidgetConfig;
}

const KPIWidget: React.FC<KPIWidgetProps> = ({ widget }) => {
  const { data } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  const settings = widget.settings as KPIWidgetSettings;
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

  // Calculate KPI value based on current data
  const kpiData = useMemo(() => {
    if (!data || !pnlResult) return null;

    let value = 0;
    let previousValue = 0;

    // Calculate current value based on metric type
    switch (settings.metric) {
      case 'ingresos':
        value = pnlResult.summaryKpis.ingresos;
        previousValue = value * 0.92; // Mock 8% growth
        break;
      case 'costos':
        value = Math.abs(pnlResult.summaryKpis.costos);
        previousValue = value * 1.05; // Mock 5% cost increase
        break;
      case 'utilidad':
        value = pnlResult.summaryKpis.utilidad;
        previousValue = value * 0.88; // Mock 12% growth
        break;
      case 'margen_neto':
        value = pnlResult.summaryKpis.ingresos !== 0 
          ? (pnlResult.summaryKpis.utilidad / pnlResult.summaryKpis.ingresos) * 100
          : 0;
        previousValue = value * 0.95; // Mock improvement
        break;
      case 'margen_bruto':
        const margenBruto = pnlResult.summaryKpis.ingresos !== 0
          ? ((pnlResult.summaryKpis.ingresos - Math.abs(pnlResult.summaryKpis.costos)) / pnlResult.summaryKpis.ingresos) * 100
          : 0;
        value = margenBruto;
        previousValue = value * 0.98; // Mock slight improvement
        break;
      case 'ebitda':
        // Approximate EBITDA calculation
        value = pnlResult.summaryKpis.utilidad + (Math.abs(pnlResult.summaryKpis.costos) * 0.15); // Add back estimated D&A
        previousValue = value * 0.85; // Mock significant improvement
        break;
      default:
        value = 0;
        previousValue = 0;
    }
    
    // Calculate trend
    const changeAmount = value - previousValue;
    const changePercent = previousValue !== 0 ? (changeAmount / Math.abs(previousValue)) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    // Format value based on format type
    const formatted = settings.format === 'currency' ? formatCurrency(value) :
                 settings.format === 'percentage' ? `${value.toFixed(1)}%` :
                 value.toLocaleString();

    return {
      value,
      formatted,
      trend,
      change: changePercent,
      target: settings.target,
      targetProgress: settings.target ? (value / settings.target) * 100 : undefined
    };
  }, [data, settings]);

  const getIcon = () => {
    switch (settings.metric) {
      case 'ingresos':
        return <Banknote className="h-6 w-6" />;
      case 'utilidad':
        return <Trophy className="h-6 w-6" />;
      default:
        return <BarChart3 className="h-6 w-6" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-400" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (!kpiData) {
    return (
      <WidgetContainer widget={widget}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Cargando...</div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer widget={widget}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-purple-400">
            {getIcon()}
            <h3 className="font-semibold text-sm text-gray-300">
              {widget.title}
            </h3>
          </div>
          {settings.showTrend && (
            <div className="flex items-center space-x-1">
              {getTrendIcon(kpiData.trend)}
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            className="text-3xl font-bold neon-text mb-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatedCounter
              value={kpiData.value}
              formatFn={(value) => {
                if (settings.format === 'currency') return formatCurrency(value);
                if (settings.format === 'percentage') return `${value.toFixed(1)}%`;
                return value.toLocaleString();
              }}
              duration={2}
              className=""
            />
          </motion.div>

          {/* Trend Information */}
          {settings.showTrend && (
            <div className={`flex items-center space-x-2 text-sm ${getTrendColor(kpiData.trend)}`}>
              {getTrendIcon(kpiData.trend)}
              <span>
                {kpiData.change.toFixed(1)}% vs anterior
              </span>
            </div>
          )}
        </div>

        {/* Target Progress */}
        {settings.showTarget && kpiData.targetProgress !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Meta</span>
              <span>{kpiData.targetProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(kpiData.targetProgress, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Additional Metrics */}
        <div className="mt-4 pt-4 border-t border-purple-500/20">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Período</div>
              <div className="text-white font-semibold">
                {settings.period === 'current' ? 'Actual' : 
                 settings.period === 'ytd' ? 'YTD' : 'Custom'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Estado</div>
              <div className={`font-semibold ${
                kpiData.targetProgress && kpiData.targetProgress >= 100 ? 'text-green-400' :
                kpiData.targetProgress && kpiData.targetProgress >= 75 ? 'text-yellow-400' :
                'text-purple-400'
              }`}>
                {kpiData.targetProgress && kpiData.targetProgress >= 100 ? 'Superado' :
                 kpiData.targetProgress && kpiData.targetProgress >= 75 ? 'En Meta' :
                 'En Progreso'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
};

export default KPIWidget;
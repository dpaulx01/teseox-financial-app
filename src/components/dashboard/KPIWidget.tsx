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
import { usePnlResult } from '../../hooks/usePnlResult';
import { getSortedMonths } from '../../utils/dateUtils';
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

  // Obtener PyG (async) con hook reutilizable
  const { result: pnlResult, loading } = usePnlResult(data, 'Anual', 'contable', mixedCosts);

  // Calculate KPI value based on current data
  const kpiData = useMemo(() => {
    if (!data || !pnlResult) return null;

    const monthly = data.monthly || {};
    const months = getSortedMonths(monthly);
    const last = months[months.length - 1];
    const prev = months[months.length - 2];

    const pick = (key: 'ingresos'|'costoVentasTotal'|'utilidadNeta'|'ebitda') => (m?: string) => (m && monthly[m]?.[key]) || 0;
    const safePct = (num: number, den: number) => den !== 0 ? (num / Math.abs(den)) * 100 : 0;

    let value = 0;
    let previousValue = 0;

    switch (settings.metric) {
      case 'ingresos':
        value = last ? pick('ingresos')(last) : pnlResult.summaryKpis.ingresos;
        previousValue = prev ? pick('ingresos')(prev) : value * 0.95;
        break;
      case 'costos':
        value = last ? Math.abs(pick('costoVentasTotal')(last)) : Math.abs(pnlResult.summaryKpis.costos);
        previousValue = prev ? Math.abs(pick('costoVentasTotal')(prev)) : value * 1.02;
        break;
      case 'utilidad':
        value = last ? pick('utilidadNeta')(last) : pnlResult.summaryKpis.utilidad;
        previousValue = prev ? pick('utilidadNeta')(prev) : value * 0.95;
        break;
      case 'margen_neto': {
        const v = last ? pick('utilidadNeta')(last) : pnlResult.summaryKpis.utilidad;
        const rev = last ? pick('ingresos')(last) : pnlResult.summaryKpis.ingresos;
        value = safePct(v, rev);
        const vp = prev ? pick('utilidadNeta')(prev) : v * 0.95;
        const revp = prev ? pick('ingresos')(prev) : rev;
        previousValue = safePct(vp, revp);
        break; }
      case 'margen_bruto': {
        const rev = last ? pick('ingresos')(last) : pnlResult.summaryKpis.ingresos;
        const cogs = last ? pick('costoVentasTotal')(last) : Math.abs(pnlResult.summaryKpis.costos);
        value = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;
        const prevRev = prev ? pick('ingresos')(prev) : rev;
        const prevCogs = prev ? pick('costoVentasTotal')(prev) : cogs;
        previousValue = prevRev > 0 ? ((prevRev - prevCogs) / prevRev) * 100 : value;
        break; }
      case 'ebitda':
        value = last ? pick('ebitda')(last) : pnlResult.summaryKpis.utilidad; // prefer monthly ebitda
        previousValue = prev ? pick('ebitda')(prev) : value * 0.9;
        break;
      default:
        value = 0; previousValue = 0;
    }

    const changeAmount = value - previousValue;
    const changePercent = previousValue !== 0 ? (changeAmount / Math.abs(previousValue)) * 100 : 0;
    const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

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
  }, [data, pnlResult, settings]);

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

  if (loading || !kpiData) {
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

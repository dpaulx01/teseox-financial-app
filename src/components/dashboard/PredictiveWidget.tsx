// Predictive Analysis Widget for Dashboard
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Beaker,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Settings
} from 'lucide-react';
import { WidgetConfig } from '../../types/dashboard';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { calculatePnl } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import WidgetContainer from './WidgetContainer';

interface PredictiveWidgetSettings {
  view: 'trends' | 'scenarios' | 'forecast';
  timeHorizon: 'quarter' | 'year' | 'custom';
  confidenceLevel: number;
  showRisks: boolean;
  showOpportunities: boolean;
}

interface PredictiveWidgetProps {
  widget: WidgetConfig;
}

interface PredictionMetric {
  name: string;
  current: number;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  risk: 'low' | 'medium' | 'high';
}

const PredictiveWidget: React.FC<PredictiveWidgetProps> = ({ widget }) => {
  const { data } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  const settings = widget.settings as PredictiveWidgetSettings;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Calculate current P&L data
  const pnlResult = useMemo(() => {
    if (!data) return null;
    
    try {
      return calculatePnl(data, 'Anual', 'contable', mixedCosts);
    } catch (error) {
      // console.error('Error calculating P&L for predictive widget:', error);
      return null;
    }
  }, [data, mixedCosts]);

  // Generate predictive metrics
  const predictiveMetrics: PredictionMetric[] = useMemo(() => {
    if (!pnlResult) return [];

    // Mock historical data for trend calculation
    const historicalGrowthRates = {
      revenue: 0.08, // 8% historical growth
      costs: 0.05,   // 5% cost inflation
      expenses: 0.03 // 3% expense growth
    };

    const seasonalFactors = {
      quarter: 1.0,
      year: 1.0
    };

    const factor = seasonalFactors[settings.timeHorizon] || 1.0;
    
    return [
      {
        name: 'Ingresos',
        current: pnlResult.summaryKpis.ingresos,
        predicted: pnlResult.summaryKpis.ingresos * (1 + historicalGrowthRates.revenue) * factor,
        confidence: 85,
        trend: 'up',
        risk: 'medium'
      },
      {
        name: 'Costos',
        current: Math.abs(pnlResult.summaryKpis.costos),
        predicted: Math.abs(pnlResult.summaryKpis.costos) * (1 + historicalGrowthRates.costs) * factor,
        confidence: 78,
        trend: 'up',
        risk: 'medium'
      },
      {
        name: 'Gastos Operacionales',
        current: Math.abs(pnlResult.summaryKpis.gastosOperacionales),
        predicted: Math.abs(pnlResult.summaryKpis.gastosOperacionales) * (1 + historicalGrowthRates.expenses) * factor,
        confidence: 82,
        trend: 'up',
        risk: 'low'
      },
      {
        name: 'Utilidad Neta',
        current: pnlResult.summaryKpis.utilidad,
        predicted: pnlResult.summaryKpis.utilidad * 1.12 * factor, // 12% improvement
        confidence: 72,
        trend: 'up',
        risk: 'high'
      }
    ];
  }, [pnlResult, settings.timeHorizon]);

  // Generate risk and opportunity insights
  const insights = useMemo(() => {
    const risks = [
      {
        type: 'risk',
        title: 'Volatilidad del Mercado',
        description: 'Alta variabilidad esperada en ingresos por condiciones económicas',
        severity: 'medium' as const,
        probability: 65
      },
      {
        type: 'risk',
        title: 'Presión en Márgenes',
        description: 'Posible incremento de costos por inflación de insumos',
        severity: 'high' as const,
        probability: 45
      }
    ];

    const opportunities = [
      {
        type: 'opportunity',
        title: 'Optimización Operativa',
        description: 'Potencial ahorro del 8% en gastos administrativos',
        impact: 'high' as const,
        timeline: '6 meses'
      },
      {
        type: 'opportunity',
        title: 'Expansión Digital',
        description: 'Nuevos canales pueden incrementar ingresos 15%',
        impact: 'high' as const,
        timeline: '12 meses'
      }
    ];

    return { risks, opportunities };
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!data || !pnlResult) {
    return (
      <WidgetContainer widget={widget} onSettingsClick={() => setIsSettingsOpen(true)}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Cargando análisis predictivo...</div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <>
      <WidgetContainer widget={widget} onSettingsClick={() => setIsSettingsOpen(true)}>
        <div className="h-full flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
            <h4 className="font-semibold text-purple-400 flex items-center">
              <Beaker className="h-5 w-5 mr-2" />
              {widget.title}
            </h4>
            <div className="text-xs text-gray-400">
              Horizonte: {settings.timeHorizon === 'quarter' ? 'Trimestre' : 'Año'}
            </div>
          </div>

          {/* Content based on view */}
          {settings.view === 'trends' && (
            <div className="flex-1 space-y-3">
              {predictiveMetrics.slice(0, 3).map((metric, index) => (
                <motion.div
                  key={metric.name}
                  className="p-3 bg-slate-800/30 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.trend)}
                      <span className="text-sm font-medium text-white">{metric.name}</span>
                    </div>
                    <span className={`text-xs ${getRiskColor(metric.risk)}`}>
                      {metric.risk.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">Actual</div>
                      <div className="font-mono text-blue-400">
                        {formatCurrency(metric.current)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Proyección</div>
                      <div className={`font-mono ${
                        metric.predicted > metric.current ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(metric.predicted)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Cambio: {((metric.predicted - metric.current) / Math.abs(metric.current) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-purple-400">
                      Confianza: {metric.confidence}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {settings.view === 'scenarios' && (
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <div className="text-xs text-green-400 mb-1">Optimista</div>
                  <div className="text-sm font-bold text-green-400">
                    {formatCurrency(pnlResult.summaryKpis.utilidad * 1.25)}
                  </div>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <div className="text-xs text-blue-400 mb-1">Base</div>
                  <div className="text-sm font-bold text-blue-400">
                    {formatCurrency(pnlResult.summaryKpis.utilidad)}
                  </div>
                </div>
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <div className="text-xs text-red-400 mb-1">Pesimista</div>
                  <div className="text-sm font-bold text-red-400">
                    {formatCurrency(pnlResult.summaryKpis.utilidad * 0.8)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-300 mb-2">Variables Clave:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Crecimiento ingresos</span>
                    <span className="text-green-400">+8.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Inflación costos</span>
                    <span className="text-red-400">+5.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Eficiencia operativa</span>
                    <span className="text-purple-400">+3.1%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settings.view === 'forecast' && (
            <div className="flex-1 space-y-3">
              <div className="text-center p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Utilidad Proyectada</div>
                <div className="text-2xl font-bold neon-text">
                  {formatCurrency(predictiveMetrics.find(m => m.name === 'Utilidad Neta')?.predicted || 0)}
                </div>
                <div className="text-xs text-purple-400">
                  Confianza: {predictiveMetrics.find(m => m.name === 'Utilidad Neta')?.confidence || 0}%
                </div>
              </div>

              {/* Key Insights */}
              <div className="space-y-2">
                {settings.showRisks && insights.risks.slice(0, 1).map((risk, index) => (
                  <div key={index} className="p-2 bg-red-500/10 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-xs font-medium text-red-400">{risk.title}</span>
                    </div>
                    <p className="text-xs text-gray-300">{risk.description}</p>
                  </div>
                ))}

                {settings.showOpportunities && insights.opportunities.slice(0, 1).map((opp, index) => (
                  <div key={index} className="p-2 bg-green-500/10 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Lightbulb className="h-4 w-4 text-green-400" />
                      <span className="text-xs font-medium text-green-400">{opp.title}</span>
                    </div>
                    <p className="text-xs text-gray-300">{opp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WidgetContainer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <PredictiveWidgetSettingsModal
          widget={widget}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
};

// Settings Modal Component
interface PredictiveWidgetSettingsModalProps {
  widget: WidgetConfig;
  onClose: () => void;
}

const PredictiveWidgetSettingsModal: React.FC<PredictiveWidgetSettingsModalProps> = ({
  widget,
  onClose
}) => {
  const settings = widget.settings as PredictiveWidgetSettings;
  const [localSettings, setLocalSettings] = useState<PredictiveWidgetSettings>({ ...settings });

  const handleSave = () => {
    // Update widget settings through context
    // console.log('Saving predictive widget settings:', localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 rounded-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold neon-text">
            Configurar Análisis Predictivo
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* View Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Tipo de Vista
            </label>
            <select
              value={localSettings.view}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                view: e.target.value as PredictiveWidgetSettings['view']
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="trends">Tendencias</option>
              <option value="scenarios">Escenarios</option>
              <option value="forecast">Pronóstico</option>
            </select>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Horizonte Temporal
            </label>
            <select
              value={localSettings.timeHorizon}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                timeHorizon: e.target.value as PredictiveWidgetSettings['timeHorizon']
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="quarter">Trimestre</option>
              <option value="year">Año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nivel de Confianza: {localSettings.confidenceLevel}%
            </label>
            <input
              type="range"
              min="50"
              max="95"
              value={localSettings.confidenceLevel}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                confidenceLevel: Number(e.target.value)
              }))}
              className="w-full slider-thumb"
            />
          </div>

          {/* Display Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showRisks}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showRisks: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar riesgos</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showOpportunities}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showOpportunities: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar oportunidades</span>
            </label>
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

export default PredictiveWidget;
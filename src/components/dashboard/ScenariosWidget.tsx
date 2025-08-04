// Scenarios Widget for Dashboard - What-If Analysis
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  Beaker,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Play,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ScenariosWidgetSettings, WidgetConfig } from '../../types/dashboard';
import { useFinancialData } from '../../contexts/DataContext';
import { useMixedCosts } from '../../contexts/MixedCostContext';
import { calculatePnl } from '../../utils/pnlCalculator';
import { formatCurrency } from '../../utils/formatters';
import WidgetContainer from './WidgetContainer';

interface ScenariosWidgetProps {
  widget: WidgetConfig;
}

interface ScenarioSummary {
  id: string;
  name: string;
  type: 'optimistic' | 'realistic' | 'pessimistic' | 'custom';
  originalValue: number;
  projectedValue: number;
  change: number;
  changePercentage: number;
  confidence: number;
  keyFactors: string[];
  risk: 'low' | 'medium' | 'high';
}

const ScenariosWidget: React.FC<ScenariosWidgetProps> = ({ widget }) => {
  const { data } = useFinancialData();
  const { mixedCosts } = useMixedCosts();
  const settings = widget.settings as ScenariosWidgetSettings;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Calculate current P&L data
  const pnlResult = useMemo(() => {
    if (!data) return null;
    
    try {
      return calculatePnl(data, 'Anual', 'contable', mixedCosts);
    } catch (error) {
      // console.error('Error calculating P&L for scenarios widget:', error);
      return null;
    }
  }, [data, mixedCosts]);

  // Generate scenario data
  const scenarios: ScenarioSummary[] = useMemo(() => {
    if (!pnlResult) return [];

    const baseValue = pnlResult.summaryKpis.utilidad;
    
    return [
      {
        id: 'optimistic',
        name: 'Crecimiento Acelerado',
        type: 'optimistic',
        originalValue: baseValue,
        projectedValue: baseValue * 1.35, // 35% growth
        change: baseValue * 0.35,
        changePercentage: 35,
        confidence: 70,
        keyFactors: ['Expansión mercado', 'Nuevos productos', 'Eficiencias'],
        risk: 'medium'
      },
      {
        id: 'realistic',
        name: 'Crecimiento Moderado',
        type: 'realistic',
        originalValue: baseValue,
        projectedValue: baseValue * 1.12, // 12% growth
        change: baseValue * 0.12,
        changePercentage: 12,
        confidence: 85,
        keyFactors: ['Crecimiento orgánico', 'Optimización costos'],
        risk: 'low'
      },
      {
        id: 'pessimistic',
        name: 'Contracción',
        type: 'pessimistic',
        originalValue: baseValue,
        projectedValue: baseValue * 0.78, // 22% decline
        change: baseValue * -0.22,
        changePercentage: -22,
        confidence: 65,
        keyFactors: ['Recesión', 'Competencia', 'Inflación costos'],
        risk: 'high'
      }
    ];
  }, [pnlResult]);

  // Filter scenarios based on settings
  const displayedScenarios = scenarios.filter(scenario => 
    settings.activeScenarios.includes(scenario.id)
  ).slice(0, settings.maxScenarios);

  const getScenarioColor = (type: ScenarioSummary['type']) => {
    switch (type) {
      case 'optimistic': return 'border-green-500/50 bg-green-500/10';
      case 'realistic': return 'border-blue-500/50 bg-blue-500/10';
      case 'pessimistic': return 'border-red-500/50 bg-red-500/10';
      case 'custom': return 'border-purple-500/50 bg-purple-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const createNewScenario = () => {
    setIsCreating(true);
    // Mock creation process
    setTimeout(() => {
      setIsCreating(false);
    }, 1000);
  };

  if (!data || !pnlResult) {
    return (
      <WidgetContainer widget={widget} onSettingsClick={() => setIsSettingsOpen(true)}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400">Cargando escenarios...</div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <>
      <WidgetContainer widget={widget} onSettingsClick={() => setIsSettingsOpen(true)}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-4">
            <h4 className="font-semibold text-purple-400 flex items-center">
              <ArrowLeftRight className="h-5 w-5 mr-2" />
              {widget.title}
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={createNewScenario}
                disabled={isCreating}
                className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                title="Crear nuevo escenario"
              >
                {isCreating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Scenarios Display */}
          <div className="flex-1 space-y-3">
            {settings.comparisonMode === 'side-by-side' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedScenarios.map((scenario, index) => (
                  <motion.div
                    key={scenario.id}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer ${getScenarioColor(scenario.type)} ${
                      selectedScenario === scenario.id ? 'ring-2 ring-purple-500/50' : ''
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    {/* Scenario Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-semibold text-white text-sm">{scenario.name}</h5>
                        <span className={`text-xs px-2 py-1 rounded ${getRiskColor(scenario.risk)}`}>
                          {scenario.risk.toUpperCase()}
                        </span>
                      </div>
                      {scenario.change >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Projected Value */}
                    <div className="text-center mb-2">
                      <div className="text-lg font-bold text-purple-400">
                        {formatCurrency(scenario.projectedValue)}
                      </div>
                      <div className={`text-sm ${
                        scenario.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {scenario.change >= 0 ? '+' : ''}{scenario.changePercentage}%
                      </div>
                    </div>

                    {/* Key Factors */}
                    <div className="space-y-1">
                      {scenario.keyFactors.slice(0, 2).map((factor, i) => (
                        <div key={i} className="text-xs text-gray-300 flex items-center">
                          <div className="w-1 h-1 bg-purple-400 rounded-full mr-2" />
                          {factor}
                        </div>
                      ))}
                    </div>

                    {/* Confidence */}
                    {settings.showConfidence && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Confianza</span>
                          <span className="text-purple-400 font-mono">{scenario.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                          <div
                            className="bg-purple-400 h-1 rounded-full transition-all duration-500"
                            style={{ width: `${scenario.confidence}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {settings.comparisonMode === 'overlay' && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {displayedScenarios.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => setSelectedScenario(scenario.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedScenario === scenario.id
                          ? getScenarioColor(scenario.type).replace('bg-', 'bg-').replace('/10', '/20') + ' border'
                          : 'bg-slate-800/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      {scenario.name}
                    </button>
                  ))}
                </div>

                {selectedScenario && (
                  <AnimatePresence mode="wait">
                    {displayedScenarios
                      .filter(s => s.id === selectedScenario)
                      .map(scenario => (
                        <motion.div
                          key={scenario.id}
                          className="flex-1 p-4 bg-slate-800/30 rounded-lg"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="text-center mb-4">
                            <h5 className="text-xl font-bold text-white mb-2">{scenario.name}</h5>
                            <div className="text-3xl font-bold text-purple-400 mb-1">
                              {formatCurrency(scenario.projectedValue)}
                            </div>
                            <div className={`text-lg ${
                              scenario.change >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {scenario.change >= 0 ? '+' : ''}{formatCurrency(scenario.change)} 
                              ({scenario.change >= 0 ? '+' : ''}{scenario.changePercentage}%)
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h6 className="text-sm font-semibold text-purple-400 mb-2">Factores Clave</h6>
                              <div className="space-y-1">
                                {scenario.keyFactors.map((factor, i) => (
                                  <div key={i} className="text-sm text-gray-300 flex items-center">
                                    <BarChart3 className="h-3 w-3 text-purple-400 mr-2" />
                                    {factor}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h6 className="text-sm font-semibold text-purple-400 mb-2">Análisis de Riesgo</h6>
                              <div className={`p-2 rounded ${getRiskColor(scenario.risk).replace('text-', 'border-').replace(' bg-', ' border-')}`}>
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="text-sm font-medium">Riesgo {scenario.risk}</span>
                                </div>
                                <div className="text-xs mt-1">
                                  Confianza del modelo: {scenario.confidence}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                )}
              </div>
            )}

            {settings.comparisonMode === 'diff' && (
              <div className="space-y-3">
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-sm text-blue-400 mb-1">Valor Base</div>
                  <div className="text-xl font-bold text-blue-400">
                    {formatCurrency(scenarios[0]?.originalValue || 0)}
                  </div>
                </div>

                {displayedScenarios.map((scenario, index) => (
                  <motion.div
                    key={scenario.id}
                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        scenario.type === 'optimistic' ? 'bg-green-400' :
                        scenario.type === 'realistic' ? 'bg-blue-400' :
                        scenario.type === 'pessimistic' ? 'bg-red-400' : 'bg-purple-400'
                      }`} />
                      <span className="font-medium text-white">{scenario.name}</span>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-bold ${
                        scenario.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {scenario.change >= 0 ? '+' : ''}{formatCurrency(scenario.change)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {scenario.change >= 0 ? '+' : ''}{scenario.changePercentage}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="pt-3 border-t border-gray-700 mt-auto">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {displayedScenarios.length} de {scenarios.length} escenarios
              </div>
              <div className="flex space-x-2">
                <button className="p-1 text-gray-400 hover:text-purple-400 transition-colors">
                  <Play className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </WidgetContainer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <ScenariosWidgetSettingsModal
          widget={widget}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
};

// Settings Modal Component
interface ScenariosWidgetSettingsModalProps {
  widget: WidgetConfig;
  onClose: () => void;
}

const ScenariosWidgetSettingsModal: React.FC<ScenariosWidgetSettingsModalProps> = ({
  widget,
  onClose
}) => {
  const settings = widget.settings as ScenariosWidgetSettings;
  const [localSettings, setLocalSettings] = useState<ScenariosWidgetSettings>({ ...settings });

  const handleSave = () => {
    // console.log('Saving scenarios widget settings:', localSettings);
    onClose();
  };

  const availableScenarios = [
    { id: 'optimistic', name: 'Optimista' },
    { id: 'realistic', name: 'Realista' },
    { id: 'pessimistic', name: 'Pesimista' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 rounded-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold neon-text">
            Configurar Escenarios
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Active Scenarios */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Escenarios Activos
            </label>
            <div className="space-y-2">
              {availableScenarios.map(scenario => (
                <label key={scenario.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.activeScenarios.includes(scenario.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalSettings(prev => ({
                          ...prev,
                          activeScenarios: [...prev.activeScenarios, scenario.id]
                        }));
                      } else {
                        setLocalSettings(prev => ({
                          ...prev,
                          activeScenarios: prev.activeScenarios.filter(id => id !== scenario.id)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">{scenario.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Comparison Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Modo de Comparación
            </label>
            <select
              value={localSettings.comparisonMode}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                comparisonMode: e.target.value as ScenariosWidgetSettings['comparisonMode']
              }))}
              className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="side-by-side">Lado a lado</option>
              <option value="overlay">Superpuesto</option>
              <option value="diff">Diferencias</option>
            </select>
          </div>

          {/* Max Scenarios */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Máximo Escenarios: {localSettings.maxScenarios}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={localSettings.maxScenarios}
              onChange={(e) => setLocalSettings(prev => ({ 
                ...prev, 
                maxScenarios: Number(e.target.value)
              }))}
              className="w-full slider-thumb"
            />
          </div>

          {/* Display Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.showConfidence}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  showConfidence: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Mostrar nivel de confianza</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.autoSave}
                onChange={(e) => setLocalSettings(prev => ({ 
                  ...prev, 
                  autoSave: e.target.checked 
                }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Auto-guardar cambios</span>
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

export default ScenariosWidget;
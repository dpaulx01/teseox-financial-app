// Predictive Analysis component with What-If scenarios
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Beaker,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Play,
  Pause,
  RefreshCw,
  Bookmark
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { formatCurrency } from '../../utils/formatters';
import { AccountNode, PyGResult } from '../../utils/pnlCalculator';

interface PredictionScenario {
  id: string;
  name: string;
  description: string;
  variables: ScenarioVariable[];
  isActive: boolean;
  isSaved: boolean;
  createdAt: Date;
}

interface ScenarioVariable {
  name: string;
  displayName: string;
  currentValue: number;
  newValue: number;
  changeType: 'percentage' | 'absolute';
  min: number;
  max: number;
  impact: 'high' | 'medium' | 'low';
  category: 'ingresos' | 'costos' | 'gastos' | 'otros';
}

interface PredictionResult {
  originalValue: number;
  predictedValue: number;
  change: number;
  changePercentage: number;
  confidence: number;
  impactAnalysis: ImpactAnalysis[];
}

interface ImpactAnalysis {
  variable: string;
  impact: number;
  sensitivity: number;
  description: string;
}

interface HistoricalTrend {
  period: string;
  value: number;
  growth: number;
}

interface PredictiveAnalysisProps {
  currentData: PyGResult;
  historicalData?: PyGResult[];
  className?: string;
  onScenarioCreate?: (scenario: PredictionScenario) => void;
  onScenarioApply?: (scenario: PredictionScenario) => void;
}

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({
  currentData,
  historicalData = [],
  className = '',
  onScenarioCreate,
  onScenarioApply
}) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'scenarios' | 'sensitivity'>('trends');
  const [scenarios, setScenarios] = useState<PredictionScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<PredictionScenario | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<PredictionScenario[]>([]);

  // Generate default scenario variables based on current data
  const defaultVariables: ScenarioVariable[] = useMemo(() => [
    {
      name: 'revenue_growth',
      displayName: 'Crecimiento Ingresos',
      currentValue: currentData.summaryKpis.ingresos,
      newValue: currentData.summaryKpis.ingresos,
      changeType: 'percentage',
      min: -50,
      max: 100,
      impact: 'high',
      category: 'ingresos'
    },
    {
      name: 'cost_optimization',
      displayName: 'Optimización Costos',
      currentValue: Math.abs(currentData.summaryKpis.costos),
      newValue: Math.abs(currentData.summaryKpis.costos),
      changeType: 'percentage',
      min: -30,
      max: 30,
      impact: 'high',
      category: 'costos'
    },
    {
      name: 'operational_efficiency',
      displayName: 'Eficiencia Operativa',
      currentValue: Math.abs(currentData.summaryKpis.gastosOperacionales),
      newValue: Math.abs(currentData.summaryKpis.gastosOperacionales),
      changeType: 'percentage',
      min: -25,
      max: 15,
      impact: 'medium',
      category: 'gastos'
    },
    {
      name: 'market_conditions',
      displayName: 'Condiciones de Mercado',
      currentValue: 0,
      newValue: 0,
      changeType: 'percentage',
      min: -20,
      max: 20,
      impact: 'medium',
      category: 'otros'
    }
  ], [currentData]);

  // Calculate historical trends
  const historicalTrends: HistoricalTrend[] = useMemo(() => {
    if (!historicalData.length) {
      // Mock data for demonstration
      return [
        { period: 'Q1', value: currentData.summaryKpis.utilidad * 0.8, growth: 12.5 },
        { period: 'Q2', value: currentData.summaryKpis.utilidad * 0.9, growth: 15.2 },
        { period: 'Q3', value: currentData.summaryKpis.utilidad * 0.95, growth: 8.3 },
        { period: 'Q4', value: currentData.summaryKpis.utilidad, growth: 5.2 }
      ];
    }

    return historicalData.map((data, index) => ({
      period: `Period ${index + 1}`,
      value: data.summaryKpis.utilidad,
      growth: index > 0 
        ? ((data.summaryKpis.utilidad - historicalData[index - 1].summaryKpis.utilidad) / historicalData[index - 1].summaryKpis.utilidad) * 100 
        : 0
    }));
  }, [historicalData, currentData]);

  // Predict future trends based on historical data
  const predictFutureTrends = useCallback((periods: number = 4): HistoricalTrend[] => {
    const trends = historicalTrends;
    const avgGrowth = trends.reduce((sum, t) => sum + t.growth, 0) / trends.length;
    const lastValue = trends[trends.length - 1]?.value || currentData.summaryKpis.utilidad;

    return Array.from({ length: periods }, (_, i) => {
      const period = `F${i + 1}`;
      const compoundGrowth = Math.pow(1 + avgGrowth / 100, i + 1);
      const value = lastValue * compoundGrowth;
      const growth = i === 0 ? avgGrowth : avgGrowth * (0.95 ** i); // Diminishing growth

      return { period, value, growth };
    });
  }, [historicalTrends, currentData]);

  const futureTrends = predictFutureTrends();

  // Calculate prediction result for a scenario
  const calculatePrediction = useCallback((scenario: PredictionScenario): PredictionResult => {
    let totalImpact = 0;
    const impactAnalysis: ImpactAnalysis[] = [];

    scenario.variables.forEach(variable => {
      let variableImpact = 0;
      let baseValue = variable.currentValue;

      if (variable.changeType === 'percentage') {
        const changeAmount = (variable.newValue - 100) / 100;
        variableImpact = baseValue * changeAmount;
      } else {
        variableImpact = variable.newValue - variable.currentValue;
      }

      // Apply category multipliers
      const multipliers = {
        'ingresos': 1.0,
        'costos': -1.0, // Cost reduction increases profit
        'gastos': -0.8,
        'otros': 0.5
      };

      variableImpact *= multipliers[variable.category];
      totalImpact += variableImpact;

      // Calculate sensitivity
      const sensitivity = Math.abs(variableImpact) / Math.abs(currentData.summaryKpis.utilidad);

      impactAnalysis.push({
        variable: variable.displayName,
        impact: variableImpact,
        sensitivity: Math.min(sensitivity * 100, 100),
        description: getImpactDescription(variable, variableImpact)
      });
    });

    const originalValue = currentData.summaryKpis.utilidad;
    const predictedValue = originalValue + totalImpact;
    const change = totalImpact;
    const changePercentage = (change / Math.abs(originalValue)) * 100;

    // Calculate confidence based on scenario complexity and market conditions
    const confidence = Math.max(60, 95 - (scenario.variables.length * 5));

    return {
      originalValue,
      predictedValue,
      change,
      changePercentage,
      confidence,
      impactAnalysis: impactAnalysis.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    };
  }, [currentData]);

  const getImpactDescription = (variable: ScenarioVariable, impact: number): string => {
    const isPositive = impact > 0;
    const magnitude = Math.abs(impact) > variable.currentValue * 0.1 ? 'significativo' : 'moderado';
    
    const descriptions = {
      'ingresos': isPositive 
        ? `Incremento ${magnitude} en los ingresos operacionales`
        : `Reducción ${magnitude} en los ingresos por condiciones de mercado`,
      'costos': isPositive
        ? `Optimización ${magnitude} de costos operativos`
        : `Incremento ${magnitude} en costos por factores externos`,
      'gastos': isPositive
        ? `Mejora ${magnitude} en eficiencia operativa`
        : `Incremento ${magnitude} en gastos administrativos`,
      'otros': isPositive
        ? `Impacto positivo ${magnitude} por factores externos`
        : `Impacto negativo ${magnitude} por condiciones del mercado`
    };

    return descriptions[variable.category];
  };

  // Create new scenario
  const createScenario = () => {
    const newScenario: PredictionScenario = {
      id: `scenario_${Date.now()}`,
      name: `Escenario ${scenarios.length + 1}`,
      description: 'Nuevo escenario de análisis predictivo',
      variables: [...defaultVariables],
      isActive: true,
      isSaved: false,
      createdAt: new Date()
    };

    setScenarios(prev => [...prev, newScenario]);
    setActiveScenario(newScenario);
  };

  // Update scenario variable
  const updateScenarioVariable = (scenarioId: string, variableName: string, newValue: number) => {
    setScenarios(prev => prev.map(scenario => {
      if (scenario.id === scenarioId) {
        return {
          ...scenario,
          variables: scenario.variables.map(variable =>
            variable.name === variableName ? { ...variable, newValue } : variable
          )
        };
      }
      return scenario;
    }));

    if (activeScenario?.id === scenarioId) {
      setActiveScenario(prev => prev ? {
        ...prev,
        variables: prev.variables.map(variable =>
          variable.name === variableName ? { ...variable, newValue } : variable
        )
      } : null);
    }
  };

  // Save scenario
  const saveScenario = (scenario: PredictionScenario) => {
    const savedScenario = { ...scenario, isSaved: true };
    setSavedScenarios(prev => [...prev, savedScenario]);
    setScenarios(prev => prev.map(s => s.id === scenario.id ? savedScenario : s));
    if (onScenarioCreate) {
      onScenarioCreate(savedScenario);
    }
  };

  // Run simulation
  const runSimulation = async () => {
    if (!activeScenario) return;

    setIsSimulating(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSimulating(false);
    
    if (onScenarioApply) {
      onScenarioApply(activeScenario);
    }
  };

  const predictionResult = activeScenario ? calculatePrediction(activeScenario) : null;

  // Chart data for trends
  const trendsChartData = {
    labels: [...historicalTrends.map(t => t.period), ...futureTrends.map(t => t.period)],
    datasets: [
      {
        label: 'Histórico',
        data: [...historicalTrends.map(t => t.value), ...Array(futureTrends.length).fill(null)],
        borderColor: 'rgba(0, 240, 255, 0.8)',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Proyección',
        data: [...Array(historicalTrends.length).fill(null), ...futureTrends.map(t => t.value)],
        borderColor: 'rgba(0, 255, 153, 0.8)',
        backgroundColor: 'rgba(0, 255, 153, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderDash: [10, 5]
      },
      ...(predictionResult ? [{
        label: 'Escenario What-If',
        data: [...Array(historicalTrends.length + futureTrends.length - 1).fill(null), predictionResult.predictedValue],
        borderColor: 'rgba(255, 0, 128, 0.8)',
        backgroundColor: 'rgba(255, 0, 128, 0.2)',
        pointRadius: 10,
        pointHoverRadius: 12,
        showLine: false
      }] : [])
    ]
  };

  const trendsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#8B9DC3',
          font: { family: 'Inter', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 37, 0.95)',
        titleColor: '#00F0FF',
        bodyColor: '#E0E7FF',
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#8B9DC3',
          font: { family: 'Inter', size: 11 }
        }
      },
      y: {
        grid: { color: 'rgba(0, 240, 255, 0.1)' },
        ticks: {
          color: '#8B9DC3',
          font: { family: 'Roboto Mono', size: 10 },
          callback: (value: any) => formatCurrency(value)
        }
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Beaker className="h-8 w-8 text-purple-400" />
          <div>
            <h3 className="text-2xl font-bold neon-text">Análisis Predictivo</h3>
            <p className="text-gray-400">Escenarios What-If y proyecciones inteligentes</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={createScenario}
            className="cyber-button-sm"
          >
            <Beaker className="h-4 w-4 mr-2" />
            Nuevo Escenario
          </button>
          
          {activeScenario && (
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className={`cyber-button-sm ${isSimulating ? 'opacity-50' : ''}`}
            >
              {isSimulating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isSimulating ? 'Simulando...' : 'Ejecutar Simulación'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        {[
          { id: 'trends', label: 'Tendencias', icon: TrendingUp },
          { id: 'scenarios', label: 'Escenarios', icon: Beaker },
          { id: 'sensitivity', label: 'Sensibilidad', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-xl">
              <h4 className="text-xl font-semibold text-purple-400 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Análisis de Tendencias
              </h4>
              
              <div className="h-96">
                <Line data={trendsChartData} options={trendsChartOptions} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {futureTrends.slice(0, 3).map((trend, index) => (
                <motion.div
                  key={trend.period}
                  className="glass-card p-4 rounded-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-medium">{trend.period}</span>
                    {trend.growth >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className="text-2xl font-bold neon-text">
                    {formatCurrency(trend.value)}
                  </div>
                  <div className={`text-sm ${trend.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend.growth >= 0 ? '+' : ''}{trend.growth.toFixed(1)}% crecimiento
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scenario Configuration */}
            <div className="space-y-4">
              <div className="glass-card p-6 rounded-xl">
                <h4 className="text-xl font-semibold text-purple-400 mb-4">
                  Configuración de Escenarios
                </h4>

                {activeScenario ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nombre del Escenario
                      </label>
                      <input
                        type="text"
                        value={activeScenario.name}
                        onChange={(e) => setActiveScenario(prev => 
                          prev ? { ...prev, name: e.target.value } : null
                        )}
                        className="w-full p-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-3">
                      {activeScenario.variables.map(variable => (
                        <div key={variable.name} className="p-3 bg-slate-800/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{variable.displayName}</span>
                            <span className={`px-2 py-1 text-xs rounded ${
                              variable.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                              variable.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {variable.impact.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-gray-400">
                              <span>Cambio (%):</span>
                              <span>{((variable.newValue - 100)).toFixed(1)}%</span>
                            </div>
                            
                            <input
                              type="range"
                              min={variable.min + 100}
                              max={variable.max + 100}
                              value={variable.newValue}
                              onChange={(e) => updateScenarioVariable(
                                activeScenario.id, 
                                variable.name, 
                                Number(e.target.value)
                              )}
                              className="w-full slider-thumb"
                            />
                            
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{variable.min}%</span>
                              <span>{variable.max}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => saveScenario(activeScenario)}
                        disabled={activeScenario.isSaved}
                        className="flex-1 cyber-button-sm"
                      >
                        <Bookmark className="h-4 w-4 mr-2" />
                        {activeScenario.isSaved ? 'Guardado' : 'Guardar Escenario'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Beaker className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      Crea un nuevo escenario para comenzar el análisis predictivo
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {predictionResult && (
                <>
                  <div className="glass-card p-6 rounded-xl">
                    <h4 className="text-xl font-semibold text-purple-400 mb-4 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Resultados de la Predicción
                    </h4>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-400 mb-1">Valor Actual</div>
                          <div className="text-xl font-bold text-blue-400">
                            {formatCurrency(predictionResult.originalValue)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-400 mb-1">Valor Proyectado</div>
                          <div className={`text-xl font-bold ${
                            predictionResult.predictedValue >= predictionResult.originalValue 
                              ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(predictionResult.predictedValue)}
                          </div>
                        </div>
                      </div>

                      <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                        <div className="text-sm text-gray-400 mb-1">Impacto Total</div>
                        <div className={`text-2xl font-bold neon-text ${
                          predictionResult.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {predictionResult.change >= 0 ? '+' : ''}{formatCurrency(predictionResult.change)}
                        </div>
                        <div className={`text-sm ${
                          predictionResult.changePercentage >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {predictionResult.changePercentage >= 0 ? '+' : ''}{predictionResult.changePercentage.toFixed(1)}%
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                        <div className="flex items-center">
                          <Info className="h-5 w-5 text-blue-400 mr-2" />
                          <span className="text-blue-400 font-medium">Confianza</span>
                        </div>
                        <span className="text-blue-400 font-bold">
                          {predictionResult.confidence.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-purple-400 mb-4">
                      Análisis de Impacto por Variable
                    </h4>
                    
                    <div className="space-y-3">
                      {predictionResult.impactAnalysis.map((analysis, index) => (
                        <motion.div
                          key={analysis.variable}
                          className="p-3 bg-slate-800/30 rounded-lg"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{analysis.variable}</span>
                            <span className={`font-bold ${
                              analysis.impact >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {analysis.impact >= 0 ? '+' : ''}{formatCurrency(analysis.impact)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{analysis.description}</span>
                            <span className="text-purple-400">
                              Sensibilidad: {analysis.sensitivity.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                analysis.impact >= 0 ? 'bg-green-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(analysis.sensitivity, 100)}%` }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sensitivity Tab */}
        {activeTab === 'sensitivity' && predictionResult && (
          <div className="glass-card p-6 rounded-xl">
            <h4 className="text-xl font-semibold text-purple-400 mb-6 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Análisis de Sensibilidad
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sensitivity Chart */}
              <div>
                <h5 className="text-lg font-medium text-white mb-4">Sensibilidad por Variable</h5>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: predictionResult.impactAnalysis.map(a => a.variable),
                      datasets: [{
                        label: 'Sensibilidad (%)',
                        data: predictionResult.impactAnalysis.map(a => a.sensitivity),
                        backgroundColor: predictionResult.impactAnalysis.map(a => 
                          a.sensitivity > 50 ? 'rgba(255, 0, 128, 0.6)' : 
                          a.sensitivity > 25 ? 'rgba(255, 153, 0, 0.6)' : 
                          'rgba(0, 255, 153, 0.6)'
                        ),
                        borderColor: predictionResult.impactAnalysis.map(a => 
                          a.sensitivity > 50 ? 'rgba(255, 0, 128, 0.8)' : 
                          a.sensitivity > 25 ? 'rgba(255, 153, 0, 0.8)' : 
                          'rgba(0, 255, 153, 0.8)'
                        ),
                        borderWidth: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(26, 26, 37, 0.95)',
                          titleColor: '#00F0FF',
                          bodyColor: '#E0E7FF'
                        }
                      },
                      scales: {
                        x: { 
                          ticks: { color: '#8B9DC3', maxRotation: 45 },
                          grid: { display: false }
                        },
                        y: { 
                          ticks: { color: '#8B9DC3' },
                          grid: { color: 'rgba(0, 240, 255, 0.1)' }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Risk Assessment */}
              <div>
                <h5 className="text-lg font-medium text-white mb-4">Evaluación de Riesgo</h5>
                <div className="space-y-4">
                  {predictionResult.impactAnalysis.map((analysis, index) => (
                    <div key={analysis.variable} className="p-3 bg-slate-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{analysis.variable}</span>
                        <span className={`px-2 py-1 text-xs rounded font-bold ${
                          analysis.sensitivity > 50 ? 'bg-red-500/20 text-red-400' :
                          analysis.sensitivity > 25 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {analysis.sensitivity > 50 ? 'ALTO' :
                           analysis.sensitivity > 25 ? 'MEDIO' : 'BAJO'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-400 mb-2">
                        Impacto: {formatCurrency(analysis.impact)}
                      </div>
                      
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            analysis.sensitivity > 50 ? 'bg-red-400' :
                            analysis.sensitivity > 25 ? 'bg-yellow-400' :
                            'bg-green-400'
                          }`}
                          style={{ width: `${analysis.sensitivity}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveAnalysis;
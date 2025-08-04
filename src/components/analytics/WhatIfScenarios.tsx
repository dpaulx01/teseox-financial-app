// What-If Scenarios component for financial modeling
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker,
  ArrowLeftRight,
  Zap,
  Copy,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  X,
  Info,
  BarChart3,
  Settings
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { PyGResult } from '../../utils/pnlCalculator';

interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  category: 'optimistic' | 'realistic' | 'pessimistic' | 'custom';
  modifications: ScenarioModification[];
  results: WhatIfResults | null;
  isActive: boolean;
  createdAt: Date;
  lastModified: Date;
}

interface ScenarioModification {
  accountCode: string;
  accountName: string;
  originalValue: number;
  newValue: number;
  changeType: 'absolute' | 'percentage';
  reasoning: string;
  confidence: number; // 1-10 scale
}

interface WhatIfResults {
  originalTotal: number;
  projectedTotal: number;
  netChange: number;
  percentageChange: number;
  affectedKPIs: AffectedKPI[];
  risks: Risk[];
  opportunities: Opportunity[];
  implementationComplexity: 'low' | 'medium' | 'high';
}

interface AffectedKPI {
  name: string;
  originalValue: number;
  newValue: number;
  change: number;
  impact: 'positive' | 'negative' | 'neutral';
}

interface Risk {
  description: string;
  severity: 'low' | 'medium' | 'high';
  probability: number; // 0-100%
  mitigation: string;
}

interface Opportunity {
  description: string;
  potential: number; // monetary value
  timeframe: string;
  requirements: string[];
}

interface WhatIfScenariosProps {
  currentData: PyGResult;
  onScenarioApply?: (scenario: WhatIfScenario) => void;
  className?: string;
}

const WhatIfScenarios: React.FC<WhatIfScenariosProps> = ({
  currentData,
  onScenarioApply,
  className = ''
}) => {
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<WhatIfScenario | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Pre-defined scenario templates
  const scenarioTemplates = useMemo(() => [
    {
      category: 'optimistic' as const,
      name: 'Crecimiento Acelerado',
      description: 'Escenario optimista con crecimiento del 25% en ingresos y optimización de costos',
      modifications: [
        {
          accountCode: '4',
          accountName: 'Ingresos',
          originalValue: currentData.summaryKpis.ingresos,
          newValue: currentData.summaryKpis.ingresos * 1.25,
          changeType: 'percentage' as const,
          reasoning: 'Expansión de mercado y nuevos productos',
          confidence: 7
        },
        {
          accountCode: '6',
          accountName: 'Costos',
          originalValue: Math.abs(currentData.summaryKpis.costos),
          newValue: Math.abs(currentData.summaryKpis.costos) * 0.9,
          changeType: 'percentage' as const,
          reasoning: 'Eficiencias operativas y economías de escala',
          confidence: 6
        }
      ]
    },
    {
      category: 'realistic' as const,
      name: 'Crecimiento Moderado',
      description: 'Escenario realista con crecimiento conservador y mejoras graduales',
      modifications: [
        {
          accountCode: '4',
          accountName: 'Ingresos',
          originalValue: currentData.summaryKpis.ingresos,
          newValue: currentData.summaryKpis.ingresos * 1.1,
          changeType: 'percentage' as const,
          reasoning: 'Crecimiento orgánico del mercado',
          confidence: 8
        },
        {
          accountCode: '6',
          accountName: 'Gastos Operacionales',
          originalValue: Math.abs(currentData.summaryKpis.gastosOperacionales),
          newValue: Math.abs(currentData.summaryKpis.gastosOperacionales) * 0.95,
          changeType: 'percentage' as const,
          reasoning: 'Optimización de procesos administrativos',
          confidence: 7
        }
      ]
    },
    {
      category: 'pessimistic' as const,
      name: 'Contracción del Mercado',
      description: 'Escenario pesimista con reducción de ingresos y presión en márgenes',
      modifications: [
        {
          accountCode: '4',
          accountName: 'Ingresos',
          originalValue: currentData.summaryKpis.ingresos,
          newValue: currentData.summaryKpis.ingresos * 0.85,
          changeType: 'percentage' as const,
          reasoning: 'Recesión económica y competencia intensa',
          confidence: 6
        },
        {
          accountCode: '6',
          accountName: 'Costos',
          originalValue: Math.abs(currentData.summaryKpis.costos),
          newValue: Math.abs(currentData.summaryKpis.costos) * 1.1,
          changeType: 'percentage' as const,
          reasoning: 'Inflación de insumos y materias primas',
          confidence: 7
        }
      ]
    }
  ], [currentData]);

  // Calculate what-if results
  const calculateWhatIfResults = useCallback((scenario: WhatIfScenario): WhatIfResults => {
    let netImpact = 0;
    const affectedKPIs: AffectedKPI[] = [];

    scenario.modifications.forEach(mod => {
      const impact = mod.newValue - mod.originalValue;
      
      // Apply impact based on account type
      if (mod.accountCode === '4') { // Ingresos
        netImpact += impact;
        affectedKPIs.push({
          name: 'Margen Bruto',
          originalValue: currentData.summaryKpis.ingresos - Math.abs(currentData.summaryKpis.costos),
          newValue: mod.newValue - Math.abs(currentData.summaryKpis.costos),
          change: impact,
          impact: impact > 0 ? 'positive' : 'negative'
        });
      } else if (mod.accountCode === '6') { // Costos/Gastos
        netImpact -= Math.abs(impact); // Cost reduction is positive
        affectedKPIs.push({
          name: 'Eficiencia Operativa',
          originalValue: (currentData.summaryKpis.ingresos / Math.abs(mod.originalValue)) * 100,
          newValue: (currentData.summaryKpis.ingresos / Math.abs(mod.newValue)) * 100,
          change: -Math.abs(impact),
          impact: impact < 0 ? 'positive' : 'negative'
        });
      }
    });

    const originalTotal = currentData.summaryKpis.utilidad;
    const projectedTotal = originalTotal + netImpact;
    const percentageChange = (netImpact / Math.abs(originalTotal)) * 100;

    // Generate risks based on scenario
    const risks: Risk[] = [];
    const opportunities: Opportunity[] = [];

    if (scenario.category === 'optimistic') {
      risks.push(
        {
          description: 'Sobrestimación de la demanda del mercado',
          severity: 'medium',
          probability: 35,
          mitigation: 'Implementar lanzamiento gradual con métricas de seguimiento'
        },
        {
          description: 'Incapacidad de escalar operaciones eficientemente',
          severity: 'high',
          probability: 25,
          mitigation: 'Invertir en infraestructura antes del crecimiento'
        }
      );
      opportunities.push({
        description: 'Posicionamiento como líder de mercado',
        potential: netImpact * 0.2,
        timeframe: '12-18 meses',
        requirements: ['Inversión en marketing', 'Expansión de equipo', 'Mejora de producto']
      });
    } else if (scenario.category === 'pessimistic') {
      risks.push(
        {
          description: 'Pérdida de participación de mercado',
          severity: 'high',
          probability: 60,
          mitigation: 'Estrategia defensiva y retención de clientes clave'
        }
      );
      opportunities.push({
        description: 'Consolidación del mercado por salida de competidores',
        potential: Math.abs(netImpact) * 0.15,
        timeframe: '6-12 meses',
        requirements: ['Disponibilidad de capital', 'Agilidad estratégica']
      });
    }

    // Implementation complexity based on number and type of changes
    const complexityScore = scenario.modifications.length + 
      scenario.modifications.reduce((sum, mod) => sum + (10 - mod.confidence), 0);
    const implementationComplexity: 'low' | 'medium' | 'high' = 
      complexityScore < 10 ? 'low' : complexityScore < 20 ? 'medium' : 'high';

    return {
      originalTotal,
      projectedTotal,
      netChange: netImpact,
      percentageChange,
      affectedKPIs,
      risks,
      opportunities,
      implementationComplexity
    };
  }, [currentData]);

  // Create scenario from template
  const createScenarioFromTemplate = (template: typeof scenarioTemplates[0]) => {
    const newScenario: WhatIfScenario = {
      id: `scenario_${Date.now()}`,
      name: template.name,
      description: template.description,
      category: template.category,
      modifications: [...template.modifications],
      results: null,
      isActive: false,
      createdAt: new Date(),
      lastModified: new Date()
    };

    // Calculate results immediately
    newScenario.results = calculateWhatIfResults(newScenario);

    setScenarios(prev => [...prev, newScenario]);
    setActiveScenario(newScenario);
  };

  // Create custom scenario
  const createCustomScenario = () => {
    const newScenario: WhatIfScenario = {
      id: `custom_${Date.now()}`,
      name: 'Escenario Personalizado',
      description: 'Escenario personalizado creado por el usuario',
      category: 'custom',
      modifications: [],
      results: null,
      isActive: false,
      createdAt: new Date(),
      lastModified: new Date()
    };

    setScenarios(prev => [...prev, newScenario]);
    setActiveScenario(newScenario);
  };

  // Update modification
  const updateModification = (scenarioId: string, index: number, field: string, value: any) => {
    setScenarios(prev => prev.map(scenario => {
      if (scenario.id === scenarioId) {
        const updatedModifications = [...scenario.modifications];
        updatedModifications[index] = {
          ...updatedModifications[index],
          [field]: value
        };
        
        const updatedScenario = {
          ...scenario,
          modifications: updatedModifications,
          lastModified: new Date()
        };
        
        // Recalculate results
        updatedScenario.results = calculateWhatIfResults(updatedScenario);
        
        return updatedScenario;
      }
      return scenario;
    }));

    if (activeScenario?.id === scenarioId) {
      setActiveScenario(prev => prev ? {
        ...prev,
        modifications: prev.modifications.map((mod, i) => 
          i === index ? { ...mod, [field]: value } : mod
        ),
        lastModified: new Date()
      } : null);
    }
  };

  // Run scenario simulation
  const runSimulation = async (scenario: WhatIfScenario) => {
    setIsSimulating(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mark scenario as active
    setScenarios(prev => prev.map(s => ({
      ...s,
      isActive: s.id === scenario.id
    })));
    
    setIsSimulating(false);
    
    if (onScenarioApply) {
      onScenarioApply(scenario);
    }
  };

  // Duplicate scenario
  const duplicateScenario = (scenario: WhatIfScenario) => {
    const duplicated: WhatIfScenario = {
      ...scenario,
      id: `copy_${Date.now()}`,
      name: `${scenario.name} (Copia)`,
      isActive: false,
      createdAt: new Date(),
      lastModified: new Date()
    };

    setScenarios(prev => [...prev, duplicated]);
  };

  // Delete scenario
  const deleteScenario = (scenarioId: string) => {
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    if (activeScenario?.id === scenarioId) {
      setActiveScenario(null);
    }
  };

  const filteredScenarios = scenarios.filter(scenario => 
    selectedCategory === 'all' || scenario.category === selectedCategory
  );

  const getCategoryColor = (category: WhatIfScenario['category']) => {
    switch (category) {
      case 'optimistic': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'realistic': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'pessimistic': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'custom': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getComplexityColor = (complexity: 'low' | 'medium' | 'high') => {
    switch (complexity) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ArrowLeftRight className="h-8 w-8 text-purple-400" />
          <div>
            <h3 className="text-2xl font-bold neon-text">Escenarios What-If</h3>
            <p className="text-gray-400">Modela diferentes situaciones y analiza su impacto</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Template buttons */}
          <div className="flex space-x-2">
            {scenarioTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => createScenarioFromTemplate(template)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all duration-300 ${getCategoryColor(template.category)}`}
              >
                {template.name}
              </button>
            ))}
          </div>

          <button
            onClick={createCustomScenario}
            className="cyber-button-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Personalizado
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <label className="text-sm text-gray-400">Filtrar por categoría:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">Todos</option>
          <option value="optimistic">Optimista</option>
          <option value="realistic">Realista</option>
          <option value="pessimistic">Pesimista</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredScenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            className={`glass-card p-6 rounded-xl border-2 transition-all duration-300 ${
              scenario.isActive ? 'border-green-500/50 bg-green-500/5' : 'border-gray-600/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Scenario Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-white">{scenario.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded border ${getCategoryColor(scenario.category)}`}>
                    {scenario.category.toUpperCase()}
                  </span>
                  {scenario.isActive && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <p className="text-sm text-gray-400">{scenario.description}</p>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => runSimulation(scenario)}
                  disabled={isSimulating}
                  className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                  title="Ejecutar simulación"
                >
                  {isSimulating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => duplicateScenario(scenario)}
                  className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  title="Duplicar escenario"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteScenario(scenario.id)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Eliminar escenario"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modifications */}
            <div className="space-y-3 mb-4">
              <h5 className="text-sm font-medium text-gray-300">Modificaciones:</h5>
              {scenario.modifications.map((mod, modIndex) => (
                <div key={modIndex} className="p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{mod.accountName}</span>
                    <span className="text-sm text-gray-400">
                      Confianza: {mod.confidence}/10
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mb-2">{mod.reasoning}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-400">
                      Original: {formatCurrency(mod.originalValue)}
                    </span>
                    <span className={`font-bold ${
                      mod.newValue > mod.originalValue ? 'text-green-400' : 'text-red-400'
                    }`}>
                      Nuevo: {formatCurrency(mod.newValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Results */}
            {scenario.results && (
              <div className="border-t border-gray-700 pt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-1">Impacto Total</div>
                    <div className={`text-xl font-bold ${
                      scenario.results.netChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {scenario.results.netChange >= 0 ? '+' : ''}{formatCurrency(scenario.results.netChange)}
                    </div>
                    <div className={`text-xs ${
                      scenario.results.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {scenario.results.percentageChange >= 0 ? '+' : ''}{scenario.results.percentageChange.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-1">Utilidad Proyectada</div>
                    <div className="text-xl font-bold text-purple-400">
                      {formatCurrency(scenario.results.projectedTotal)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded ${getComplexityColor(scenario.results.implementationComplexity)}`}>
                    Complejidad: {scenario.results.implementationComplexity.toUpperCase()}
                  </span>
                  <div className="flex items-center text-xs text-gray-400">
                    <Info className="h-4 w-4 mr-1" />
                    {scenario.results.risks.length} riesgos, {scenario.results.opportunities.length} oportunidades
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Detailed Results Modal */}
      <AnimatePresence>
        {activeScenario?.results && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveScenario(null)}
          >
            <motion.div
              className="glass-card p-6 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold neon-text">
                  Análisis Detallado: {activeScenario.name}
                </h3>
                <button
                  onClick={() => setActiveScenario(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Tabs for detailed view would go here */}
              {/* This could be expanded with more detailed analysis */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredScenarios.length === 0 && (
        <div className="text-center py-12">
          <Beaker className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            No hay escenarios creados
          </h3>
          <p className="text-gray-500 mb-6">
            Crea tu primer escenario What-If para comenzar el análisis predictivo
          </p>
          <button
            onClick={() => createScenarioFromTemplate(scenarioTemplates[1])}
            className="cyber-button"
          >
            Crear Escenario Realista
          </button>
        </div>
      )}
    </div>
  );
};

export default WhatIfScenarios;
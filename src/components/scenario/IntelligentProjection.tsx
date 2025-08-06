import React, { useState, useMemo } from 'react';
import { useScenario } from '../../contexts/ScenarioContext';
import { TrendingUp, Brain, Wand2, ChevronDown, ChevronRight } from 'lucide-react';
import { FinancialData, MonthlyData } from '../../types';
import { getSortedMonths } from '../../utils/dateUtils';

interface ProjectionConfig {
  method: 'linear' | 'seasonal' | 'exponential' | 'custom';
  months: number;
  growthRate?: number;
  seasonalPattern?: number[];
  customMultipliers?: number[];
}

const IntelligentProjection: React.FC = () => {
  const { scenarioData, updateScenario, activeScenarioId } = useScenario();
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<ProjectionConfig>({
    method: 'linear',
    months: 6,
    growthRate: 5
  });
  const [isProjecting, setIsProjecting] = useState(false);

  const currentMonths = useMemo(() => {
    if (!scenarioData?.monthly) return [];
    return getSortedMonths(scenarioData.monthly);
  }, [scenarioData?.monthly]);

  const projectionMethods = [
    { 
      value: 'linear', 
      label: 'Crecimiento Lineal',
      description: 'Crecimiento constante basado en tendencia histórica'
    },
    { 
      value: 'seasonal', 
      label: 'Estacional',
      description: 'Considera patrones estacionales del negocio'
    },
    { 
      value: 'exponential', 
      label: 'Exponencial',
      description: 'Crecimiento acelerado o desacelerado'
    },
    { 
      value: 'custom', 
      label: 'Personalizado',
      description: 'Define tus propios multiplicadores'
    }
  ];

  const generateProjections = async () => {
    if (!scenarioData || !activeScenarioId || currentMonths.length === 0) return;

    setIsProjecting(true);
    try {
      const updatedData: FinancialData = JSON.parse(JSON.stringify(scenarioData));
      
      // Obtener último mes con datos
      const lastMonth = currentMonths[currentMonths.length - 1];
      const lastMonthData = scenarioData.monthly[lastMonth];
      
      // Generar nuevos meses
      const newMonths = generateMonthNames(lastMonth, config.months);
      
      newMonths.forEach((monthName, index) => {
        const projectedData = calculateProjectedData(lastMonthData, index + 1, config);
        updatedData.monthly[monthName] = projectedData;
      });

      await updateScenario(activeScenarioId, updatedData);
    } catch (error) {
      console.error('Error generating projections:', error);
    } finally {
      setIsProjecting(false);
    }
  };

  const calculateProjectedData = (baseData: MonthlyData, monthIndex: number, config: ProjectionConfig): MonthlyData => {
    let multiplier = 1;

    switch (config.method) {
      case 'linear':
        multiplier = 1 + ((config.growthRate || 0) / 100) * monthIndex;
        break;
      case 'exponential':
        multiplier = Math.pow(1 + ((config.growthRate || 0) / 100), monthIndex);
        break;
      case 'seasonal':
        // Patrón estacional simple: +20%, +10%, -5%, +15%, etc.
        const seasonalMultipliers = [1.2, 1.1, 0.95, 1.15, 1.05, 0.9];
        multiplier = seasonalMultipliers[(monthIndex - 1) % seasonalMultipliers.length] || 1;
        break;
      case 'custom':
        multiplier = config.customMultipliers?.[monthIndex - 1] || 1;
        break;
    }

    // Aplicar proyección a todas las cuentas principales
    const projected: MonthlyData = { ...baseData };
    
    // Aplicar multiplier a cuentas clave
    if (projected.ingresos) projected.ingresos *= multiplier;
    if (projected.costoMateriaPrima) projected.costoMateriaPrima *= multiplier * 0.8; // Los costos crecen menos
    if (projected.costoProduccion) projected.costoProduccion *= multiplier * 0.9;
    if (projected.gastosOperativos) projected.gastosOperativos *= multiplier * 0.7; // Gastos crecen aún menos
    
    // Recalcular métricas derivadas
    projected.utilidadBruta = (projected.ingresos || 0) - (projected.costoVentasTotal || 0);
    projected.ebitda = (projected.utilidadBruta || 0) - (projected.gastosOperativos || 0);
    projected.utilidadNeta = (projected.ebitda || 0) - (projected.depreciacion || 0);

    return projected;
  };

  const generateMonthNames = (lastMonth: string, count: number): string[] => {
    // Simplificado: generar nombres secuenciales
    // En producción, esto sería más sofisticado
    const months = [];
    for (let i = 1; i <= count; i++) {
      months.push(`${lastMonth}+${i}`); // Formato temporal
    }
    return months;
  };

  if (!scenarioData || currentMonths.length === 0) return null;

  return (
    <div className="glass-card p-6 space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Brain className="w-8 h-8 text-purple-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Proyección Inteligente</h3>
            <p className="text-sm text-purple-200">
              Extiende tu escenario con predicciones automáticas
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-400/30">
            <span className="text-sm text-purple-200">{currentMonths.length} meses actuales</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-purple-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-purple-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-purple-500/20">
          {/* Configuración de método */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Método de Proyección
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectionMethods.map((method) => (
                <div
                  key={method.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    config.method === method.value
                      ? 'border-purple-400 bg-purple-500/20'
                      : 'border-border/30 bg-dark-surface/50 hover:border-purple-400/50'
                  }`}
                  onClick={() => setConfig({...config, method: method.value as any})}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${
                      config.method === method.value ? 'bg-purple-400' : 'bg-gray-500'
                    }`} />
                    <span className="font-medium text-white">{method.label}</span>
                  </div>
                  <p className="text-xs text-text-muted">{method.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración específica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Meses a Proyectar
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={config.months}
                onChange={(e) => setConfig({...config, months: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 bg-dark-surface border border-border/30 rounded-lg text-white 
                          focus:border-purple-400 focus:outline-none"
              />
            </div>

            {(config.method === 'linear' || config.method === 'exponential') && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tasa de Crecimiento (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.growthRate || 0}
                  onChange={(e) => setConfig({...config, growthRate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-dark-surface border border-border/30 rounded-lg text-white 
                            focus:border-purple-400 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={generateProjections}
                disabled={isProjecting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white 
                          px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isProjecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Proyectando...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generar Proyección</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Vista previa de configuración */}
          <div className="bg-dark-surface/50 rounded-lg p-4 border border-border/30">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Vista Previa</span>
            </div>
            <div className="text-xs text-text-muted space-y-1">
              <p>• Método: {projectionMethods.find(m => m.value === config.method)?.label}</p>
              <p>• Se generarán {config.months} meses adicionales</p>
              {config.growthRate && (
                <p>• Crecimiento esperado: {config.growthRate}% {config.method === 'exponential' ? 'compuesto' : 'mensual'}</p>
              )}
              <p>• Los datos se añadirán automáticamente a tu escenario actual</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentProjection;
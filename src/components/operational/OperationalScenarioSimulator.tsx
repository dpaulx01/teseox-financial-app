import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import {
  Settings,
  PlayCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { FinancialData, ProductionData, OperationalMetrics } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface OperationalScenarioSimulatorProps {
  financialData: FinancialData;
  productionData: ProductionData[];
  operationalMetrics: OperationalMetrics[];
}

interface ScenarioParameters {
  priceChange: number;      // % cambio en precios
  volumeChange: number;     // % cambio en volumen
  costChange: number;       // % cambio en costos
  efficiencyChange: number; // % cambio en eficiencia
}

interface ScenarioResult {
  scenario: string;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  marginChange: number;
  roiChange: number;
  breakEvenPoint: number;
  feasibilityScore: number;
}

const OperationalScenarioSimulator: React.FC<OperationalScenarioSimulatorProps> = ({
  financialData,
  productionData,
  operationalMetrics
}) => {
  const [currentScenario, setCurrentScenario] = useState<ScenarioParameters>({
    priceChange: 0,
    volumeChange: 0,
    costChange: 0,
    efficiencyChange: 0
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<ScenarioResult[]>([]);

  // Valores base actuales
  const baseMetrics = useMemo(() => {
    if (!financialData || !productionData.length) return null;

    return {
      totalRevenue: financialData.yearly.ingresos,
      totalCosts: financialData.yearly.costoVentasTotal,
      totalVolume: productionData.reduce((sum, p) => sum + p.metrosVendidos, 0),
      avgPrice: operationalMetrics.length > 0 
        ? operationalMetrics.reduce((sum, m) => sum + m.precioVentaPorMetro, 0) / operationalMetrics.length
        : 0,
      netProfit: financialData.yearly.utilidadNeta || 0,
      operatingMargin: financialData.yearly.ingresos > 0 
        ? ((financialData.yearly.utilidadOperacional || 0) / financialData.yearly.ingresos) * 100
        : 0
    };
  }, [financialData, productionData, operationalMetrics]);

  // Función de simulación de escenarios
  const simulateScenario = (params: ScenarioParameters): ScenarioResult => {
    if (!baseMetrics) {
      return {
        scenario: 'Base',
        totalRevenue: 0,
        totalCosts: 0,
        netProfit: 0,
        marginChange: 0,
        roiChange: 0,
        breakEvenPoint: 0,
        feasibilityScore: 0
      };
    }

    // Aplicar cambios porcentuales
    const newPrice = baseMetrics.avgPrice * (1 + params.priceChange / 100);
    const newVolume = baseMetrics.totalVolume * (1 + params.volumeChange / 100);
    const newCosts = baseMetrics.totalCosts * (1 + params.costChange / 100);
    
    // Calcular elasticidad precio-demanda (simulada)
    const priceElasticity = -0.8; // Elasticidad típica
    const demandAdjustment = params.priceChange * priceElasticity / 100;
    const adjustedVolume = newVolume * (1 + demandAdjustment);

    // Calcular métricas del escenario
    const newRevenue = newPrice * adjustedVolume;
    const efficiencyFactor = 1 + params.efficiencyChange / 100;
    const adjustedCosts = newCosts / efficiencyFactor;
    const newNetProfit = newRevenue - adjustedCosts;

    // Calcular cambios relativos
    const marginChange = baseMetrics.totalRevenue > 0 
      ? ((newNetProfit / newRevenue) * 100) - baseMetrics.operatingMargin
      : 0;

    const roiChange = baseMetrics.netProfit !== 0 
      ? ((newNetProfit - baseMetrics.netProfit) / Math.abs(baseMetrics.netProfit)) * 100
      : 0;

    // Punto de equilibrio
    const fixedCosts = adjustedCosts * 0.4; // Estimación de costos fijos
    const variableCostPerUnit = (adjustedCosts * 0.6) / adjustedVolume;
    const breakEvenPoint = newPrice > variableCostPerUnit 
      ? fixedCosts / (newPrice - variableCostPerUnit)
      : 0;

    // Score de factibilidad (0-100)
    const revenueScore = Math.min(Math.max((newRevenue / baseMetrics.totalRevenue - 0.8) * 50, 0), 30);
    const profitScore = Math.min(Math.max((newNetProfit / Math.max(baseMetrics.netProfit, 1000) - 0.5) * 40, 0), 40);
    const volumeScore = Math.min(Math.max((adjustedVolume / baseMetrics.totalVolume - 0.7) * 30, 0), 30);
    const feasibilityScore = Math.min(revenueScore + profitScore + volumeScore, 100);

    return {
      scenario: `Precio ${params.priceChange >= 0 ? '+' : ''}${params.priceChange}%, Volumen ${params.volumeChange >= 0 ? '+' : ''}${params.volumeChange}%, Costos ${params.costChange >= 0 ? '+' : ''}${params.costChange}%`,
      totalRevenue: newRevenue,
      totalCosts: adjustedCosts,
      netProfit: newNetProfit,
      marginChange,
      roiChange,
      breakEvenPoint,
      feasibilityScore
    };
  };

  const runMonteCarloSimulation = async () => {
    setIsSimulating(true);
    const results: ScenarioResult[] = [];

    // Definir escenarios predefinidos
    const scenarios = [
      { priceChange: 5, volumeChange: -2, costChange: 2, efficiencyChange: 3 },
      { priceChange: -3, volumeChange: 8, costChange: -1, efficiencyChange: 5 },
      { priceChange: 10, volumeChange: -5, costChange: 1, efficiencyChange: 2 },
      { priceChange: 0, volumeChange: 15, costChange: 3, efficiencyChange: 8 },
      { priceChange: -5, volumeChange: 12, costChange: -3, efficiencyChange: 4 },
      { priceChange: 8, volumeChange: -1, costChange: 0, efficiencyChange: 6 },
    ];

    // Simular cada escenario con delay para animación
    for (let i = 0; i < scenarios.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = simulateScenario(scenarios[i]);
      results.push(result);
      setSimulationResults([...results]);
    }

    setIsSimulating(false);
  };

  const currentScenarioResult = useMemo(() => {
    return simulateScenario(currentScenario);
  }, [currentScenario, baseMetrics]);

  const chartData = {
    labels: simulationResults.map((_, index) => `Escenario ${index + 1}`),
    datasets: [
      {
        label: 'ROI Change (%)',
        data: simulationResults.map(r => r.roiChange),
        backgroundColor: simulationResults.map(r => 
          r.roiChange > 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ),
        borderColor: simulationResults.map(r => 
          r.roiChange > 0 ? '#22c562' : '#ef4444'
        ),
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#8892b0',
          font: { family: 'monospace' }
        }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(136, 146, 176, 0.1)' },
        ticks: { color: '#8892b0' }
      },
      y: {
        grid: { color: 'rgba(136, 146, 176, 0.1)' },
        ticks: { color: '#8892b0' }
      },
    },
    maintainAspectRatio: false,
  };

  if (!baseMetrics) {
    return (
      <div className="hologram-card p-8 rounded-2xl shadow-hologram text-center">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
        <p className="text-text-muted">
          Se requieren datos financieros y de producción para ejecutar simulaciones
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles de Simulación */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hologram-card p-6 rounded-2xl shadow-hologram"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-display text-primary text-glow">
              Simulador de Escenarios Operativos
            </h3>
          </div>
          <button
            onClick={runMonteCarloSimulation}
            disabled={isSimulating}
            className="cyber-button flex items-center gap-2"
          >
            {isSimulating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4" />
            )}
            {isSimulating ? 'Simulando...' : 'Ejecutar Simulación'}
          </button>
        </div>

        {/* Controles de Parámetros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 border border-primary/30 rounded-lg">
            <label className="block text-sm font-display text-text-secondary mb-2">
              Cambio en Precios (%)
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={currentScenario.priceChange}
              onChange={(e) => setCurrentScenario(prev => ({
                ...prev,
                priceChange: Number(e.target.value)
              }))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer slider-primary"
            />
            <div className="text-center text-sm font-mono text-primary mt-2">
              {currentScenario.priceChange >= 0 ? '+' : ''}{currentScenario.priceChange}%
            </div>
          </div>

          <div className="glass-card p-4 border border-accent/30 rounded-lg">
            <label className="block text-sm font-display text-text-secondary mb-2">
              Cambio en Volumen (%)
            </label>
            <input
              type="range"
              min="-15"
              max="25"
              step="1"
              value={currentScenario.volumeChange}
              onChange={(e) => setCurrentScenario(prev => ({
                ...prev,
                volumeChange: Number(e.target.value)
              }))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer slider-accent"
            />
            <div className="text-center text-sm font-mono text-accent mt-2">
              {currentScenario.volumeChange >= 0 ? '+' : ''}{currentScenario.volumeChange}%
            </div>
          </div>

          <div className="glass-card p-4 border border-warning/30 rounded-lg">
            <label className="block text-sm font-display text-text-secondary mb-2">
              Cambio en Costos (%)
            </label>
            <input
              type="range"
              min="-10"
              max="15"
              step="1"
              value={currentScenario.costChange}
              onChange={(e) => setCurrentScenario(prev => ({
                ...prev,
                costChange: Number(e.target.value)
              }))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer slider-warning"
            />
            <div className="text-center text-sm font-mono text-warning mt-2">
              {currentScenario.costChange >= 0 ? '+' : ''}{currentScenario.costChange}%
            </div>
          </div>

          <div className="glass-card p-4 border border-success/30 rounded-lg">
            <label className="block text-sm font-display text-text-secondary mb-2">
              Mejora en Eficiencia (%)
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={currentScenario.efficiencyChange}
              onChange={(e) => setCurrentScenario(prev => ({
                ...prev,
                efficiencyChange: Number(e.target.value)
              }))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer slider-success"
            />
            <div className="text-center text-sm font-mono text-success mt-2">
              +{currentScenario.efficiencyChange}%
            </div>
          </div>
        </div>

        {/* Resultado del Escenario Actual */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 border border-primary/30 rounded-lg text-center">
            <div className="text-xl font-mono text-primary mb-1">
              {formatCurrency(currentScenarioResult.totalRevenue)}
            </div>
            <div className="text-sm text-text-muted">Ingresos Proyectados</div>
            <div className={`text-xs mt-1 ${
              currentScenarioResult.totalRevenue > baseMetrics.totalRevenue ? 'text-success' : 'text-danger'
            }`}>
              vs Base: {formatCurrency(currentScenarioResult.totalRevenue - baseMetrics.totalRevenue)}
            </div>
          </div>

          <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
            <div className="text-xl font-mono text-accent mb-1">
              {formatCurrency(currentScenarioResult.netProfit)}
            </div>
            <div className="text-sm text-text-muted">Utilidad Neta</div>
            <div className={`text-xs mt-1 ${
              currentScenarioResult.roiChange > 0 ? 'text-success' : 'text-danger'
            }`}>
              ROI: {currentScenarioResult.roiChange >= 0 ? '+' : ''}{currentScenarioResult.roiChange.toFixed(1)}%
            </div>
          </div>

          <div className="glass-card p-4 border border-warning/30 rounded-lg text-center">
            <div className="text-xl font-mono text-warning mb-1">
              {currentScenarioResult.breakEvenPoint.toLocaleString('es-EC', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </div>
            <div className="text-sm text-text-muted">Punto Equilibrio (m²)</div>
            <div className={`text-xs mt-1 ${
              currentScenarioResult.marginChange > 0 ? 'text-success' : 'text-danger'
            }`}>
              Margen: {currentScenarioResult.marginChange >= 0 ? '+' : ''}{currentScenarioResult.marginChange.toFixed(1)}%
            </div>
          </div>

          <div className="glass-card p-4 border border-success/30 rounded-lg text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="text-xl font-mono text-success mr-2">
                {currentScenarioResult.feasibilityScore.toFixed(0)}
              </div>
              {currentScenarioResult.feasibilityScore > 70 ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : currentScenarioResult.feasibilityScore > 40 ? (
                <AlertCircle className="w-5 h-5 text-warning" />
              ) : (
                <AlertCircle className="w-5 h-5 text-danger" />
              )}
            </div>
            <div className="text-sm text-text-muted">Score Factibilidad</div>
            <div className={`text-xs mt-1 ${
              currentScenarioResult.feasibilityScore > 70 ? 'text-success' : 
              currentScenarioResult.feasibilityScore > 40 ? 'text-warning' : 'text-danger'
            }`}>
              {currentScenarioResult.feasibilityScore > 70 ? 'Altamente Viable' : 
               currentScenarioResult.feasibilityScore > 40 ? 'Moderadamente Viable' : 'Riesgoso'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Resultados de Simulación Monte Carlo */}
      {simulationResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hologram-card p-6 rounded-2xl shadow-hologram"
        >
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-display text-primary text-glow">
              Resultados de Simulación Monte Carlo
            </h3>
          </div>

          {/* Gráfico de Resultados */}
          <div className="h-64 mb-6">
            <Bar data={chartData} options={chartOptions} />
          </div>

          {/* Tabla de Resultados */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/20">
                  <th className="text-left p-2 text-text-secondary">Escenario</th>
                  <th className="text-right p-2 text-text-secondary">Ingresos</th>
                  <th className="text-right p-2 text-text-secondary">Utilidad</th>
                  <th className="text-right p-2 text-text-secondary">ROI Change</th>
                  <th className="text-right p-2 text-text-secondary">Factibilidad</th>
                </tr>
              </thead>
              <tbody>
                {simulationResults.map((result, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-accent/10 hover:bg-accent/5"
                  >
                    <td className="p-2 text-text-primary text-xs">{result.scenario}</td>
                    <td className="p-2 text-right font-mono text-primary">
                      {formatCurrency(result.totalRevenue)}
                    </td>
                    <td className="p-2 text-right font-mono text-accent">
                      {formatCurrency(result.netProfit)}
                    </td>
                    <td className={`p-2 text-right font-mono ${
                      result.roiChange > 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {result.roiChange >= 0 ? '+' : ''}{result.roiChange.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right font-mono text-warning">
                      {result.feasibilityScore.toFixed(0)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OperationalScenarioSimulator;
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  DollarSign,
  BarChart3,
  Award,
  Clock,
  Gauge
} from 'lucide-react';
import { FinancialData, ProductionData, OperationalMetrics } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { OperationalAnalysisType } from './OperationalAnalysisTypeSelector';

interface DetailedOperationalAnalysisProps {
  analysisType: OperationalAnalysisType;
  financialData: FinancialData;
  productionData: ProductionData[];
  operationalMetrics: OperationalMetrics[];
  selectedMonth: string;
  selectedYear: number;
}

interface EfficiencyMetrics {
  productivityIndex: number;
  capacityUtilization: number;
  assetTurnover: number;
  throughputRatio: number;
  operationalVelocity: number;
  resourceEfficiency: number;
}

interface ProfitabilityMetrics {
  grossMargin: number;
  operatingMargin: number;
  roiPerSquareMeter: number;
  valueCreationIndex: number;
  profitabilityTrend: number;
  marginStability: number;
}

interface PerformanceMetrics {
  overallScore: number;
  efficiencyScore: number;
  profitabilityScore: number;
  sustainabilityScore: number;
  targetAchievement: number;
  competitivePosition: number;
}

const DetailedOperationalAnalysis: React.FC<DetailedOperationalAnalysisProps> = ({
  analysisType,
  financialData,
  productionData,
  operationalMetrics,
  selectedMonth,
  selectedYear
}) => {

  // Métricas base
  const baseMetrics = useMemo(() => {
    if (!financialData || !productionData.length) return null;

    const totalRevenue = financialData.yearly.ingresos;
    const totalAssets = financialData.yearly.activoTotal || totalRevenue * 0.8;
    const totalVolume = productionData.reduce((sum, p) => sum + p.metrosVendidos, 0);
    const totalProduced = productionData.reduce((sum, p) => sum + p.metrosProducidos, 0);
    const operatingIncome = financialData.yearly.utilidadOperacional || 0;
    const totalCosts = financialData.yearly.costoVentasTotal;

    return {
      totalRevenue,
      totalAssets,
      totalVolume,
      totalProduced,
      operatingIncome,
      totalCosts,
      avgPrice: totalVolume > 0 ? totalRevenue / totalVolume : 0,
      avgCost: totalVolume > 0 ? totalCosts / totalVolume : 0
    };
  }, [financialData, productionData]);

  // Análisis de Eficiencia
  const efficiencyAnalysis = useMemo((): EfficiencyMetrics | null => {
    if (!baseMetrics) return null;

    const maxCapacity = baseMetrics.totalProduced * 1.25; // Capacidad estimada
    const idealThroughput = baseMetrics.totalRevenue * 1.1; // Throughput ideal

    return {
      productivityIndex: baseMetrics.totalVolume > 0 ? 
        (baseMetrics.totalRevenue / baseMetrics.totalVolume) / 1000 : 0,
      capacityUtilization: maxCapacity > 0 ? 
        (baseMetrics.totalProduced / maxCapacity) * 100 : 0,
      assetTurnover: baseMetrics.totalAssets > 0 ? 
        baseMetrics.totalRevenue / baseMetrics.totalAssets : 0,
      throughputRatio: idealThroughput > 0 ? 
        (baseMetrics.totalRevenue / idealThroughput) * 100 : 0,
      operationalVelocity: baseMetrics.totalVolume > 0 ? 
        baseMetrics.totalProduced / baseMetrics.totalVolume : 0,
      resourceEfficiency: baseMetrics.totalCosts > 0 ? 
        (baseMetrics.totalRevenue / baseMetrics.totalCosts) * 100 : 0
    };
  }, [baseMetrics]);

  // Análisis de Rentabilidad
  const profitabilityAnalysis = useMemo((): ProfitabilityMetrics | null => {
    if (!baseMetrics || !operationalMetrics.length) return null;

    const grossMargin = baseMetrics.totalRevenue > 0 ? 
      ((baseMetrics.totalRevenue - baseMetrics.totalCosts) / baseMetrics.totalRevenue) * 100 : 0;
    
    const operatingMargin = baseMetrics.totalRevenue > 0 ? 
      (baseMetrics.operatingIncome / baseMetrics.totalRevenue) * 100 : 0;

    // Calcular tendencia de margen
    const margins = operationalMetrics.map(m => m.margenPorcentual);
    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    const marginVariance = margins.reduce((sum, margin) => 
      sum + Math.pow(margin - avgMargin, 2), 0) / margins.length;

    return {
      grossMargin,
      operatingMargin,
      roiPerSquareMeter: baseMetrics.totalVolume > 0 ? 
        baseMetrics.operatingIncome / baseMetrics.totalVolume : 0,
      valueCreationIndex: grossMargin > 20 ? 
        Math.min((grossMargin / 20) * 100, 150) : (grossMargin / 20) * 100,
      profitabilityTrend: margins.length > 1 ? 
        ((margins[margins.length - 1] - margins[0]) / Math.abs(margins[0])) * 100 : 0,
      marginStability: Math.sqrt(marginVariance)
    };
  }, [baseMetrics, operationalMetrics]);

  // Análisis de Performance Integral
  const performanceAnalysis = useMemo((): PerformanceMetrics | null => {
    if (!efficiencyAnalysis || !profitabilityAnalysis) return null;

    const efficiencyScore = Math.min(
      (efficiencyAnalysis.capacityUtilization * 0.3 +
       efficiencyAnalysis.resourceEfficiency * 0.4 +
       efficiencyAnalysis.assetTurnover * 20 +
       efficiencyAnalysis.throughputRatio * 0.3), 100
    );

    const profitabilityScore = Math.min(
      (Math.abs(profitabilityAnalysis.grossMargin) * 2 +
       Math.abs(profitabilityAnalysis.operatingMargin) * 3 +
       profitabilityAnalysis.valueCreationIndex * 0.5), 100
    );

    const sustainabilityScore = Math.min(
      100 - profitabilityAnalysis.marginStability * 5 +
      (profitabilityAnalysis.profitabilityTrend > 0 ? 20 : -10), 100
    );

    const overallScore = (efficiencyScore * 0.4 + profitabilityScore * 0.4 + sustainabilityScore * 0.2);

    return {
      overallScore,
      efficiencyScore,
      profitabilityScore,
      sustainabilityScore: Math.max(sustainabilityScore, 0),
      targetAchievement: overallScore > 75 ? 100 : (overallScore / 75) * 100,
      competitivePosition: overallScore > 80 ? 95 : overallScore > 60 ? 75 : 50
    };
  }, [efficiencyAnalysis, profitabilityAnalysis]);

  // Datos del mes seleccionado
  const selectedMonthData = useMemo(() => {
    const monthMetrics = operationalMetrics.find(m => m.month === selectedMonth);
    const monthProduction = productionData.find(p => p.month === selectedMonth);
    const monthFinancial = financialData?.monthly[selectedMonth];

    if (!monthMetrics || !monthProduction || !monthFinancial) return null;

    return {
      metrics: monthMetrics,
      production: monthProduction,
      financial: monthFinancial
    };
  }, [operationalMetrics, productionData, financialData, selectedMonth]);

  // Configuración de gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#8892b0',
          font: { family: 'monospace', size: 11 }
        }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(136, 146, 176, 0.1)' },
        ticks: { color: '#8892b0', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(136, 146, 176, 0.1)' },
        ticks: { color: '#8892b0', font: { size: 10 } }
      },
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-success" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <AlertTriangle className="w-5 h-5 text-danger" />;
  };

  if (!baseMetrics) {
    return (
      <div className="hologram-card p-8 rounded-2xl shadow-hologram text-center">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <p className="text-text-muted">
          Datos insuficientes para análisis detallado
        </p>
      </div>
    );
  }

  const renderEfficiencyAnalysis = () => (
    <div className="space-y-6">
      {/* KPIs de Eficiencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="w-5 h-5 text-accent mr-2" />
            <span className="text-xs text-text-muted">PRODUCTIVIDAD</span>
          </div>
          <div className="text-2xl font-mono text-accent mb-1">
            {efficiencyAnalysis?.productivityIndex.toFixed(2)}
          </div>
          <div className="text-sm text-text-muted">Rev per 1K m²</div>
        </div>

        <div className="glass-card p-4 border border-primary/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Gauge className="w-5 h-5 text-primary mr-2" />
            <span className="text-xs text-text-muted">CAPACIDAD</span>
          </div>
          <div className="text-2xl font-mono text-primary mb-1">
            {efficiencyAnalysis?.capacityUtilization.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">Utilización</div>
        </div>

        <div className="glass-card p-4 border border-warning/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className="w-5 h-5 text-warning mr-2" />
            <span className="text-xs text-text-muted">RECURSOS</span>
          </div>
          <div className="text-2xl font-mono text-warning mb-1">
            {efficiencyAnalysis?.resourceEfficiency.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">Eficiencia</div>
        </div>
      </div>

      {/* Análisis del Mes Seleccionado */}
      {selectedMonthData && (
        <div className="hologram-card p-6 rounded-xl">
          <h4 className="text-xl font-display text-primary mb-4">
            Análisis de Eficiencia - {selectedMonth}
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Metros Producidos:</span>
                <span className="font-mono font-bold text-accent">
                  {selectedMonthData.production.metrosProducidos.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Metros Vendidos:</span>
                <span className="font-mono font-bold text-primary">
                  {selectedMonthData.production.metrosVendidos.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Productividad:</span>
                <span className={`font-mono font-bold ${
                  selectedMonthData.metrics.productividad >= 80 ? 'text-success' : 
                  selectedMonthData.metrics.productividad >= 60 ? 'text-warning' : 'text-danger'
                }`}>
                  {selectedMonthData.metrics.productividad.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Eficiencia Ventas:</span>
                <span className={`font-mono font-bold ${
                  selectedMonthData.metrics.eficienciaVentas >= 90 ? 'text-success' : 
                  selectedMonthData.metrics.eficienciaVentas >= 75 ? 'text-warning' : 'text-danger'
                }`}>
                  {selectedMonthData.metrics.eficienciaVentas.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Throughput m²:</span>
                <span className="font-mono font-bold text-accent">
                  {(selectedMonthData.production.metrosVendidos / 
                    (selectedMonthData.production.metrosProducidos || 1)).toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Revenue/m²:</span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(selectedMonthData.metrics.precioVentaPorMetro)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfitabilityAnalysis = () => (
    <div className="space-y-6">
      {/* KPIs de Rentabilidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border border-primary/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <DollarSign className="w-5 h-5 text-primary mr-2" />
            <span className="text-xs text-text-muted">MARGEN BRUTO</span>
          </div>
          <div className="text-2xl font-mono text-primary mb-1">
            {profitabilityAnalysis?.grossMargin.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">Gross Margin</div>
        </div>

        <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-accent mr-2" />
            <span className="text-xs text-text-muted">MARGEN OP.</span>
          </div>
          <div className="text-2xl font-mono text-accent mb-1">
            {profitabilityAnalysis?.operatingMargin.toFixed(1)}%
          </div>
          <div className="text-sm text-text-muted">Operating Margin</div>
        </div>

        <div className="glass-card p-4 border border-warning/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="w-5 h-5 text-warning mr-2" />
            <span className="text-xs text-text-muted">ROI/m²</span>
          </div>
          <div className="text-2xl font-mono text-warning mb-1">
            {formatCurrency(profitabilityAnalysis?.roiPerSquareMeter || 0)}
          </div>
          <div className="text-sm text-text-muted">per Square Meter</div>
        </div>
      </div>

      {/* Análisis del Mes Seleccionado */}
      {selectedMonthData && (
        <div className="hologram-card p-6 rounded-xl">
          <h4 className="text-xl font-display text-primary mb-4">
            Análisis de Rentabilidad - {selectedMonth}
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Precio Venta/m²:</span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(selectedMonthData.metrics.precioVentaPorMetro)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Costo/m²:</span>
                <span className="font-mono font-bold text-warning">
                  {formatCurrency(selectedMonthData.metrics.costoProduccionPorMetro)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Margen/m²:</span>
                <span className={`font-mono font-bold ${
                  selectedMonthData.metrics.margenPorMetro >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {formatCurrency(selectedMonthData.metrics.margenPorMetro)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Margen %:</span>
                <span className={`font-mono font-bold ${
                  selectedMonthData.metrics.margenPorcentual >= 20 ? 'text-success' : 
                  selectedMonthData.metrics.margenPorcentual >= 10 ? 'text-warning' : 'text-danger'
                }`}>
                  {selectedMonthData.metrics.margenPorcentual.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Ingresos Totales:</span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(selectedMonthData.financial.ingresos)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 glass-card border border-border rounded-lg">
                <span className="text-text-secondary">Utilidad:</span>
                <span className={`font-mono font-bold ${
                  selectedMonthData.financial.utilidadNeta >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {formatCurrency(selectedMonthData.financial.utilidadNeta)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPerformanceAnalysis = () => (
    <div className="space-y-6">
      {/* Scorecard Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-primary/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            {getScoreIcon(performanceAnalysis?.overallScore || 0)}
            <span className="text-xs text-text-muted ml-2">OVERALL</span>
          </div>
          <div className={`text-2xl font-mono mb-1 ${getScoreColor(performanceAnalysis?.overallScore || 0)}`}>
            {performanceAnalysis?.overallScore.toFixed(0)}
          </div>
          <div className="text-sm text-text-muted">Performance Score</div>
        </div>

        <div className="glass-card p-4 border border-accent/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="w-5 h-5 text-accent mr-2" />
            <span className="text-xs text-text-muted">EFFICIENCY</span>
          </div>
          <div className={`text-2xl font-mono mb-1 ${getScoreColor(performanceAnalysis?.efficiencyScore || 0)}`}>
            {performanceAnalysis?.efficiencyScore.toFixed(0)}
          </div>
          <div className="text-sm text-text-muted">Efficiency Score</div>
        </div>

        <div className="glass-card p-4 border border-warning/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <DollarSign className="w-5 h-5 text-warning mr-2" />
            <span className="text-xs text-text-muted">PROFITABILITY</span>
          </div>
          <div className={`text-2xl font-mono mb-1 ${getScoreColor(performanceAnalysis?.profitabilityScore || 0)}`}>
            {performanceAnalysis?.profitabilityScore.toFixed(0)}
          </div>
          <div className="text-sm text-text-muted">Profit Score</div>
        </div>

        <div className="glass-card p-4 border border-success/30 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Award className="w-5 h-5 text-success mr-2" />
            <span className="text-xs text-text-muted">TARGETS</span>
          </div>
          <div className={`text-2xl font-mono mb-1 ${getScoreColor(performanceAnalysis?.targetAchievement || 0)}`}>
            {performanceAnalysis?.targetAchievement.toFixed(0)}%
          </div>
          <div className="text-sm text-text-muted">Achievement</div>
        </div>
      </div>

      {/* Balanced Scorecard Visual */}
      <div className="hologram-card p-6 rounded-xl">
        <h4 className="text-xl font-display text-primary mb-6">
          Balanced Operational Scorecard
        </h4>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                <span className="text-text-secondary">Eficiencia Operativa</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-dark-bg rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(performanceAnalysis?.efficiencyScore || 0, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-accent font-bold">
                  {performanceAnalysis?.efficiencyScore.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 glass-card border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-text-secondary">Rentabilidad</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-dark-bg rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(performanceAnalysis?.profitabilityScore || 0, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-primary font-bold">
                  {performanceAnalysis?.profitabilityScore.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 glass-card border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span className="text-text-secondary">Sostenibilidad</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-dark-bg rounded-full h-2">
                  <div 
                    className="bg-warning h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(performanceAnalysis?.sustainabilityScore || 0, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-warning font-bold">
                  {performanceAnalysis?.sustainabilityScore.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border-8 transition-all duration-1000 ${
                (performanceAnalysis?.overallScore || 0) >= 80 ? 'border-success' :
                (performanceAnalysis?.overallScore || 0) >= 60 ? 'border-warning' : 'border-danger'
              } flex items-center justify-center`}>
                <div className="text-center">
                  <div className={`text-3xl font-mono font-bold ${getScoreColor(performanceAnalysis?.overallScore || 0)}`}>
                    {performanceAnalysis?.overallScore.toFixed(0)}
                  </div>
                  <div className="text-xs text-text-muted">SCORE</div>
                </div>
              </div>
              
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className={`w-4 h-4 rounded-full ${
                  (performanceAnalysis?.overallScore || 0) >= 80 ? 'bg-success' :
                  (performanceAnalysis?.overallScore || 0) >= 60 ? 'bg-warning' : 'bg-danger'
                } shadow-glow-sm`}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h5 className="font-semibold text-primary mb-2">Interpretación del Performance</h5>
          <p className="text-sm text-text-secondary">
            {(performanceAnalysis?.overallScore || 0) >= 80 ? 
              'Excelente performance operativo. La empresa demuestra alta eficiencia y rentabilidad sostenible.' :
              (performanceAnalysis?.overallScore || 0) >= 60 ?
              'Performance operativo satisfactorio con áreas de mejora identificadas. Enfocarse en optimización.' :
              'Performance operativo requiere atención inmediata. Se necesitan acciones correctivas urgentes.'
            }
          </p>
        </div>
      </div>
    </div>
  );

  // Renderizado principal según tipo de análisis
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {analysisType === 'efficiency' && renderEfficiencyAnalysis()}
      {analysisType === 'profitability' && renderProfitabilityAnalysis()}
      {analysisType === 'performance' && renderPerformanceAnalysis()}
    </motion.div>
  );
};

export default DetailedOperationalAnalysis;
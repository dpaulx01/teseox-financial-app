import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Calculator,
  BarChart3,
  PieChart,
  DollarSign
} from 'lucide-react';
import { FinancialData, ProductionData, OperationalMetrics } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AdvancedOperationalAnalyticsProps {
  financialData: FinancialData;
  productionData: ProductionData[];
  operationalMetrics: OperationalMetrics[];
  selectedYear: number;
}

interface VarianceAnalysis {
  priceVariance: number;
  volumeVariance: number;
  costVariance: number;
  efficiencyVariance: number;
  totalVariance: number;
}

interface OperationalKPIs {
  assetTurnover: number;
  operatingMargin: number;
  productivityIndex: number;
  capacityUtilization: number;
  costPerUnit: number;
  revenuePerSquareMeter: number;
  grossMarginTrend: number[];
  operatingRatio: number;
}

const AdvancedOperationalAnalytics: React.FC<AdvancedOperationalAnalyticsProps> = ({
  financialData,
  productionData,
  operationalMetrics,
  selectedYear
}) => {

  // Cálculo de análisis de varianza
  const varianceAnalysis = useMemo((): VarianceAnalysis => {
    if (!financialData || !productionData.length) {
      return {
        priceVariance: 0,
        volumeVariance: 0,
        costVariance: 0,
        efficiencyVariance: 0,
        totalVariance: 0
      };
    }

    const actualRevenue = financialData.yearly.ingresos;
    const actualVolume = productionData.reduce((sum, p) => sum + p.metrosVendidos, 0);
    const actualCosts = financialData.yearly.costoVentasTotal;

    // Targets simulados (en una implementación real vendrían de base de datos)
    const targetRevenue = actualRevenue * 1.05; // Target 5% superior
    const targetVolume = actualVolume * 1.03;   // Target 3% superior
    const targetCosts = actualCosts * 0.95;     // Target 5% menor en costos

    const priceVariance = actualRevenue - (targetRevenue * (actualVolume / targetVolume));
    const volumeVariance = (actualVolume - targetVolume) * (actualRevenue / actualVolume);
    const costVariance = targetCosts - actualCosts;
    const efficiencyVariance = actualRevenue - actualCosts - (targetRevenue - targetCosts);

    return {
      priceVariance,
      volumeVariance,
      costVariance,
      efficiencyVariance,
      totalVariance: priceVariance + volumeVariance + costVariance + efficiencyVariance
    };
  }, [financialData, productionData]);

  // Cálculo de KPIs operativos avanzados
  const operationalKPIs = useMemo((): OperationalKPIs => {
    if (!financialData || !productionData.length) {
      return {
        assetTurnover: 0,
        operatingMargin: 0,
        productivityIndex: 0,
        capacityUtilization: 0,
        costPerUnit: 0,
        revenuePerSquareMeter: 0,
        grossMarginTrend: [],
        operatingRatio: 0
      };
    }

    const totalRevenue = financialData.yearly.ingresos;
    const totalAssets = financialData.yearly.activoTotal || totalRevenue * 0.8; // Estimación
    const totalVolume = productionData.reduce((sum, p) => sum + p.metrosVendidos, 0);
    const totalProduced = productionData.reduce((sum, p) => sum + p.metrosProducidos, 0);
    const operatingIncome = financialData.yearly.utilidadOperacional || 0;
    const totalCosts = financialData.yearly.costoVentasTotal;

    // Capacidad máxima estimada (debería venir de configuración)
    const maxCapacity = totalProduced * 1.2;

    // Tendencia de margen bruto mensual
    const grossMarginTrend = Object.keys(financialData.monthly).map(month => {
      const monthData = financialData.monthly[month];
      return monthData.ingresos > 0 
        ? ((monthData.ingresos - monthData.costoVentasTotal) / monthData.ingresos) * 100
        : 0;
    });

    return {
      assetTurnover: totalAssets > 0 ? totalRevenue / totalAssets : 0,
      operatingMargin: totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      productivityIndex: totalVolume > 0 ? (totalRevenue / totalVolume) / 1000 : 0, // Revenue per 1000 m²
      capacityUtilization: maxCapacity > 0 ? (totalProduced / maxCapacity) * 100 : 0,
      costPerUnit: totalVolume > 0 ? totalCosts / totalVolume : 0,
      revenuePerSquareMeter: totalVolume > 0 ? totalRevenue / totalVolume : 0,
      grossMarginTrend,
      operatingRatio: totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0
    };
  }, [financialData, productionData]);

  // Análisis de correlación y elasticidad
  const correlationAnalysis = useMemo(() => {
    if (operationalMetrics.length < 2) return null;

    const prices = operationalMetrics.map(m => m.precioVentaPorMetro);
    const volumes = operationalMetrics.map(m => {
      const prod = productionData.find(p => p.month === m.month);
      return prod?.metrosVendidos || 0;
    });

    // Cálculo de correlación simple
    const n = prices.length;
    const sumX = prices.reduce((a, b) => a + b, 0);
    const sumY = volumes.reduce((a, b) => a + b, 0);
    const sumXY = prices.reduce((sum, x, i) => sum + x * volumes[i], 0);
    const sumX2 = prices.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = volumes.reduce((sum, y) => sum + y * y, 0);

    const correlation = n > 1 ? 
      (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)) : 0;

    // Elasticidad precio-demanda estimada
    const avgPrice = sumX / n;
    const avgVolume = sumY / n;
    const priceElasticity = correlation !== 0 && avgPrice > 0 && avgVolume > 0 ? 
      (correlation * Math.sqrt(sumY2 / n - avgVolume * avgVolume)) / 
      (Math.sqrt(sumX2 / n - avgPrice * avgPrice)) * (avgPrice / avgVolume) : 0;

    return {
      priceVolumeCorrelation: correlation,
      priceElasticity: priceElasticity,
      interpretation: correlation > 0.7 ? 'Fuerte positiva' : 
                     correlation > 0.3 ? 'Moderada positiva' :
                     correlation > -0.3 ? 'Débil' :
                     correlation > -0.7 ? 'Moderada negativa' : 'Fuerte negativa'
    };
  }, [operationalMetrics, productionData]);

  // Configuración del gráfico de tendencias
  const trendChartData = {
    labels: operationalMetrics.map(m => m.month),
    datasets: [
      {
        label: 'Margen Bruto %',
        data: operationalKPIs.grossMarginTrend,
        borderColor: '#00f5ff',
        backgroundColor: 'rgba(0, 245, 255, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Productividad',
        data: operationalMetrics.map(m => m.productividad),
        borderColor: '#ff3d71',
        backgroundColor: 'rgba(255, 61, 113, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: 'rgba(136, 146, 176, 0.1)' },
        ticks: { color: '#8892b0' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#8892b0' }
      },
    },
    maintainAspectRatio: false,
  };

  const getVarianceColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < -1000) return 'text-danger';
    return 'text-warning';
  };

  const getVarianceIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4" />;
    if (value < -1000) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Operativos Avanzados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hologram-card p-6 rounded-2xl shadow-hologram"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-display text-primary text-glow">
            KPIs Operativos Avanzados
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 border border-primary/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-xs text-text-muted">ROTACIÓN</span>
            </div>
            <div className="text-xl font-mono text-primary">
              {operationalKPIs.assetTurnover.toFixed(2)}x
            </div>
            <div className="text-sm text-text-muted">Asset Turnover</div>
          </div>

          <div className="glass-card p-4 border border-accent/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-accent" />
              <span className="text-xs text-text-muted">MARGEN</span>
            </div>
            <div className="text-xl font-mono text-accent">
              {operationalKPIs.operatingMargin.toFixed(1)}%
            </div>
            <div className="text-sm text-text-muted">Margen Operativo</div>
          </div>

          <div className="glass-card p-4 border border-warning/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-warning" />
              <span className="text-xs text-text-muted">CAPACIDAD</span>
            </div>
            <div className="text-xl font-mono text-warning">
              {operationalKPIs.capacityUtilization.toFixed(1)}%
            </div>
            <div className="text-sm text-text-muted">Utilización</div>
          </div>

          <div className="glass-card p-4 border border-success/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="text-xs text-text-muted">PRODUCTIVIDAD</span>
            </div>
            <div className="text-xl font-mono text-success">
              {formatCurrency(operationalKPIs.revenuePerSquareMeter)}
            </div>
            <div className="text-sm text-text-muted">Revenue/m²</div>
          </div>
        </div>
      </motion.div>

      {/* Análisis de Varianza */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hologram-card p-6 rounded-2xl shadow-hologram"
      >
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-display text-primary text-glow">
            Análisis de Varianza vs Targets
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`glass-card p-4 border rounded-lg ${
            varianceAnalysis.priceVariance > 0 ? 'border-success/30' : 'border-danger/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              {getVarianceIcon(varianceAnalysis.priceVariance)}
              <span className="text-xs text-text-muted">PRECIO</span>
            </div>
            <div className={`text-lg font-mono ${getVarianceColor(varianceAnalysis.priceVariance)}`}>
              {formatCurrency(varianceAnalysis.priceVariance)}
            </div>
            <div className="text-sm text-text-muted">Varianza Precio</div>
          </div>

          <div className={`glass-card p-4 border rounded-lg ${
            varianceAnalysis.volumeVariance > 0 ? 'border-success/30' : 'border-danger/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              {getVarianceIcon(varianceAnalysis.volumeVariance)}
              <span className="text-xs text-text-muted">VOLUMEN</span>
            </div>
            <div className={`text-lg font-mono ${getVarianceColor(varianceAnalysis.volumeVariance)}`}>
              {formatCurrency(varianceAnalysis.volumeVariance)}
            </div>
            <div className="text-sm text-text-muted">Varianza Volumen</div>
          </div>

          <div className={`glass-card p-4 border rounded-lg ${
            varianceAnalysis.costVariance > 0 ? 'border-success/30' : 'border-danger/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              {getVarianceIcon(varianceAnalysis.costVariance)}
              <span className="text-xs text-text-muted">COSTOS</span>
            </div>
            <div className={`text-lg font-mono ${getVarianceColor(varianceAnalysis.costVariance)}`}>
              {formatCurrency(varianceAnalysis.costVariance)}
            </div>
            <div className="text-sm text-text-muted">Varianza Costos</div>
          </div>

          <div className={`glass-card p-4 border rounded-lg ${
            varianceAnalysis.efficiencyVariance > 0 ? 'border-success/30' : 'border-danger/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              {getVarianceIcon(varianceAnalysis.efficiencyVariance)}
              <span className="text-xs text-text-muted">EFICIENCIA</span>
            </div>
            <div className={`text-lg font-mono ${getVarianceColor(varianceAnalysis.efficiencyVariance)}`}>
              {formatCurrency(varianceAnalysis.efficiencyVariance)}
            </div>
            <div className="text-sm text-text-muted">Varianza Eficiencia</div>
          </div>

          <div className={`glass-card p-4 border-2 rounded-lg ${
            varianceAnalysis.totalVariance > 0 ? 'border-success/50 bg-success/5' : 'border-danger/50 bg-danger/5'
          }`}>
            <div className="flex items-center justify-between mb-2">
              {varianceAnalysis.totalVariance > 0 ? 
                <CheckCircle className="w-5 h-5 text-success" /> : 
                <AlertTriangle className="w-5 h-5 text-danger" />
              }
              <span className="text-xs text-text-muted font-bold">TOTAL</span>
            </div>
            <div className={`text-xl font-mono font-bold ${
              varianceAnalysis.totalVariance > 0 ? 'text-success' : 'text-danger'
            }`}>
              {formatCurrency(varianceAnalysis.totalVariance)}
            </div>
            <div className="text-sm text-text-muted font-semibold">Varianza Total</div>
          </div>
        </div>
      </motion.div>

      {/* Análisis de Correlación y Elasticidad */}
      {correlationAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hologram-card p-6 rounded-2xl shadow-hologram"
        >
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-display text-primary text-glow">
              Análsis Econométrico
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-5 border border-accent/30 rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-mono text-accent mb-2">
                  {correlationAnalysis.priceVolumeCorrelation.toFixed(3)}
                </div>
                <div className="text-sm text-text-muted mb-1">Correlación Precio-Volumen</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  Math.abs(correlationAnalysis.priceVolumeCorrelation) > 0.7 ? 'bg-success/20 text-success' :
                  Math.abs(correlationAnalysis.priceVolumeCorrelation) > 0.3 ? 'bg-warning/20 text-warning' :
                  'bg-danger/20 text-danger'
                }`}>
                  {correlationAnalysis.interpretation}
                </div>
              </div>
            </div>

            <div className="glass-card p-5 border border-primary/30 rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-mono text-primary mb-2">
                  {correlationAnalysis.priceElasticity.toFixed(2)}
                </div>
                <div className="text-sm text-text-muted mb-1">Elasticidad Precio-Demanda</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  Math.abs(correlationAnalysis.priceElasticity) > 1 ? 'bg-danger/20 text-danger' :
                  Math.abs(correlationAnalysis.priceElasticity) > 0.5 ? 'bg-warning/20 text-warning' :
                  'bg-success/20 text-success'
                }`}>
                  {Math.abs(correlationAnalysis.priceElasticity) > 1 ? 'Elástica' :
                   Math.abs(correlationAnalysis.priceElasticity) > 0.5 ? 'Moderada' : 'Inelástica'}
                </div>
              </div>
            </div>

            <div className="glass-card p-5 border border-warning/30 rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-mono text-warning mb-2">
                  {operationalKPIs.operatingRatio.toFixed(1)}%
                </div>
                <div className="text-sm text-text-muted mb-1">Operating Ratio</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  operationalKPIs.operatingRatio < 80 ? 'bg-success/20 text-success' :
                  operationalKPIs.operatingRatio < 90 ? 'bg-warning/20 text-warning' :
                  'bg-danger/20 text-danger'
                }`}>
                  {operationalKPIs.operatingRatio < 80 ? 'Excelente' :
                   operationalKPIs.operatingRatio < 90 ? 'Bueno' : 'Mejorable'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Gráfico de Tendencias */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="hologram-card p-6 rounded-2xl shadow-hologram"
      >
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-display text-primary text-glow">
            Análisis de Tendencias Operativas
          </h3>
        </div>

        <div className="h-80">
          <Line data={trendChartData} options={chartOptions} />
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedOperationalAnalytics;
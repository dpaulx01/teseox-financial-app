import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Zap,
  DollarSign,
  Activity,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { FinancialData, ProductionData, OperationalMetrics } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface OperationalInsightsProps {
  financialData: FinancialData;
  productionData: ProductionData[];
  operationalMetrics: OperationalMetrics[];
  selectedMonth: string;
  selectedYear: number;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  category: 'efficiency' | 'profitability' | 'trends' | 'optimization';
  title: string;
  description: string;
  value?: string;
  change?: number;
  recommendation?: string;
  icon: React.ComponentType<any>;
  priority: 'high' | 'medium' | 'low';
}

const OperationalInsights: React.FC<OperationalInsightsProps> = ({
  financialData,
  productionData,
  operationalMetrics,
  selectedMonth,
  selectedYear
}) => {

  const insights = useMemo((): Insight[] => {
    if (!financialData || !productionData.length || !operationalMetrics.length) return [];

    const insights: Insight[] = [];
    
    // Métricas actuales
    const currentMetrics = operationalMetrics.find(m => m.month === selectedMonth);
    const totalProducidos = productionData.reduce((sum, p) => sum + p.metrosProducidos, 0);
    const totalVendidos = productionData.reduce((sum, p) => sum + p.metrosVendidos, 0);
    const eficienciaGlobal = totalProducidos > 0 ? (totalVendidos / totalProducidos) * 100 : 0;
    
    // Promedios para comparación
    const avgMargin = operationalMetrics.reduce((sum, m) => sum + m.margenPorcentual, 0) / operationalMetrics.length;
    const avgEfficiency = operationalMetrics.reduce((sum, m) => sum + m.eficienciaVentas, 0) / operationalMetrics.length;
    const avgPrice = operationalMetrics.reduce((sum, m) => sum + m.precioVentaPorMetro, 0) / operationalMetrics.length;

    // 1. Análisis de Eficiencia
    if (eficienciaGlobal >= 90) {
      insights.push({
        id: 'efficiency-excellent',
        type: 'success',
        category: 'efficiency',
        title: 'Excelente Eficiencia Operativa',
        description: `Su eficiencia de ventas del ${eficienciaGlobal.toFixed(1)}% está por encima del benchmark de 90%.`,
        value: `${eficienciaGlobal.toFixed(1)}%`,
        icon: CheckCircle,
        priority: 'high',
        recommendation: 'Mantenga los procesos actuales y considere documentar las mejores prácticas para escalabilidad.'
      });
    } else if (eficienciaGlobal < 75) {
      insights.push({
        id: 'efficiency-low',
        type: 'warning',
        category: 'efficiency',
        title: 'Oportunidad de Mejora en Eficiencia',
        description: `La eficiencia del ${eficienciaGlobal.toFixed(1)}% está por debajo del objetivo del 75%.`,
        value: `${eficienciaGlobal.toFixed(1)}%`,
        change: eficienciaGlobal - 75,
        icon: AlertTriangle,
        priority: 'high',
        recommendation: 'Revise procesos de producción y optimice la conversión de metros producidos a vendidos.'
      });
    }

    // 2. Análisis de Rentabilidad
    if (currentMetrics) {
      if (currentMetrics.margenPorcentual >= 25) {
        insights.push({
          id: 'margin-excellent',
          type: 'success',
          category: 'profitability',
          title: 'Margen Excelente',
          description: `El margen del ${currentMetrics.margenPorcentual.toFixed(1)}% supera significativamente el benchmark.`,
          value: `${currentMetrics.margenPorcentual.toFixed(1)}%`,
          icon: DollarSign,
          priority: 'medium',
          recommendation: 'Considere estrategias de crecimiento o expansión manteniendo estos márgenes.'
        });
      } else if (currentMetrics.margenPorcentual < 15) {
        insights.push({
          id: 'margin-low',
          type: 'danger',
          category: 'profitability',
          title: 'Margen Crítico',
          description: `El margen del ${currentMetrics.margenPorcentual.toFixed(1)}% requiere atención inmediata.`,
          value: `${currentMetrics.margenPorcentual.toFixed(1)}%`,
          change: currentMetrics.margenPorcentual - 15,
          icon: TrendingDown,
          priority: 'high',
          recommendation: 'Revise estructura de costos y estrategia de precios. Priorice reducción de costos operativos.'
        });
      }

      // Comparación con promedio
      const marginChange = currentMetrics.margenPorcentual - avgMargin;
      if (Math.abs(marginChange) > 5) {
        insights.push({
          id: 'margin-trend',
          type: marginChange > 0 ? 'success' : 'warning',
          category: 'trends',
          title: marginChange > 0 ? 'Mejora en Rentabilidad' : 'Declive en Rentabilidad',
          description: `El margen actual está ${Math.abs(marginChange).toFixed(1)}% ${marginChange > 0 ? 'por encima' : 'por debajo'} del promedio anual.`,
          value: `${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)}%`,
          change: marginChange,
          icon: marginChange > 0 ? TrendingUp : TrendingDown,
          priority: 'medium'
        });
      }
    }

    // 3. Análisis de Precios
    const currentPrice = currentMetrics?.precioVentaPorMetro || 0;
    const priceChange = currentPrice - avgPrice;
    if (Math.abs(priceChange) > avgPrice * 0.1) {
      insights.push({
        id: 'price-analysis',
        type: priceChange > 0 ? 'info' : 'warning',
        category: 'optimization',
        title: priceChange > 0 ? 'Precio Premium' : 'Oportunidad de Precio',
        description: `El precio actual de ${formatCurrency(currentPrice)} está ${Math.abs((priceChange/avgPrice)*100).toFixed(1)}% ${priceChange > 0 ? 'por encima' : 'por debajo'} del promedio.`,
        value: formatCurrency(currentPrice),
        change: (priceChange/avgPrice)*100,
        icon: priceChange > 0 ? ArrowUp : ArrowDown,
        priority: 'medium',
        recommendation: priceChange > 0 
          ? 'Monitoree la demanda para asegurar que el precio premium sea sostenible.'
          : 'Evalúe oportunidades de optimización de precios basado en valor agregado.'
      });
    }

    // 4. Análisis de Productividad
    const lastThreeMonths = operationalMetrics.slice(-3);
    if (lastThreeMonths.length >= 3) {
      const recentAvgProductivity = lastThreeMonths.reduce((sum, m) => {
        const prod = productionData.find(p => p.month === m.month);
        return sum + (prod ? prod.metrosProducidos : 0);
      }, 0) / 3;

      const firstHalfAvg = operationalMetrics.slice(0, Math.floor(operationalMetrics.length/2))
        .reduce((sum, m) => {
          const prod = productionData.find(p => p.month === m.month);
          return sum + (prod ? prod.metrosProducidos : 0);
        }, 0) / Math.floor(operationalMetrics.length/2);

      const productivityGrowth = firstHalfAvg > 0 ? ((recentAvgProductivity - firstHalfAvg) / firstHalfAvg) * 100 : 0;

      if (Math.abs(productivityGrowth) > 10) {
        insights.push({
          id: 'productivity-trend',
          type: productivityGrowth > 0 ? 'success' : 'warning',
          category: 'trends',
          title: productivityGrowth > 0 ? 'Crecimiento en Productividad' : 'Declive en Productividad',
          description: `La productividad ha ${productivityGrowth > 0 ? 'aumentado' : 'disminuido'} ${Math.abs(productivityGrowth).toFixed(1)}% en los últimos meses.`,
          value: `${productivityGrowth > 0 ? '+' : ''}${productivityGrowth.toFixed(1)}%`,
          change: productivityGrowth,
          icon: productivityGrowth > 0 ? TrendingUp : TrendingDown,
          priority: 'medium'
        });
      }
    }

    // 5. Recomendaciones Generales de Optimización
    const totalRevenue = financialData.yearly.ingresos;
    const totalCosts = financialData.yearly.costoVentasTotal;
    const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

    if (overallMargin > 0 && overallMargin < 20) {
      insights.push({
        id: 'optimization-opportunity',
        type: 'info',
        category: 'optimization',
        title: 'Oportunidad de Optimización',
        description: `Con un margen anual del ${overallMargin.toFixed(1)}%, existe potencial de mejora mediante optimización operativa.`,
        icon: Lightbulb,
        priority: 'low',
        recommendation: 'Implemente análisis de Pareto para identificar los 20% de actividades que generan el 80% de los costos.'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

  }, [financialData, productionData, operationalMetrics, selectedMonth]);

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'danger': return 'danger';
      case 'info': return 'accent';
      default: return 'primary';
    }
  };

  const getCategoryIcon = (category: Insight['category']) => {
    switch (category) {
      case 'efficiency': return Zap;
      case 'profitability': return DollarSign;
      case 'trends': return TrendingUp;
      case 'optimization': return Target;
      default: return Activity;
    }
  };

  if (insights.length === 0) {
    return (
      <div className="hologram-card p-8 rounded-2xl shadow-hologram text-center">
        <Info className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-muted">
          Datos insuficientes para generar insights operacionales
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-1 h-8 bg-gradient-to-b from-accent to-warning rounded-full" />
        <h3 className="text-2xl font-display font-bold text-accent">Insights Operacionales</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-accent/50 to-transparent" />
        <div className="text-sm text-text-muted font-mono">
          {insights.length} insights • {selectedMonth} {selectedYear}
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          const CategoryIcon = getCategoryIcon(insight.category);
          const color = getInsightColor(insight.type);
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`hologram-card p-6 rounded-xl border-2 border-${color}/30 bg-${color}/5 hover:shadow-glow-${color} transition-all duration-300 group`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${color}/20 border border-${color}/30 group-hover:shadow-glow-${color} transition-all duration-300`}>
                    <IconComponent className={`w-5 h-5 text-${color}`} />
                  </div>
                  <div>
                    <h4 className={`font-display font-bold text-${color} group-hover:text-glow transition-all duration-300`}>
                      {insight.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <CategoryIcon className="w-3 h-3 text-text-muted" />
                      <span className="text-xs text-text-muted capitalize font-mono">
                        {insight.category}
                      </span>
                    </div>
                  </div>
                </div>
                
                {insight.value && (
                  <div className="text-right">
                    <div className={`text-2xl font-mono font-bold text-${color}`}>
                      {insight.value}
                    </div>
                    {insight.change !== undefined && (
                      <div className={`text-xs font-mono flex items-center justify-end space-x-1 mt-1 ${
                        insight.change > 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {insight.change > 0 ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(insight.change).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-text-secondary leading-relaxed mb-4">
                {insight.description}
              </p>

              {/* Recommendation */}
              {insight.recommendation && (
                <div className={`p-3 rounded-lg bg-${color}/10 border border-${color}/20`}>
                  <div className="flex items-start space-x-2">
                    <Lightbulb className={`w-4 h-4 text-${color} mt-0.5 flex-shrink-0`} />
                    <p className="text-sm text-text-secondary leading-relaxed">
                      <span className={`font-semibold text-${color}`}>Recomendación:</span> {insight.recommendation}
                    </p>
                  </div>
                </div>
              )}

              {/* Priority Badge */}
              <div className="flex justify-end mt-4">
                <div className={`px-2 py-1 rounded-full text-xs font-mono font-bold ${{
                  high: 'bg-danger/20 text-danger border border-danger/30',
                  medium: 'bg-warning/20 text-warning border border-warning/30',
                  low: 'bg-success/20 text-success border border-success/30'
                }[insight.priority]}`}>
                  {insight.priority.toUpperCase()}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="hologram-card p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <h4 className="font-display font-bold text-primary">Resumen Ejecutivo</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 glass-card border border-border rounded-lg">
            <div className="text-2xl font-mono font-bold text-danger">
              {insights.filter(i => i.priority === 'high').length}
            </div>
            <div className="text-sm text-text-muted">Prioridad Alta</div>
          </div>
          <div className="p-3 glass-card border border-border rounded-lg">
            <div className="text-2xl font-mono font-bold text-warning">
              {insights.filter(i => i.priority === 'medium').length}
            </div>
            <div className="text-sm text-text-muted">Prioridad Media</div>
          </div>
          <div className="p-3 glass-card border border-border rounded-lg">
            <div className="text-2xl font-mono font-bold text-success">
              {insights.filter(i => i.type === 'success').length}
            </div>
            <div className="text-sm text-text-muted">Fortalezas</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OperationalInsights;
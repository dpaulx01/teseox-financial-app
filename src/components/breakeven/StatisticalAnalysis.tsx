import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Activity, Target, Settings, AlertTriangle, CheckCircle, Info, X, Shield, Zap, Eye } from 'lucide-react';
import { BreakEvenStatistics, MonthlyStatistics, StatisticalSummary } from '../../utils/statisticalAnalysis';
import { formatCurrency } from '../../utils/formatters';
import { BreakEvenAnalysisType, EnhancedBreakEvenStatistics, VolatilityProfile } from '../../types';

interface StatisticalAnalysisProps {
  statistics: BreakEvenStatistics | EnhancedBreakEvenStatistics;
  onClose?: () => void;
}

const StatCard: React.FC<{
  title: string;
  stat: StatisticalSummary;
  isMonetary?: boolean;
  color?: string;
}> = ({ title, stat, isMonetary = false, color = 'primary' }) => {
  const format = (value: number) => isMonetary ? formatCurrency(value) : value.toFixed(1);
  const coeffVariation = (stat.standardDeviation / (stat.mean || 1)) * 100;
  
  return (
    <div className={`glass-card p-4 rounded-lg border border-${color}/20`}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className={`w-4 h-4 text-${color}`} />
        <h4 className="text-sm font-display text-text-secondary uppercase tracking-wider">{title}</h4>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-text-dim">Promedio:</span>
          <span className={`text-sm font-mono text-${color}`}>{format(stat.mean)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-text-dim">Mediana:</span>
          <span className="text-sm font-mono text-text-secondary">{format(stat.median)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-text-dim">Rango:</span>
          <span className="text-xs font-mono text-text-muted">{format(stat.min)} - {format(stat.max)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-text-dim">Variabilidad:</span>
          <span className={`text-xs font-mono ${
            coeffVariation < 20 ? 'text-accent' : coeffVariation < 50 ? 'text-warning' : 'text-danger'
          }`}>
            {coeffVariation.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar perfil de volatilidad
const VolatilityProfileCard: React.FC<{
  title: string;
  analysis: any;
  color?: string;
}> = ({ title, analysis, color = 'primary' }) => {
  const getProfileColor = (profile: VolatilityProfile) => {
    switch (profile) {
      case 'stable': return 'accent';
      case 'moderate': return 'warning';
      case 'volatile': return 'danger';
      default: return 'primary';
    }
  };

  const getProfileIcon = (profile: VolatilityProfile) => {
    switch (profile) {
      case 'stable': return <Shield className="w-4 h-4" />;
      case 'moderate': return <Activity className="w-4 h-4" />;
      case 'volatile': return <Zap className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const profileColor = getProfileColor(analysis.profile);

  return (
    <div className={`glass-card p-4 rounded-lg border border-${profileColor}/20`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`text-${profileColor}`}>
          {getProfileIcon(analysis.profile)}
        </div>
        <h4 className="text-sm font-display text-text-secondary uppercase tracking-wider">{title}</h4>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-dim">Perfil:</span>
          <div className={`px-2 py-1 rounded text-xs font-bold text-${profileColor} bg-${profileColor}/10 border border-${profileColor}/20`}>
            {analysis.profile.toUpperCase()}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-text-dim">CV:</span>
          <span className={`text-sm font-mono text-${profileColor}`}>
            {(analysis.coefficientOfVariation * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-text-dim">Estabilidad:</span>
          <span className="text-sm font-mono text-text-secondary">
            {(analysis.stabilityScore * 100).toFixed(0)}%
          </span>
        </div>
        {analysis.trendDetected && (
          <div className="flex items-center gap-1 text-xs text-warning">
            <TrendingUp className="w-3 h-3" />
            <span>Tendencia detectada</span>
          </div>
        )}
        {analysis.seasonalityDetected && (
          <div className="flex items-center gap-1 text-xs text-info">
            <Activity className="w-3 h-3" />
            <span>Estacionalidad</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para mostrar outliers detectados
const OutlierAnalysisCard: React.FC<{
  outlierAnalysis: any;
}> = ({ outlierAnalysis }) => {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'include': return 'accent';
      case 'exclude': return 'warning';
      case 'investigate': return 'danger';
      default: return 'primary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'info';
      case 'moderate': return 'warning';
      case 'extreme': return 'danger';
      default: return 'primary';
    }
  };

  return (
    <div className="glass-card p-4 rounded-lg border border-warning/20">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-warning" />
        <h4 className="text-sm font-display text-text-secondary uppercase tracking-wider">Detección de Outliers</h4>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-xl font-mono text-warning">
              {outlierAnalysis.totalOutliers}
            </div>
            <div className="text-xs text-text-dim">Outliers Detectados</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-mono text-accent">
              {outlierAnalysis.cleanDatasetSize}
            </div>
            <div className="text-xs text-text-dim">Datos Limpios</div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-dim">Porcentaje:</span>
          <span className="text-sm font-mono text-warning">
            {outlierAnalysis.outlierPercentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-dim">Recomendación:</span>
          <div className={`px-2 py-1 rounded text-xs font-bold text-${getRecommendationColor(outlierAnalysis.recommendation)} bg-${getRecommendationColor(outlierAnalysis.recommendation)}/10 border border-${getRecommendationColor(outlierAnalysis.recommendation)}/20`}>
            {outlierAnalysis.recommendation.toUpperCase()}
          </div>
        </div>

        {outlierAnalysis.detectedOutliers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-xs text-text-dim mb-2">Outliers por Severidad:</div>
            <div className="space-y-1">
              {['extreme', 'moderate', 'mild'].map(severity => {
                const count = outlierAnalysis.detectedOutliers.filter((o: any) => o.severity === severity).length;
                if (count === 0) return null;
                return (
                  <div key={severity} className="flex justify-between text-xs">
                    <span className={`text-${getSeverityColor(severity)}`}>
                      {severity === 'extreme' ? 'Extremos' : severity === 'moderate' ? 'Moderados' : 'Leves'}:
                    </span>
                    <span className="font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AnalysisTypeStats: React.FC<{
  type: BreakEvenAnalysisType;
  data: BreakEvenStatistics['contable'];
  color: string;
}> = ({ type, data, color }) => {
  const typeNames = {
    contable: 'Contable',
    operativo: 'Operativo (EBIT)',
    caja: 'Caja (EBITDA)'
  };

  // Configuración de métricas por tipo de análisis
  const getMetricsForAnalysis = (analysisType: BreakEvenAnalysisType) => {
    switch (analysisType) {
      case 'contable':
        return [
          { key: 'puntoEquilibrio', title: 'Punto Equilibrio', isMonetary: true },
          { key: 'ingresos', title: 'Ingresos', isMonetary: true },
          { key: 'costosFijos', title: 'Costos Fijos', isMonetary: true },
          { key: 'costosVariables', title: 'Costos Variables', isMonetary: true },
          { key: 'margenContribucionPorc', title: 'Margen %', isMonetary: false },
          { key: 'utilidadNeta', title: 'Utilidad Neta', isMonetary: true },
          { key: 'depreciacion', title: 'Depreciación', isMonetary: true },
          { key: 'intereses', title: 'Intereses', isMonetary: true }
        ];
      
      case 'operativo':
        return [
          { key: 'puntoEquilibrio', title: 'Punto Equilibrio', isMonetary: true },
          { key: 'ingresos', title: 'Ingresos', isMonetary: true },
          { key: 'costosFijos', title: 'Costos Fijos Operativos', isMonetary: true },
          { key: 'costosVariables', title: 'Costos Variables', isMonetary: true },
          { key: 'margenContribucionPorc', title: 'Margen %', isMonetary: false },
          { key: 'ebit', title: 'EBIT', isMonetary: true },
          { key: 'depreciacion', title: 'Depreciación', isMonetary: true }
        ];
      
      case 'caja':
        return [
          { key: 'puntoEquilibrio', title: 'Punto Equilibrio', isMonetary: true },
          { key: 'ingresos', title: 'Ingresos', isMonetary: true },
          { key: 'costosFijos', title: 'Costos Fijos de Caja', isMonetary: true },
          { key: 'costosVariables', title: 'Costos Variables', isMonetary: true },
          { key: 'margenContribucionPorc', title: 'Margen %', isMonetary: false },
          { key: 'ebitda', title: 'EBITDA', isMonetary: true }
        ];
      
      default:
        return [];
    }
  };

  const metrics = getMetricsForAnalysis(type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}/20 border border-${color}/30`}>
          <Target className={`w-5 h-5 text-${color}`} />
        </div>
        <div>
          <h3 className={`text-lg font-display text-${color}`}>
            Análisis {typeNames[type]}
          </h3>
          <p className="text-xs text-text-dim">
            {type === 'contable' && 'Enfoque en rentabilidad neta y aspectos fiscales'}
            {type === 'operativo' && 'Enfoque en eficiencia operativa (antes de financiamiento)'}
            {type === 'caja' && 'Enfoque en flujo de caja y liquidez operativa'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <StatCard 
            key={metric.key}
            title={metric.title} 
            stat={data.summary[metric.key as keyof typeof data.summary]} 
            isMonetary={metric.isMonetary}
            color={color}
          />
        ))}
      </div>
    </div>
  );
};

// Componente para mostrar estrategia adaptativa
const AdaptiveStrategyPanel: React.FC<{
  strategy: any;
  diagnostics: any;
}> = ({ strategy, diagnostics }) => {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'accent';
      case 'medium': return 'warning';
      case 'low': return 'danger';
      default: return 'primary';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'accent';
      case 'good': return 'primary';
      case 'fair': return 'warning';
      case 'poor': return 'danger';
      default: return 'primary';
    }
  };

  const confidenceColor = getConfidenceColor(strategy.confidence);
  const qualityColor = getQualityColor(diagnostics.dataQuality);

  return (
    <div className={`hologram-card p-6 rounded-xl border-2 border-${confidenceColor}/30 bg-${confidenceColor}/5`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg bg-${confidenceColor}/20 border border-${confidenceColor}/30`}>
          <Settings className={`w-6 h-6 text-${confidenceColor}`} />
        </div>
        <div>
          <h3 className={`text-xl font-display text-${confidenceColor}`}>
            Estrategia Adaptativa IA
          </h3>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 text-${confidenceColor}`} />
              <span className={`text-sm font-mono text-${confidenceColor} uppercase tracking-wider`}>
                Confianza: {strategy.confidence}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 text-${qualityColor}`} />
              <span className={`text-sm font-mono text-${qualityColor} uppercase tracking-wider`}>
                Calidad: {diagnostics.dataQuality}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Estrategia Principal */}
        <div className="glass-card p-4 rounded-lg">
          <h4 className="text-lg font-display text-text-secondary mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {strategy.primary}
          </h4>
          <p className="text-text-muted leading-relaxed font-mono text-sm mb-3">
            {strategy.reasoning}
          </p>
          {strategy.secondary && (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-${confidenceColor}/20 border border-${confidenceColor}/30`}>
              <Activity className={`w-4 h-4 text-${confidenceColor}`} />
              <span className={`font-mono text-${confidenceColor} text-sm`}>
                Enfoque Secundario: {strategy.secondary}
              </span>
            </div>
          )}
        </div>

        {/* Acciones Recomendadas */}
        <div className="glass-card p-4 rounded-lg">
          <h4 className="text-lg font-display text-text-secondary mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-accent" />
            Acciones Prioritarias
          </h4>
          <div className="space-y-2">
            {strategy.actionableSteps.slice(0, 3).map((step: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-xs font-bold mt-0.5">
                  {index + 1}
                </div>
                <span className="text-sm text-text-muted">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Riesgos y Oportunidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Factores de Riesgo */}
          <div className="glass-card p-4 rounded-lg border border-danger/20">
            <h4 className="text-sm font-display text-danger mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Factores de Riesgo
            </h4>
            <div className="space-y-2">
              {strategy.riskFactors.slice(0, 2).map((risk: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-danger mt-2"></div>
                  <span className="text-xs text-text-muted">{risk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Oportunidades */}
          <div className="glass-card p-4 rounded-lg border border-accent/20">
            <h4 className="text-sm font-display text-accent mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Oportunidades
            </h4>
            <div className="space-y-2">
              {strategy.opportunities.slice(0, 2).map((opportunity: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent mt-2"></div>
                  <span className="text-xs text-text-muted">{opportunity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confiabilidad del Análisis */}
        <div className="glass-card p-4 rounded-lg border border-info/20">
          <h4 className="text-sm font-display text-info mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Confiabilidad del Análisis
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-dim">Confiabilidad</span>
                <span className="text-info">{(diagnostics.analysisReliability * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-glass rounded-full h-2">
                <div 
                  className="bg-info h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${diagnostics.analysisReliability * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecommendationPanel: React.FC<{
  recommendation: BreakEvenStatistics['recommendation'];
}> = ({ recommendation }) => {
  const confidenceColors = {
    high: 'accent',
    medium: 'warning',
    low: 'danger'
  };
  
  const confidenceIcons = {
    high: CheckCircle,
    medium: AlertTriangle,
    low: AlertTriangle
  };
  
  const ConfidenceIcon = confidenceIcons[recommendation.confidence];
  const color = confidenceColors[recommendation.confidence];

  return (
    <div className={`hologram-card p-6 rounded-xl border-2 border-${color}/30 bg-${color}/5`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg bg-${color}/20 border border-${color}/30`}>
          <Settings className={`w-6 h-6 text-${color}`} />
        </div>
        <div>
          <h3 className={`text-xl font-display text-${color}`}>
            Recomendación Estratégica IA
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceIcon className={`w-4 h-4 text-${color}`} />
            <span className={`text-sm font-mono text-${color} uppercase tracking-wider`}>
              Confianza: {recommendation.confidence}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Punto de Equilibrio Ideal */}
        <div className="glass-card p-4 rounded-lg">
          <h4 className="text-lg font-display text-text-secondary mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Punto de Equilibrio Ideal (Algoritmo Robusto)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-mono text-primary">
                {formatCurrency(recommendation.idealBreakEven.puntoEquilibrio)}
              </div>
              <div className="text-xs text-text-dim uppercase">P.E. Objetivo</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono text-accent">
                {formatCurrency(recommendation.monthlyTargets.ingresos)}
              </div>
              <div className="text-xs text-text-dim uppercase">Mediana Ingresos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono text-warning">
                {formatCurrency(recommendation.monthlyTargets.costosFijos)}
              </div>
              <div className="text-xs text-text-dim uppercase">Mediana C. Fijos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono text-danger">
                {(recommendation.idealBreakEven.margenContribucionPorc * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-text-dim uppercase">Mediana Margen %</div>
            </div>
          </div>
        </div>

        {/* Estrategia */}
        <div className="glass-card p-4 rounded-lg">
          <h4 className="text-lg font-display text-text-secondary mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Estrategia Recomendada
          </h4>
          <p className="text-text-muted leading-relaxed font-mono">
            {recommendation.strategy}
          </p>
        </div>

        {/* Análisis Recomendado */}
        <div className="glass-card p-4 rounded-lg">
          <h4 className="text-lg font-display text-text-secondary mb-2">
            📊 Análisis Más Estable Detectado
          </h4>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-${color}/20 border border-${color}/30`}>
            <Activity className={`w-4 h-4 text-${color}`} />
            <span className={`font-mono text-${color} uppercase tracking-wider`}>
              {recommendation.analysisType}
            </span>
          </div>
          <p className="text-xs text-text-dim mt-2">
            Este tipo de análisis mostró la menor variabilidad en sus resultados mensuales.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatisticalAnalysis: React.FC<StatisticalAnalysisProps> = ({ 
  statistics, 
  onClose 
}) => {
  const [selectedTab, setSelectedTab] = useState<BreakEvenAnalysisType>('contable');

  // Detectar si es análisis enhanced (con las nuevas funcionalidades)
  const isEnhanced = 'volatilityProfile' in statistics;
  const enhancedStats = isEnhanced ? statistics as EnhancedBreakEvenStatistics : null;

  const analysisConfig = {
    contable: { color: 'primary', name: 'Contable' },
    operativo: { color: 'accent', name: 'Operativo' },
    caja: { color: 'warning', name: 'Caja' }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 15 }}
        className="bg-dark-card/95 backdrop-blur-md rounded-2xl border-2 border-primary/50 max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl my-4"
      >
        {/* Header */}
        <div className="sticky top-0 bg-dark-card/95 backdrop-blur-md p-6 border-b border-border z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-display text-primary text-glow">
                  Análisis Estadístico Mensual
                </h1>
                <p className="text-text-muted font-mono">
                  Punto de Equilibrio Ideal basado en Promedios y Medianas
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-glass transition-colors"
              >
                <X className="w-6 h-6 text-text-muted" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Recomendación Principal o Estrategia Adaptativa */}
          {isEnhanced && enhancedStats ? (
            <AdaptiveStrategyPanel 
              strategy={enhancedStats.adaptiveStrategy} 
              diagnostics={enhancedStats.diagnostics}
            />
          ) : (
            <RecommendationPanel recommendation={statistics.recommendation} />
          )}

          {/* Nuevas funcionalidades: Análisis de Volatilidad y Outliers */}
          {isEnhanced && enhancedStats && (
            <>
              {/* Perfil de Volatilidad */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display text-primary">
                    📊 Perfil de Volatilidad por Métrica
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <VolatilityProfileCard 
                    title="Ingresos" 
                    analysis={enhancedStats.volatilityProfile.ingresos}
                  />
                  <VolatilityProfileCard 
                    title="Costos Fijos" 
                    analysis={enhancedStats.volatilityProfile.costosFijos}
                  />
                  <VolatilityProfileCard 
                    title="Costos Variables" 
                    analysis={enhancedStats.volatilityProfile.costosVariables}
                  />
                  <VolatilityProfileCard 
                    title="Margen Contribución" 
                    analysis={enhancedStats.volatilityProfile.margenContribucion}
                  />
                </div>

                {/* Perfil General */}
                <div className="glass-card p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-display text-primary">Perfil General de la Empresa</h3>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-${
                      enhancedStats.volatilityProfile.overall === 'stable' ? 'accent' :
                      enhancedStats.volatilityProfile.overall === 'moderate' ? 'warning' : 'danger'
                    } bg-${
                      enhancedStats.volatilityProfile.overall === 'stable' ? 'accent' :
                      enhancedStats.volatilityProfile.overall === 'moderate' ? 'warning' : 'danger'
                    }/10 border border-${
                      enhancedStats.volatilityProfile.overall === 'stable' ? 'accent' :
                      enhancedStats.volatilityProfile.overall === 'moderate' ? 'warning' : 'danger'
                    }/20`}>
                      {enhancedStats.volatilityProfile.overall.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Análisis de Outliers */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
                    <Eye className="w-6 h-6 text-warning" />
                  </div>
                  <h2 className="text-2xl font-display text-warning">
                    ⚠️ Análisis de Datos Atípicos
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <OutlierAnalysisCard outlierAnalysis={enhancedStats.outlierAnalysis} />
                  </div>
                  
                  {/* Lista detallada de outliers (si existen) */}
                  {enhancedStats.outlierAnalysis.detectedOutliers.length > 0 && (
                    <div className="lg:col-span-2">
                      <div className="glass-card p-4 rounded-lg border border-warning/20">
                        <h4 className="text-lg font-display text-warning mb-3">Datos Atípicos Detectados</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {enhancedStats.outlierAnalysis.detectedOutliers.slice(0, 8).map((outlier: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-glass rounded border border-border/50">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full bg-${
                                  outlier.severity === 'extreme' ? 'danger' :
                                  outlier.severity === 'moderate' ? 'warning' : 'info'
                                }`}></div>
                                <span className="text-sm font-mono">{outlier.month}</span>
                                <span className="text-xs text-text-dim">{outlier.metric}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-mono">{formatCurrency(outlier.value)}</div>
                                <div className="text-xs text-text-dim">
                                  {(outlier.deviation * 100).toFixed(0)}% desviación
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tabs para tipos de análisis */}
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {Object.entries(analysisConfig).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedTab(type as BreakEvenAnalysisType)}
                  className={`px-4 py-2 rounded-lg font-display transition-all duration-300 ${
                    selectedTab === type
                      ? `bg-${config.color}/20 border-2 border-${config.color}/50 text-${config.color}`
                      : 'bg-glass border border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>

            {/* Contenido del tab seleccionado */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AnalysisTypeStats
                  type={selectedTab}
                  data={statistics[selectedTab]}
                  color={analysisConfig[selectedTab].color}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Información adicional */}
          <div className="glass-card p-6 rounded-lg border border-info/30">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-info" />
              <h3 className="text-lg font-display text-info">Cómo Interpretar</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-muted">
              <div>
                <h4 className="text-text-secondary font-display mb-2">📊 Métricas Estadísticas:</h4>
                <ul className="space-y-1 text-xs">
                  <li><strong>Promedio:</strong> Valor medio de todos los meses</li>
                  <li><strong>Mediana:</strong> Valor central (más robusto que el promedio)</li>
                  <li><strong>Variabilidad:</strong> Qué tan consistente es el comportamiento</li>
                </ul>
              </div>
              <div>
                <h4 className="text-text-secondary font-display mb-2">🎯 Algoritmo P.E. Ideal:</h4>
                <ul className="space-y-1 text-xs">
                  <li><strong>Método Base:</strong> Mediana(Costos Fijos) ÷ Mediana(Margen %)</li>
                  <li><strong>Optimización:</strong> Promedio ponderado por estabilidad mensual</li>
                  <li><strong>Selección:</strong> Automática según nivel de confianza de datos</li>
                  <li><strong>Robustez:</strong> Reduce impacto de outliers y meses atípicos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StatisticalAnalysis;
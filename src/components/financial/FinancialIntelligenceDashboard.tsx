import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  DollarSign,
  PieChart,
  LineChart,
  Zap,
  Shield,
  Award,
  Clock,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Eye,
  Download,
  Filter,
  RefreshCw,
  HelpCircle
 } from 'lucide-react';
import { MonthlyData } from '../../types';
import { intelligentFinancialAnalysis, AnalysisResult } from '../../utils/financialIntelligenceEngine';
import { formatCurrency } from '../../utils/formatters';
import CalculationMethodologyModal from './CalculationMethodologyModal';

interface FinancialIntelligenceDashboardProps {
  data: MonthlyData[];
  className?: string;
}

const FinancialIntelligenceDashboard: React.FC<FinancialIntelligenceDashboardProps> = ({ 
  data, 
  className = '' 
}) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'ingresos' | 'ebitda' | 'utilidad'>('ebitda');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Ejecutar análisis inteligente
  useEffect(() => {
    if (data.length > 0) {
      const result = intelligentFinancialAnalysis(data);
      setAnalysis(result);
    }
  }, [data]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (data.length > 0) {
        const result = intelligentFinancialAnalysis(data);
        setAnalysis(result);
      }
      setIsRefreshing(false);
    }, 1000);
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <Award className="w-5 h-5 text-green-500" />;
      case 'good': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'concerning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'border-green-500/30 bg-green-500/10';
      case 'good': return 'border-blue-500/30 bg-blue-500/10';
      case 'concerning': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'critical': return 'border-red-500/30 bg-red-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!analysis) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-text-muted">Analizando datos financieros...</span>
      </div>
    );
  }

  return (
    <motion.div 
      className={`space-y-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header Ejecutivo */}
      <div className="hologram-card p-6 rounded-2xl shadow-hologram border-2 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display text-primary text-glow">
                Centro de Inteligencia Financiera
              </h1>
              <p className="text-text-muted font-mono text-sm">
                Análisis Avanzado • {analysis.algorithm} • Confianza: {analysis.confidence}%
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="cyber-button-sm flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button className="cyber-button-sm flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <button 
              onClick={() => setShowMethodologyModal(true)}
              className="cyber-button-sm flex items-center space-x-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Cómo se Calcula</span>
            </button>
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div 
            className={`glass-card p-4 rounded-lg border-2 ${getHealthColor(analysis.financialHealth)}`}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getHealthIcon(analysis.financialHealth)}
                <span className="text-sm font-display text-text-muted">Salud Financiera</span>
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-primary capitalize">
              {analysis.financialHealth}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Evaluación integral del desempeño
            </div>
          </motion.div>

          <motion.div 
            className="glass-card p-4 rounded-lg border border-border hover:shadow-glow-sm transition-all"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getTrendIcon(analysis.trend)}
                <span className="text-sm font-display text-text-muted">Tendencia</span>
              </div>
              <div className={`text-xs font-mono ${getConfidenceColor(analysis.confidence)}`}>
                {analysis.confidence}%
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-accent">
              {analysis.trend > 0 ? '+' : ''}{analysis.trend.toFixed(1)}%
            </div>
            <div className="text-xs text-text-muted mt-1">
              Tendencia mensual promedio
            </div>
          </motion.div>

          <motion.div 
            className="glass-card p-4 rounded-lg border border-border hover:shadow-glow-sm transition-all"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-display text-text-muted">Volatilidad</span>
              </div>
              <div className="text-xs font-mono text-text-muted">
                {analysis.dataQuality.volatility}
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-primary">
              {analysis.volatility.toFixed(1)}%
            </div>
            <div className="text-xs text-text-muted mt-1">
              Riesgo operativo medido
            </div>
          </motion.div>

          <motion.div 
            className="glass-card p-4 rounded-lg border border-border hover:shadow-glow-sm transition-all"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-warning" />
                <span className="text-sm font-display text-text-muted">Proyección</span>
              </div>
              <div className="text-xs font-mono text-text-muted">
                Julio 2025
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-warning">
              {formatCurrency(analysis.projection)}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Proyección siguiente período
            </div>
          </motion.div>
        </div>
      </div>

      {/* Panel de Análisis Detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights Clave */}
        <div className="hologram-card p-6 rounded-2xl shadow-hologram">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-xl font-display text-primary">Insights Clave</h3>
          </div>
          
          <div className="space-y-3">
            {analysis.keyInsights.length > 0 ? (
              analysis.keyInsights.map((insight, index) => (
                <motion.div 
                  key={index}
                  className="flex items-start space-x-3 p-3 glass-card border border-blue-500/20 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <p className="text-sm text-text-secondary font-mono leading-relaxed">
                    {insight}
                  </p>
                </motion.div>
              ))
            ) : (
              <p className="text-text-muted text-sm font-mono">
                No hay insights específicos para mostrar con los datos actuales.
              </p>
            )}
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="hologram-card p-6 rounded-2xl shadow-hologram">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-xl font-display text-primary">Recomendaciones</h3>
          </div>
          
          <div className="space-y-3">
            {analysis.recommendations.length > 0 ? (
              analysis.recommendations.map((recommendation, index) => (
                <motion.div 
                  key={index}
                  className="flex items-start space-x-3 p-3 glass-card border border-green-500/20 rounded-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ArrowRight className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-sm text-text-secondary font-mono leading-relaxed">
                    {recommendation}
                  </p>
                </motion.div>
              ))
            ) : (
              <p className="text-text-muted text-sm font-mono">
                No hay recomendaciones específicas en este momento.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alertas y Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="hologram-card p-6 rounded-2xl shadow-hologram border border-yellow-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="text-xl font-display text-yellow-500">Alertas del Sistema</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.warnings.map((warning, index) => (
              <motion.div 
                key={index}
                className="flex items-start space-x-3 p-4 glass-card border border-yellow-500/30 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm text-text-secondary font-mono leading-relaxed">
                    {warning}
                  </p>
                  <div className="mt-2 text-xs text-text-muted">
                    Requiere atención • Prioridad: Alta
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de Métricas Avanzadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          className="glass-card p-6 border border-border rounded-lg hover:shadow-glow-sm transition-all"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-accent" />
              <h4 className="font-display text-accent">Eficiencia</h4>
            </div>
            <div className="text-2xl font-mono font-bold text-accent">
              {analysis.efficiency.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-dark-card rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(analysis.efficiency, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Eficiencia operativa calculada
          </p>
        </motion.div>

        <motion.div 
          className="glass-card p-6 border border-border rounded-lg hover:shadow-glow-sm transition-all"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h4 className="font-display text-primary">Rentabilidad</h4>
            </div>
            <div className="text-2xl font-mono font-bold text-primary">
              {analysis.profitability.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-dark-card rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(Math.max(analysis.profitability, 0), 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Rentabilidad promedio del período
          </p>
        </motion.div>

        <motion.div 
          className="glass-card p-6 border border-border rounded-lg hover:shadow-glow-sm transition-all"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-warning" />
              <h4 className="font-display text-warning">Sostenibilidad</h4>
            </div>
            <div className="text-2xl font-mono font-bold text-warning">
              {analysis.sustainability.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-dark-card rounded-full h-2">
            <div 
              className="bg-warning h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(analysis.sustainability, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Sostenibilidad financiera proyectada
          </p>
        </motion.div>
      </div>

      {/* Metodología y Explicación */}
      <div className="glass-card p-6 border border-border rounded-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-lg font-display text-primary">Metodología Aplicada</h3>
        </div>
        
        <div className="bg-dark-card p-4 rounded-lg border border-border">
          <p className="text-sm text-text-secondary font-mono leading-relaxed mb-3">
            {analysis.explanation}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-muted">
            <div>
              <span className="font-semibold text-text-secondary">Características:</span>
              <ul className="mt-1 space-y-1">
                <li>• Muestra: {analysis.dataQuality.sampleSize} períodos</li>
                <li>• Volatilidad: {analysis.dataQuality.volatility}</li>
                <li>• Tendencia: {analysis.dataQuality.trend}</li>
                <li>• Tipo de negocio: {analysis.dataQuality.businessType}</li>
              </ul>
            </div>
            <div>
              <span className="font-semibold text-text-secondary">Calidad de datos:</span>
              <ul className="mt-1 space-y-1">
                <li>• Calidad: {analysis.dataQuality.dataQuality}</li>
                <li>• Outliers: {analysis.dataQuality.hasOutliers ? 'Detectados' : 'No detectados'}</li>
                <li>• Estacionalidad: {analysis.dataQuality.seasonality ? 'Presente' : 'Ausente'}</li>
                <li>• Etapa: {analysis.dataQuality.growthStage}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Metodología */}
      <CalculationMethodologyModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
      />
    </motion.div>
  );
};

export default FinancialIntelligenceDashboard;
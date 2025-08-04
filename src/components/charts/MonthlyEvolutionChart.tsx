import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartConfiguration,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatters';
import { intelligentAnalysis, AnalysisResult } from '../../utils/intelligentAnalysis';
import { intelligentFinancialAnalysis } from '../../utils/financialIntelligenceEngine';
import FinancialIntelligenceDashboard from '../financial/FinancialIntelligenceDashboard';
import { TrendingUp, TrendingDown, Activity, BarChart3, DollarSign, Factory, Percent, Settings, AlertTriangle, CheckCircle, Info  } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyData {
  month: string;
  ingresos: number;
  ebitda: number;
  utilidadNeta: number;
  costoVentasTotal: number;
  margenEbitda: number;
}

interface MonthlyEvolutionChartProps {
  data: MonthlyData[];
  className?: string;
}

export const MonthlyEvolutionChart: React.FC<MonthlyEvolutionChartProps> = ({ 
  data, 
  className = '' 
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [activeChart, setActiveChart] = useState<'financial' | 'margins'>('financial');
  const [analysisMode, setAnalysisMode] = useState<'traditional' | 'intelligent'>('intelligent');
  
  // Validar si hay datos suficientes para mostrar márgenes
  const hasValidMarginData = data.length > 0 && data.some(d => 
    d.ingresos > 0 && (d.costoVentasTotal > 0 || d.ebitda !== 0 || d.utilidadNeta !== 0)
  );
  
  // Forzar vista financiera si no hay datos para márgenes
  useEffect(() => {
    if (!hasValidMarginData && activeChart === 'margins') {
      setActiveChart('financial');
    }
  }, [hasValidMarginData, activeChart]);

  // ANÁLISIS INTELIGENTE ADAPTATATIVO
  // Reemplaza el algoritmo simple por un sistema que selecciona automáticamente
  // el mejor método de análisis según las características de los datos

  // ANÁLISIS UNIFICADO - USAR EL MISMO MOTOR EN AMBOS MODOS
  const unifiedAnalysis = intelligentFinancialAnalysis(data);
  
  // Calcular métricas específicas para cada indicador financiero
  const ingresos = data.map(d => d.ingresos);
  const ebitda = data.map(d => d.ebitda);
  const utilidadNeta = data.map(d => d.utilidadNeta);
  
  // Función para calcular tendencia específica por métrica - SIN LIMITACIONES ARTIFICIALES
  const calculateSpecificTrend = (values: number[]) => {
    const timePoints = values.map((_, i) => i);
    const n = values.length;
    const sumX = timePoints.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = timePoints.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = timePoints.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;
    const trendPercent = Math.abs(avgValue) > 0.01 ? (slope / Math.abs(avgValue)) * 100 : 0;
    // Devolver el valor real sin limitaciones artificiales
    return !isNaN(trendPercent) && isFinite(trendPercent) ? trendPercent : 0;
  };
  
  // Función para calcular crecimiento mensual específico - SIN LIMITACIONES ARTIFICIALES
  const calculateSpecificMonthlyGrowth = (values: number[]) => {
    let totalGrowth = 0;
    let validGrowths = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i-1]) > 0.01) {
        const growth = ((values[i] - values[i-1]) / Math.abs(values[i-1])) * 100;
        // Solo validar que no sea infinito o NaN
        if (!isNaN(growth) && isFinite(growth)) {
          totalGrowth += growth;
          validGrowths++;
        }
      }
    }
    return validGrowths > 0 ? totalGrowth / validGrowths : 0;
  };
  
  // Análisis específico por métrica manteniendo la consistencia del algoritmo principal
  const ingresosAnalysis = {
    algorithm: unifiedAnalysis.algorithm,
    confidence: unifiedAnalysis.confidence,
    trend: calculateSpecificTrend(ingresos),
    monthlyGrowth: calculateSpecificMonthlyGrowth(ingresos),
    volatility: unifiedAnalysis.volatility,
    projection: unifiedAnalysis.projection,
    explanation: unifiedAnalysis.explanation,
    warnings: unifiedAnalysis.warnings,
    dataQuality: unifiedAnalysis.dataQuality
  };
  
  const ebitdaAnalysis = {
    algorithm: unifiedAnalysis.algorithm,
    confidence: unifiedAnalysis.confidence,
    trend: calculateSpecificTrend(ebitda.map(v => Math.abs(v))), // Usar valores absolutos para EBITDA
    monthlyGrowth: calculateSpecificMonthlyGrowth(ebitda),
    volatility: unifiedAnalysis.volatility,
    projection: unifiedAnalysis.projection,
    explanation: unifiedAnalysis.explanation,
    warnings: unifiedAnalysis.warnings,
    dataQuality: unifiedAnalysis.dataQuality
  };
  
  const utilidadAnalysis = {
    algorithm: unifiedAnalysis.algorithm,
    confidence: unifiedAnalysis.confidence,
    trend: calculateSpecificTrend(utilidadNeta),
    monthlyGrowth: calculateSpecificMonthlyGrowth(utilidadNeta),
    volatility: unifiedAnalysis.volatility,
    projection: unifiedAnalysis.projection,
    explanation: unifiedAnalysis.explanation,
    warnings: unifiedAnalysis.warnings,
    dataQuality: unifiedAnalysis.dataQuality
  };

  // Chart data for financial metrics (currency)
  const financialChartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Ingresos',
        data: data.map(d => d.ingresos),
        borderColor: '#00FF99',
        backgroundColor: 'rgba(0, 255, 153, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#00FF99',
        pointBorderColor: '#00FF99',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'EBITDA',
        data: data.map(d => d.ebitda),
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#00F0FF',
        pointBorderColor: '#00F0FF',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Utilidad Neta',
        data: data.map(d => d.utilidadNeta),
        borderColor: '#FFB800',
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#FFB800',
        pointBorderColor: '#FFB800',
        pointBorderWidth: 2,
        fill: false,
        tension: 0.4,
      }
    ]
  };

  // Chart data for margins (percentages) - MÚLTIPLES MÉTRICAS DE MARGEN
  const marginsChartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Margen EBITDA (%)',
        data: data.map(d => d.margenEbitda),
        borderColor: '#FF0080',
        backgroundColor: 'rgba(255, 0, 128, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#FF0080',
        pointBorderColor: '#FF0080',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Margen Bruto (%)',
        data: data.map(d => d.ingresos > 0 ? ((d.ingresos - (d.costoVentasTotal || 0)) / d.ingresos) * 100 : 0),
        borderColor: '#00FF99',
        backgroundColor: 'rgba(0, 255, 153, 0.1)',
        borderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#00FF99',
        pointBorderColor: '#00FF99',
        pointBorderWidth: 2,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'Margen Neto (%)',
        data: data.map(d => d.ingresos > 0 ? (d.utilidadNeta / d.ingresos) * 100 : 0),
        borderColor: '#FFB800',
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderWidth: 2,
        borderDash: [5, 3],
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#FFB800',
        pointBorderColor: '#FFB800',
        pointBorderWidth: 2,
        fill: false,
        tension: 0.4,
      }
    ]
  };

  const chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 20
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#E0E7FF',
          font: {
            family: 'Orbitron',
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 37, 0.95)',
        titleColor: '#00F0FF',
        bodyColor: '#E0E7FF',
        borderColor: 'rgba(0, 240, 255, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            return `📊 ${context[0].label}`;
          },
          label: (context) => {
            const value = context.parsed.y;
            const label = context.dataset.label;
            
            if (label?.includes('%')) {
              return `${label}: ${value.toFixed(1)}%`;
            } else {
              return `${label}: ${formatCurrency(value)}`;
            }
          },
          footer: (context) => {
            const monthData = data[context[0].dataIndex];
            return [
              '',
              `💰 Total del mes: ${formatCurrency(monthData?.ingresos || 0)}`,
              `📈 EBITDA: ${formatCurrency(monthData?.ebitda || 0)}`,
              `📊 Margen: ${(monthData?.margenEbitda || 0).toFixed(1)}%`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 240, 255, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#8B9DC3',
          font: {
            family: 'Orbitron',
            size: 11
          }
        },
        border: {
          color: 'rgba(0, 240, 255, 0.3)'
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#8B9DC3',
          font: {
            family: 'Roboto Mono',
            size: 10
          },
          callback: (value) => {
            if (activeChart === 'margins') {
              return `${value}%`;
            } else {
              return `$${(value as number / 1000).toFixed(0)}k`;
            }
          }
        },
        border: {
          color: 'rgba(0, 240, 255, 0.3)'
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    onHover: (event, elements) => {
      if (chartRef.current?.canvas) {
        chartRef.current.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  const TrendIndicator: React.FC<{ 
    label: string; 
    value: number; 
    icon: React.ReactNode;
    color: string;
    analysis?: AnalysisResult;
  }> = ({ label, value, icon, color, analysis }) => (
    <motion.div 
      className="glass-card p-4 rounded-lg border border-border hover:shadow-glow-sm transition-all duration-300"
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${color} text-primary`}>
            {icon}
          </div>
          <div>
            <p className="text-xs font-display text-text-muted uppercase tracking-wider">
              {label}
            </p>
            <div className="flex items-center space-x-1">
              <p className={`text-sm font-mono font-bold ${
                value >= 0 ? 'text-accent' : 'text-danger'
              }`}>
                {value >= 0 ? '+' : ''}{value.toFixed(1)}%
              </p>
              {analysis && (
                <div className={`w-2 h-2 rounded-full ${
                  analysis.confidence >= 80 ? 'bg-green-500' :
                  analysis.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} title={`Confianza: ${analysis.confidence}%`} />
              )}
            </div>
          </div>
        </div>
        <div className={`text-2xl ${value >= 0 ? 'text-accent' : 'text-danger'}`}>
          {value >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      className={`hologram-card p-6 rounded-2xl shadow-hologram hover:shadow-glow-xl transition-all duration-500 relative overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 animate-hologram" />
      
      {/* Scan line effect */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          repeatDelay: 3,
          ease: "linear" 
        }}
      />
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <h3 className="text-2xl font-display text-primary text-glow">
            Evolución Mensual Financiera
          </h3>
          
          <div className="flex items-center space-x-4">
            {/* Analysis Mode Selector */}
            <div className="glass-card p-1 rounded-lg flex border border-border shadow-inner-glow">
              <button 
                onClick={() => setAnalysisMode('intelligent')} 
                className={`px-3 py-2 rounded-md text-sm font-display font-semibold transition-all duration-300 flex items-center space-x-2
                  ${analysisMode === 'intelligent' ? 'bg-primary text-dark-bg shadow-glow-md' : 'text-text-secondary hover:bg-glass hover:text-primary'}
                `}
              >
                <Settings className="w-4 h-4" />
                <span>Inteligente</span>
              </button>
              <button 
                onClick={() => setAnalysisMode('traditional')} 
                className={`px-3 py-2 rounded-md text-sm font-display font-semibold transition-all duration-300 flex items-center space-x-2
                  ${analysisMode === 'traditional' ? 'bg-primary text-dark-bg shadow-glow-md' : 'text-text-secondary hover:bg-glass hover:text-primary'}
                `}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Tradicional</span>
              </button>
            </div>
            
          </div>
        </div>

        {/* Renderizado Condicional del Análisis */}
        {analysisMode === 'intelligent' ? (
          <FinancialIntelligenceDashboard data={data} className="mb-6" />
        ) : (
          <div className="space-y-6 mb-6">
          {/* Sistema de Algoritmos Inteligentes */}
          <div className="glass-card p-4 border border-primary/30 rounded-lg mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <Settings className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-display text-primary">Sistema de Análisis Financiero Inteligente</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-text-muted">Algoritmo Seleccionado:</span>
                <p className="font-mono text-accent">{unifiedAnalysis.algorithm}</p>
                <p className="text-text-muted">Confianza: {unifiedAnalysis.confidence}%</p>
              </div>
              <div>
                <span className="text-text-muted">Volatilidad:</span>
                <p className="font-mono text-primary">{unifiedAnalysis.volatility.toFixed(1)}%</p>
                <p className="text-text-muted">Nivel: {unifiedAnalysis.dataQuality.volatility}</p>
              </div>
              <div>
                <span className="text-text-muted">Proyección:</span>
                <p className="font-mono text-warning">{formatCurrency(unifiedAnalysis.projection)}</p>
                <p className="text-text-muted">Próximo período</p>
              </div>
            </div>
          </div>

          {/* Indicadores de Tendencia */}
          <div>
            <h4 className="text-lg font-display text-primary mb-3">Análisis de Tendencias Financieras</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TrendIndicator
                label="Ingresos - Tendencia"
                value={ingresosAnalysis.trend}
                icon={<TrendingUp className="w-4 h-4" />}
                color="bg-accent/20 border border-accent/30"
                analysis={ingresosAnalysis}
              />
              <TrendIndicator
                label="EBITDA - Tendencia"
                value={ebitdaAnalysis.trend}
                icon={<Activity className="w-4 h-4" />}
                color="bg-primary/20 border border-primary/30"
                analysis={ebitdaAnalysis}
              />
              <TrendIndicator
                label="Utilidad - Tendencia"
                value={utilidadAnalysis.trend}
                icon={<TrendingUp className="w-4 h-4" />}
                color="bg-warning/20 border border-warning/30"
                analysis={utilidadAnalysis}
              />
            </div>
          </div>
          
          {/* Indicadores de Crecimiento Mensual */}
          <div>
            <h4 className="text-lg font-display text-primary mb-3">Análisis de Crecimiento Mes/Mes</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TrendIndicator
                label="Ingresos - Mes/Mes"
                value={ingresosAnalysis.monthlyGrowth}
                icon={<DollarSign className="w-4 h-4" />}
                color="bg-green-500/20 border border-green-500/30"
                analysis={ingresosAnalysis}
              />
              <TrendIndicator
                label="EBITDA - Mes/Mes"
                value={ebitdaAnalysis.monthlyGrowth}
                icon={<Activity className="w-4 h-4" />}
                color="bg-blue-500/20 border border-blue-500/30"
                analysis={ebitdaAnalysis}
              />
              <TrendIndicator
                label="Utilidad - Mes/Mes"
                value={utilidadAnalysis.monthlyGrowth}
                icon={<Percent className="w-4 h-4" />}
                color="bg-purple-500/20 border border-purple-500/30"
                analysis={utilidadAnalysis}
              />
            </div>
          </div>
          
          {/* Indicadores de Riesgo y Proyección */}
          <div>
            <h4 className="text-lg font-display text-primary mb-3">Análisis de Riesgo y Proyección</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-4 border border-orange-500/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-mono text-orange-500 mb-2">
                    {unifiedAnalysis.volatility.toFixed(1)}%
                  </div>
                  <div className="text-sm text-text-muted">Volatilidad del Negocio</div>
                  <div className="text-xs text-text-muted mt-1">
                    {unifiedAnalysis.dataQuality.volatility === 'low' ? 'Estable' :
                     unifiedAnalysis.dataQuality.volatility === 'medium' ? 'Moderado' : 
                     unifiedAnalysis.dataQuality.volatility === 'high' ? 'Alto' : 'Extremo'}
                  </div>
                </div>
              </div>
              
              <div className="glass-card p-4 border border-cyan-500/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-mono text-cyan-500 mb-2">
                    {formatCurrency(unifiedAnalysis.projection)}
                  </div>
                  <div className="text-sm text-text-muted">Proyección Julio</div>
                  <div className="text-xs text-text-muted mt-1">
                    Confianza: {unifiedAnalysis.confidence}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sistema de Alertas y Warnings Inteligentes */}
          {unifiedAnalysis.warnings.length > 0 && (
            <div className="glass-card p-4 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h4 className="text-lg font-display text-yellow-500">Alertas del Sistema</h4>
              </div>
              <div className="space-y-2 text-sm">
                {unifiedAnalysis.warnings.map((warning, index) => (
                  <div key={`warning-${index}`} className="flex items-start space-x-2">
                    <span className="text-warning font-semibold">Sistema:</span>
                    <span className="text-text-muted">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explicaciones de los Algoritmos */}
          <div className="glass-card p-4 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-5 h-5 text-blue-500" />
              <h4 className="text-lg font-display text-blue-500">Metodología de Análisis Aplicada</h4>
            </div>
            <div className="space-y-3 text-xs text-text-muted">
              <div>
                <span className="text-primary font-semibold">Metodología: </span>
                {unifiedAnalysis.explanation}
              </div>
              <div>
                <span className="text-accent font-semibold">Algoritmo: </span>
                {unifiedAnalysis.algorithm}
              </div>
              <div>
                <span className="text-warning font-semibold">Confianza: </span>
                {unifiedAnalysis.confidence}% - Basado en calidad de datos y características detectadas
              </div>
            </div>
          </div>
        </div>
        )}
        
        {/* Gráfico - Solo mostrar en modo tradicional */}
        {analysisMode === 'traditional' && (
          <div className="space-y-4">
            {/* Controles del Gráfico */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <h4 className="text-lg font-display text-primary">Visualización de Datos</h4>
                <span className="text-sm text-text-muted font-mono">
                  {data.length} períodos • {activeChart === 'financial' ? 'Valores monetarios' : 'Porcentajes'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Chart Type Selector */}
                {hasValidMarginData && (
                  <div className="glass-card p-1 rounded-lg flex border border-border shadow-inner-glow">
                    <button 
                      onClick={() => setActiveChart('financial')} 
                      className={`px-3 py-2 rounded-md text-sm font-display font-semibold transition-all duration-300 flex items-center space-x-2
                        ${activeChart === 'financial' ? 'bg-primary text-dark-bg shadow-glow-md' : 'text-text-secondary hover:bg-glass hover:text-primary'}
                      `}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Valores $</span>
                    </button>
                    <button 
                      onClick={() => setActiveChart('margins')} 
                      className={`px-3 py-2 rounded-md text-sm font-display font-semibold transition-all duration-300 flex items-center space-x-2
                        ${activeChart === 'margins' ? 'bg-primary text-dark-bg shadow-glow-md' : 'text-text-secondary hover:bg-glass hover:text-primary'}
                      `}
                    >
                      <Percent className="w-4 h-4" />
                      <span>Márgenes %</span>
                    </button>
                  </div>
                )}
                
                {/* Mensaje cuando no hay datos para márgenes */}
                {!hasValidMarginData && (
                  <div className="glass-card p-2 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center space-x-2 text-yellow-500">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs">Solo valores monetarios</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Gráfico */}
            <div className="h-96 relative glass-card p-4 border border-border rounded-lg">
              <Line 
                ref={chartRef}
                data={activeChart === 'financial' ? financialChartData : marginsChartData}
                options={chartOptions}
              />
            </div>
          </div>
        )}

        {/* Chart Info - Solo mostrar en modo tradicional */}
        {analysisMode === 'traditional' && (
          <div className="mt-4 p-4 glass-card border border-border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-display text-primary mb-2">
                📊 Información del Gráfico
              </h4>
              <p className="text-xs text-text-muted font-mono">
                {activeChart === 'financial' 
                  ? 'Evolución en valores monetarios: Ingresos (ventas totales), EBITDA (rentabilidad operativa) y Utilidad Neta (ganancia final). Ideal para medir crecimiento absoluto.'
                  : hasValidMarginData 
                    ? 'Tres métricas de rentabilidad: Margen EBITDA (eficiencia operativa), Margen Bruto (después de costos directos) y Margen Neto (rentabilidad final).'
                    : 'Vista de márgenes no disponible - se requieren datos de costos de ventas para calcular márgenes precisos.'
                }
              </p>
            </div>
            <div>
              <h4 className="text-sm font-display text-primary mb-2">
                🎯 Análisis Rápido
              </h4>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Mejor mes (Ingresos):</span>
                  <span className="text-accent">
                    {data.reduce((max, current) => current.ingresos > max.ingresos ? current : max).month}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Mejor EBITDA:</span>
                  <span className="text-primary">
                    {data.reduce((max, current) => current.ebitda > max.ebitda ? current : max).month}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Mejor margen:</span>
                  <span className="text-danger">
                    {data.reduce((max, current) => current.margenEbitda > max.margenEbitda ? current : max).month}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </motion.div>
  );
};

export default MonthlyEvolutionChart;
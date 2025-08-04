import { FinancialData, MultiLevelBreakEvenData, BreakEvenResult, BreakEvenAnalysisType, MixedCost, VolatilityProfile, VolatilityAnalysis, OutlierData, OutlierAnalysis, MetricVolatilityProfile, AdaptiveStrategy, EnhancedBreakEvenStatistics } from '../types';
import { calculateMultiLevelBreakEven } from './multiLevelBreakEven';

export interface MonthlyStatistics {
  month: string;
  ingresos: number;
  costosVariables: number;
  costosFijos: number;
  puntoEquilibrio: number;
  margenContribucion: number;
  margenContribucionPorc: number;
  utilidadNeta: number;
  depreciacion: number;
  intereses: number;
  ebitda: number;
  ebit: number;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  count: number;
}

export interface BreakEvenStatistics {
  contable: {
    monthly: MonthlyStatistics[];
    summary: {
      puntoEquilibrio: StatisticalSummary;
      ingresos: StatisticalSummary;
      costosFijos: StatisticalSummary;
      costosVariables: StatisticalSummary;
      margenContribucionPorc: StatisticalSummary;
      utilidadNeta: StatisticalSummary;
      depreciacion: StatisticalSummary;
      intereses: StatisticalSummary;
      ebitda: StatisticalSummary;
      ebit: StatisticalSummary;
    };
  };
  operativo: {
    monthly: MonthlyStatistics[];
    summary: {
      puntoEquilibrio: StatisticalSummary;
      ingresos: StatisticalSummary;
      costosFijos: StatisticalSummary;
      costosVariables: StatisticalSummary;
      margenContribucionPorc: StatisticalSummary;
      utilidadNeta: StatisticalSummary;
      depreciacion: StatisticalSummary;
      intereses: StatisticalSummary;
      ebitda: StatisticalSummary;
      ebit: StatisticalSummary;
    };
  };
  caja: {
    monthly: MonthlyStatistics[];
    summary: {
      puntoEquilibrio: StatisticalSummary;
      ingresos: StatisticalSummary;
      costosFijos: StatisticalSummary;
      costosVariables: StatisticalSummary;
      margenContribucionPorc: StatisticalSummary;
      utilidadNeta: StatisticalSummary;
      depreciacion: StatisticalSummary;
      intereses: StatisticalSummary;
      ebitda: StatisticalSummary;
      ebit: StatisticalSummary;
    };
  };
  recommendation: {
    idealBreakEven: BreakEvenResult;
    analysisType: BreakEvenAnalysisType;
    confidence: 'high' | 'medium' | 'low';
    strategy: string;
    monthlyTargets: {
      ingresos: number;
      costosFijos: number;
      costosVariables: number;
    };
  };
}

// Función para calcular estadísticas básicas de un array de números
export function calculateStatistics(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return { mean: 0, median: 0, standardDeviation: 0, min: 0, max: 0, count: 0 };
  }

  const sortedValues = values.slice().sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  // Mediana
  const median = count % 2 === 0
    ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2
    : sortedValues[Math.floor(count / 2)];

  // Desviación estándar
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  return {
    mean,
    median,
    standardDeviation,
    min: sortedValues[0],
    max: sortedValues[count - 1],
    count
  };
}

// Función principal para calcular análisis estadístico completo
export function calculateBreakEvenStatistics(
  data: FinancialData,
  customClassifications: Record<string, any> = {},
  mixedCosts: MixedCost[] = []
): BreakEvenStatistics {
  
  const months = Object.keys(data.monthly).filter(month => 
    month !== 'Promedio' && month !== 'Anual' && month !== 'yearly'
  );


  // Calcular estadísticas para cada tipo de análisis
  const analysisTypes: BreakEvenAnalysisType[] = ['contable', 'operativo', 'caja'];
  const results = {} as any;

  analysisTypes.forEach(analysisType => {
    const monthlyData: MonthlyStatistics[] = [];
    
    // Calcular datos mensuales
    months.forEach(month => {
      try {
        const multiLevelResult = calculateMultiLevelBreakEven(data, month, customClassifications, mixedCosts);
        const result = multiLevelResult[analysisType];
        

        monthlyData.push({
          month,
          ingresos: result.ingresos,
          costosVariables: result.costosVariables,
          costosFijos: result.costosFijos,
          puntoEquilibrio: result.puntoEquilibrio,
          margenContribucion: result.margenContribucion,
          margenContribucionPorc: result.margenContribucionPorc,
          utilidadNeta: result.utilidadNeta,
          depreciacion: result.depreciacion,
          intereses: result.intereses,
          ebitda: result.ebitda,
          ebit: result.ebit
        });
      } catch (error) {
        // console.warn(`⚠️ Error calculando estadísticas para ${month}:`, error);
      }
    });

    // Calcular estadísticas resumidas
    const summary = {
      puntoEquilibrio: calculateStatistics(monthlyData.map(m => m.puntoEquilibrio)),
      ingresos: calculateStatistics(monthlyData.map(m => m.ingresos)),
      costosFijos: calculateStatistics(monthlyData.map(m => m.costosFijos)),
      costosVariables: calculateStatistics(monthlyData.map(m => m.costosVariables)),
      margenContribucionPorc: calculateStatistics(monthlyData.map(m => m.margenContribucionPorc)),
      utilidadNeta: calculateStatistics(monthlyData.map(m => m.utilidadNeta)),
      depreciacion: calculateStatistics(monthlyData.map(m => m.depreciacion)),
      intereses: calculateStatistics(monthlyData.map(m => m.intereses)),
      ebitda: calculateStatistics(monthlyData.map(m => m.ebitda)),
      ebit: calculateStatistics(monthlyData.map(m => m.ebit))
    };

    results[analysisType] = {
      monthly: monthlyData,
      summary
    };
  });

  // Generar recomendación estratégica
  const recommendation = generateStrategicRecommendation(results);

  return {
    contable: results.contable,
    operativo: results.operativo,
    caja: results.caja,
    recommendation
  };
}

// Función para generar recomendación estratégica
function generateStrategicRecommendation(results: any): BreakEvenStatistics['recommendation'] {
  // Evaluar cuál tipo de análisis es más estable (menor desviación estándar)
  const stabilityScores = {
    contable: results.contable.summary.puntoEquilibrio.standardDeviation / (results.contable.summary.puntoEquilibrio.mean || 1),
    operativo: results.operativo.summary.puntoEquilibrio.standardDeviation / (results.operativo.summary.puntoEquilibrio.mean || 1),
    caja: results.caja.summary.puntoEquilibrio.standardDeviation / (results.caja.summary.puntoEquilibrio.mean || 1)
  };

  // Encontrar el análisis más estable (menor coeficiente de variación)
  const mostStableType = Object.entries(stabilityScores).reduce((a, b) => 
    stabilityScores[a[0] as BreakEvenAnalysisType] < stabilityScores[b[0] as BreakEvenAnalysisType] ? a : b
  )[0] as BreakEvenAnalysisType;

  const selectedAnalysis = results[mostStableType];
  const summary = selectedAnalysis.summary;

  // CORRECCIÓN: Confianza basada en variabilidad de ingresos (más específica)
  let confidence: 'high' | 'medium' | 'low';
  const ingresosCoeffVariation = summary.ingresos.standardDeviation / (summary.ingresos.mean || 1);
  const confidenceScore = Math.max(0, 1 - ingresosCoeffVariation);

  if (confidenceScore > 0.8) {
    confidence = 'high';
  } else if (confidenceScore > 0.5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Crear punto de equilibrio ideal basado en medianas (más robusto que la media)
  // ALGORITMO AVANZADO: P.E. Ideal con múltiples metodologías
  const medianMargenContribucion = summary.ingresos.median - summary.costosVariables.median;
  const medianEbitda = medianMargenContribucion - summary.costosFijos.median;
  
  // Método 1: Mediana simple (base)
  const peSimple = summary.margenContribucionPorc.median > 0 
    ? summary.costosFijos.median / summary.margenContribucionPorc.median 
    : 0;
    
  // Método 2: Promedio ponderado por estabilidad (reducir outliers)
  const stabilityWeights = selectedAnalysis.monthly.map(month => {
    const variation = Math.abs(month.margenContribucionPorc - summary.margenContribucionPorc.median);
    return Math.max(0.1, 1 - variation); // Peso mínimo 0.1
  });
  
  const weightedMargin = selectedAnalysis.monthly.reduce((sum, month, i) => 
    sum + (month.margenContribucionPorc * stabilityWeights[i]), 0
  ) / stabilityWeights.reduce((sum, w) => sum + w, 0);
  
  const peWeighted = weightedMargin > 0 ? summary.costosFijos.median / weightedMargin : 0;
  
  // Método 3: Algoritmo robusto (combinar ambos con factor de confianza)
  const puntoEquilibrioIdeal = confidenceScore > 0.7 
    ? (peSimple * 0.3 + peWeighted * 0.7) // Alta confianza: usar método ponderado
    : peSimple; // Baja confianza: usar mediana simple
  
  const idealBreakEven: BreakEvenResult = {
    puntoEquilibrio: puntoEquilibrioIdeal,
    costosFijos: summary.costosFijos.median,
    costosVariables: summary.costosVariables.median,
    ingresos: summary.ingresos.median,
    margenContribucion: medianMargenContribucion,
    margenContribucionPorc: summary.margenContribucionPorc.median,
    utilidadNeta: summary.utilidadNeta.median,
    depreciacion: summary.depreciacion.median,
    intereses: summary.intereses.median,
    ebitda: summary.ebitda.median,
    ebit: summary.ebit.median
  };

  // RECONSTRUCCIÓN: Lógica de estrategia dinámica y estructural
  let strategy: string;
  
  // Lógica Central: Comparar mediana de ingresos vs P.E. Ideal
  const isStructurallyProfitable = summary.ingresos.median >= puntoEquilibrioIdeal;
  
  // Análisis de variabilidad de costos e ingresos
  const costosCoeffVariation = summary.costosFijos.standardDeviation / (summary.costosFijos.mean || 1);
  const ingresosVariability = ingresosCoeffVariation;
  
  if (!isStructurallyProfitable) {
    strategy = `⚠️ ALERTA ESTRUCTURAL: Mediana de ingresos (${Math.round(summary.ingresos.median/1000)}K) menor que P.E. ideal (${Math.round(puntoEquilibrioIdeal/1000)}K). Prioridad: aumentar ventas o reducir costos fijos en ${Math.round((puntoEquilibrioIdeal - summary.ingresos.median)/1000)}K.`;
  } else if (ingresosVariability > 0.5) {
    strategy = `📊 Ingresos altamente variables (${(ingresosVariability * 100).toFixed(0)}% variación). Prioridad: estabilizar ventas, diversificar canales y crear reservas para volatilidad.`;
  } else if (costosCoeffVariation > 0.3) {
    strategy = `🔧 Costos variables detectados (${(costosCoeffVariation * 100).toFixed(0)}% variación). Foco en control de costos fijos y optimización operativa.`;
  } else {
    strategy = `✅ Operación estructuralmente rentable y estable. Oportunidad: optimizar margen y planificar crecimiento sostenible.`;
  }

  return {
    idealBreakEven,
    analysisType: mostStableType,
    confidence,
    strategy,
    monthlyTargets: {
      ingresos: summary.ingresos.median,
      costosFijos: summary.costosFijos.median,
      costosVariables: summary.costosVariables.median
    }
  };
}

// Función helper para detectar tendencias
export function detectTrends(monthlyData: MonthlyStatistics[]): {
  ingresosGrowth: number;
  costosGrowth: number;
  marginTrend: 'improving' | 'stable' | 'declining';
  seasonality: 'high' | 'medium' | 'low';
} {
  if (monthlyData.length < 3) {
    return {
      ingresosGrowth: 0,
      costosGrowth: 0,
      marginTrend: 'stable',
      seasonality: 'low'
    };
  }

  // Calcular tendencia de crecimiento (primeros vs últimos 3 meses)
  const first3 = monthlyData.slice(0, 3);
  const last3 = monthlyData.slice(-3);
  
  const avgIngresosFirst = first3.reduce((sum, m) => sum + m.ingresos, 0) / 3;
  const avgIngresosLast = last3.reduce((sum, m) => sum + m.ingresos, 0) / 3;
  const ingresosGrowth = ((avgIngresosLast - avgIngresosFirst) / avgIngresosFirst) * 100;

  const avgCostosFirst = first3.reduce((sum, m) => sum + (m.costosFijos + m.costosVariables), 0) / 3;
  const avgCostosLast = last3.reduce((sum, m) => sum + (m.costosFijos + m.costosVariables), 0) / 3;
  const costosGrowth = ((avgCostosLast - avgCostosFirst) / avgCostosFirst) * 100;

  // Tendencia del margen
  const avgMarginFirst = first3.reduce((sum, m) => sum + m.margenContribucionPorc, 0) / 3;
  const avgMarginLast = last3.reduce((sum, m) => sum + m.margenContribucionPorc, 0) / 3;
  const marginChange = avgMarginLast - avgMarginFirst;

  let marginTrend: 'improving' | 'stable' | 'declining';
  if (marginChange > 2) marginTrend = 'improving';
  else if (marginChange < -2) marginTrend = 'declining';
  else marginTrend = 'stable';

  // Detectar estacionalidad (coeficiente de variación)
  const margins = monthlyData.map(m => m.margenContribucionPorc);
  const marginStats = calculateStatistics(margins);
  const seasonalityCoeff = marginStats.standardDeviation / (marginStats.mean || 1);
  
  let seasonality: 'high' | 'medium' | 'low';
  if (seasonalityCoeff > 0.3) seasonality = 'high';
  else if (seasonalityCoeff > 0.15) seasonality = 'medium';
  else seasonality = 'low';

  return {
    ingresosGrowth,
    costosGrowth,
    marginTrend,
    seasonality
  };
}

// === FUNCIONES PARA ANÁLISIS ADAPTATIVO ===

/**
 * Calcula el análisis de volatilidad para una métrica específica
 */
export function calculateVolatilityAnalysis(values: number[]): VolatilityAnalysis {
  if (values.length < 3) {
    return {
      coefficientOfVariation: 0,
      profile: 'stable',
      stabilityScore: 0,
      trendDetected: false,
      seasonalityDetected: false
    };
  }

  const stats = calculateStatistics(values);
  const coefficientOfVariation = stats.mean > 0 ? stats.standardDeviation / stats.mean : 0;
  
  // Determinar perfil de volatilidad
  let profile: VolatilityProfile;
  if (coefficientOfVariation < 0.2) profile = 'stable';
  else if (coefficientOfVariation < 0.4) profile = 'moderate';
  else profile = 'volatile';
  
  // Calcular score de estabilidad (inverso del CV, normalizado)
  const stabilityScore = Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  
  // Detección básica de tendencia (comparar primera y segunda mitad)
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
  const trendDetected = Math.abs((secondAvg - firstAvg) / firstAvg) > 0.15; // Cambio > 15%
  
  // Detección básica de estacionalidad (alta variabilidad pero patrón repetitivo)
  const seasonalityDetected = coefficientOfVariation > 0.25 && values.length >= 12;

  return {
    coefficientOfVariation,
    profile,
    stabilityScore,
    trendDetected,
    seasonalityDetected
  };
}

/**
 * Detecta outliers usando el método IQR (Rango Intercuartílico)
 */
export function detectOutliers(values: number[], metric: string, months: string[]): OutlierData[] {
  if (values.length < 4) return [];

  const sortedValues = [...values].sort((a, b) => a - b);
  const n = sortedValues.length;
  
  // Calcular Q1 y Q3
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sortedValues[q1Index];
  const q3 = sortedValues[q3Index];
  const iqr = q3 - q1;
  
  // Límites para outliers
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const extremeLowerBound = q1 - 3 * iqr;
  const extremeUpperBound = q3 + 3 * iqr;
  
  const outliers: OutlierData[] = [];
  
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      const median = sortedValues[Math.floor(n / 2)];
      const deviation = Math.abs(value - median) / median;
      
      let severity: 'mild' | 'moderate' | 'extreme';
      if (value < extremeLowerBound || value > extremeUpperBound) {
        severity = 'extreme';
      } else if (deviation > 0.5) {
        severity = 'moderate';
      } else {
        severity = 'mild';
      }
      
      outliers.push({
        monthIndex: index,
        month: months[index] || `Mes ${index + 1}`,
        metric,
        value,
        deviation,
        severity
      });
    }
  });
  
  return outliers;
}

/**
 * Genera análisis completo de outliers para todas las métricas
 */
export function analyzeOutliers(monthlyData: MonthlyStatistics[]): OutlierAnalysis {
  const months = monthlyData.map(m => m.month);
  const metrics = ['ingresos', 'costosFijos', 'costosVariables', 'margenContribucionPorc'] as const;
  
  let allOutliers: OutlierData[] = [];
  let affectedMetrics: Set<string> = new Set();
  
  metrics.forEach(metric => {
    const values = monthlyData.map(m => m[metric]);
    const outliers = detectOutliers(values, metric, months);
    allOutliers = [...allOutliers, ...outliers];
    if (outliers.length > 0) {
      affectedMetrics.add(metric);
    }
  });
  
  const totalDataPoints = monthlyData.length * metrics.length;
  const outlierPercentage = (allOutliers.length / totalDataPoints) * 100;
  
  // Recomendación basada en cantidad y severidad de outliers
  let recommendation: 'include' | 'exclude' | 'investigate';
  const extremeOutliers = allOutliers.filter(o => o.severity === 'extreme').length;
  
  if (outlierPercentage < 5 && extremeOutliers === 0) {
    recommendation = 'include';
  } else if (outlierPercentage > 15 || extremeOutliers > 2) {
    recommendation = 'investigate';
  } else {
    recommendation = 'exclude';
  }
  
  return {
    detectedOutliers: allOutliers,
    totalOutliers: allOutliers.length,
    cleanDatasetSize: monthlyData.length - allOutliers.filter(o => o.severity !== 'mild').length,
    outlierPercentage,
    affectedMetrics: Array.from(affectedMetrics),
    recommendation
  };
}

/**
 * Calcula el perfil de volatilidad para todas las métricas principales
 */
export function calculateMetricVolatilityProfile(monthlyData: MonthlyStatistics[]): MetricVolatilityProfile {
  const ingresos = calculateVolatilityAnalysis(monthlyData.map(m => m.ingresos));
  const costosFijos = calculateVolatilityAnalysis(monthlyData.map(m => m.costosFijos));
  const costosVariables = calculateVolatilityAnalysis(monthlyData.map(m => m.costosVariables));
  const margenContribucion = calculateVolatilityAnalysis(monthlyData.map(m => m.margenContribucionPorc));
  
  // Determinar perfil general (el más conservador/pesimista)
  const profiles = [ingresos.profile, costosFijos.profile, costosVariables.profile, margenContribucion.profile];
  let overall: VolatilityProfile = 'stable';
  
  if (profiles.includes('volatile')) overall = 'volatile';
  else if (profiles.includes('moderate')) overall = 'moderate';
  
  return {
    ingresos,
    costosFijos,
    costosVariables,
    margenContribucion,
    overall
  };
}

/**
 * Genera estrategia adaptativa basada en el análisis de volatilidad
 */
export function generateAdaptiveStrategy(
  volatilityProfile: MetricVolatilityProfile,
  outlierAnalysis: OutlierAnalysis,
  baseRecommendation: any
): AdaptiveStrategy {
  const { overall } = volatilityProfile;
  const { outlierPercentage } = outlierAnalysis;
  
  let primary: string;
  let secondary: string | undefined;
  let confidence: 'high' | 'medium' | 'low';
  let reasoning: string;
  let actionableSteps: string[] = [];
  let riskFactors: string[] = [];
  let opportunities: string[] = [];
  
  // Lógica adaptativa principal
  if (overall === 'stable' && outlierPercentage < 5) {
    primary = "Optimización y Crecimiento Planificado";
    secondary = "Análisis de Eficiencia Operativa";
    confidence = 'high';
    reasoning = "Datos estables y predecibles permiten planificación a largo plazo y optimización fina.";
    
    actionableSteps = [
      "Implementar mejora continua en procesos",
      "Evaluar oportunidades de crecimiento",
      "Optimizar estructura de costos fijos",
      "Planificar inversiones estratégicas"
    ];
    
    opportunities = [
      "Expansión controlada del negocio",
      "Mejora de márgenes mediante eficiencia",
      "Desarrollo de nuevos productos/servicios"
    ];
    
    riskFactors = [
      "Complacencia por estabilidad aparente",
      "Pérdida de agilidad en mercados cambiantes"
    ];
    
  } else if (overall === 'volatile' || outlierPercentage > 15) {
    primary = "Estabilización y Control de Riesgos";
    secondary = "Diversificación de Ingresos";
    confidence = 'low';
    reasoning = "Alta volatilidad requiere enfoque en estabilización antes de optimización.";
    
    actionableSteps = [
      "Identificar y controlar fuentes de volatilidad",
      "Implementar sistema de alertas tempranas",
      "Crear reservas para manejar fluctuaciones",
      "Diversificar fuentes de ingresos",
      "Revisar y ajustar frecuentemente presupuestos"
    ];
    
    riskFactors = [
      "Impredecibilidad en flujo de caja",
      "Dificultad para planificación a mediano plazo",
      "Posibles pérdidas en meses atípicos"
    ];
    
    opportunities = [
      "Identificar patrones en la volatilidad",
      "Desarrollar capacidad de respuesta rápida",
      "Aprovechar picos de demanda"
    ];
    
  } else { // moderate
    primary = "Mejora de Predictibilidad";
    secondary = "Optimización Gradual";
    confidence = 'medium';
    reasoning = "Volatilidad moderada permite mejoras graduales mientras se trabaja en estabilización.";
    
    actionableSteps = [
      "Analizar causas de variabilidad mensual",
      "Implementar controles de gestión mejorados",
      "Establecer rangos objetivo para métricas clave",
      "Mejorar pronósticos y planificación"
    ];
    
    riskFactors = [
      "Variabilidad puede escalar sin control adecuado",
      "Dificultad para identificar tendencias reales"
    ];
    
    opportunities = [
      "Mejorar sistemas de control de gestión",
      "Implementar análisis predictivo básico",
      "Optimizar procesos con mayor variabilidad"
    ];
  }
  
  return {
    primary,
    secondary,
    confidence,
    reasoning,
    actionableSteps,
    riskFactors,
    opportunities
  };
}

/**
 * Función principal que combina análisis base con análisis adaptativo
 */
export function calculateEnhancedBreakEvenStatistics(
  data: FinancialData,
  customClassifications: Record<string, any> = {},
  mixedCosts: MixedCost[] = []
): EnhancedBreakEvenStatistics {
  
  // Obtener análisis base
  const baseStatistics = calculateBreakEvenStatistics(data, customClassifications, mixedCosts);
  
  // Usar el análisis más estable para las nuevas funcionalidades
  const selectedAnalysis = baseStatistics[baseStatistics.recommendation.analysisType];
  
  // Calcular análisis de volatilidad
  const volatilityProfile = calculateMetricVolatilityProfile(selectedAnalysis.monthly);
  
  // Analizar outliers
  const outlierAnalysis = analyzeOutliers(selectedAnalysis.monthly);
  
  // Generar estrategia adaptativa
  const adaptiveStrategy = generateAdaptiveStrategy(
    volatilityProfile,
    outlierAnalysis,
    baseStatistics.recommendation
  );
  
  // Evaluar calidad de datos
  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  const avgStability = (
    volatilityProfile.ingresos.stabilityScore +
    volatilityProfile.costosFijos.stabilityScore +
    volatilityProfile.costosVariables.stabilityScore +
    volatilityProfile.margenContribucion.stabilityScore
  ) / 4;
  
  if (avgStability > 0.8 && outlierAnalysis.outlierPercentage < 5) dataQuality = 'excellent';
  else if (avgStability > 0.6 && outlierAnalysis.outlierPercentage < 10) dataQuality = 'good';
  else if (avgStability > 0.4 && outlierAnalysis.outlierPercentage < 20) dataQuality = 'fair';
  else dataQuality = 'poor';
  
  const analysisReliability = Math.min(1, avgStability * (1 - outlierAnalysis.outlierPercentage / 100));
  
  return {
    // Datos base
    contable: baseStatistics.contable,
    operativo: baseStatistics.operativo,
    caja: baseStatistics.caja,
    recommendation: baseStatistics.recommendation,
    
    // Nuevas funcionalidades
    volatilityProfile,
    outlierAnalysis,
    adaptiveStrategy,
    diagnostics: {
      dataQuality,
      analysisReliability,
      recommendedActions: adaptiveStrategy.actionableSteps.slice(0, 3) // Top 3 acciones
    }
  };
}
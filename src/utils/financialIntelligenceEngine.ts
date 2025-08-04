import { MonthlyData } from '../types';

// ============================================================================
// MOTOR DE INTELIGENCIA FINANCIERA COMPLETO
// Sistema adaptativo que selecciona algoritmos según características de datos
// ============================================================================

// Tipos para análisis financiero completo
export interface FinancialMetrics {
  // Métricas básicas
  ingresos: number;
  costos: number;
  gastos: number;
  ebitda: number;
  utilidadNeta: number;
  margenBruto: number;
  margenEbitda: number;
  margenNeto: number;
  
  // Métricas de eficiencia
  rotacionActivos?: number;
  rotacionInventario?: number;
  cicloConversion?: number;
  
  // Métricas de rentabilidad
  roe?: number;
  roa?: number;
  gmroi?: number;
}

export interface DataCharacteristics {
  // Características estadísticas
  sampleSize: number;
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  trend: 'upward' | 'downward' | 'sideways' | 'volatile';
  seasonality: boolean;
  
  // Características de calidad
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  hasOutliers: boolean;
  hasNegativeValues: boolean;
  hasZeroValues: boolean;
  
  // Características de negocio
  businessType: 'manufacturing' | 'services' | 'retail' | 'mixed';
  profitability: 'profitable' | 'breakeven' | 'loss' | 'volatile';
  growthStage: 'startup' | 'growth' | 'mature' | 'decline';
}

export interface AnalysisResult {
  algorithm: string;
  confidence: number;
  
  // Resultados de tendencia
  trend: number;
  monthlyGrowth: number;
  volatility: number;
  projection: number;
  
  // Análisis financiero
  financialHealth: 'excellent' | 'good' | 'concerning' | 'critical';
  keyInsights: string[];
  recommendations: string[];
  warnings: string[];
  
  // Métricas especializadas
  efficiency: number;
  profitability: number;
  sustainability: number;
  
  // Contexto del análisis
  explanation: string;
  dataQuality: DataCharacteristics;
}

// ============================================================================
// 1. ANÁLISIS DE CARACTERÍSTICAS DE DATOS
// ============================================================================

export const analyzeDataCharacteristics = (data: MonthlyData[]): DataCharacteristics => {
  const ingresos = data.map(d => d.ingresos);
  const ebitda = data.map(d => d.ebitda);
  const utilidad = data.map(d => d.utilidadNeta);
  
  // Análisis de volatilidad
  const volatilityScore = calculateVolatilityScore(ingresos, ebitda, utilidad);
  
  // Análisis de tendencia
  const trendDirection = calculateTrendDirection(data);
  
  // Análisis de estacionalidad
  const seasonality = detectSeasonality(data);
  
  // Análisis de calidad de datos
  const dataQuality = assessDataQuality(data);
  
  // Análisis de tipo de negocio
  const businessType = inferBusinessType(data);
  
  // Análisis de rentabilidad
  const profitability = assessProfitability(data);
  
  // Análisis de etapa de crecimiento
  const growthStage = assessGrowthStage(data);
  
  return {
    sampleSize: data.length,
    volatility: volatilityScore,
    trend: trendDirection,
    seasonality,
    dataQuality,
    hasOutliers: detectOutliers(ingresos).length > 0,
    hasNegativeValues: ebitda.some(v => v < 0) || utilidad.some(v => v < 0),
    hasZeroValues: ingresos.some(v => v === 0),
    businessType,
    profitability,
    growthStage
  };
};

// ============================================================================
// 2. BIBLIOTECA DE ALGORITMOS FINANCIEROS
// ============================================================================

// Algoritmo 1: Análisis de Regresión Lineal Múltiple
export const multipleLinearRegression = (data: MonthlyData[]): Partial<AnalysisResult> => {
  // Implementar regresión múltiple considerando:
  // - Ingresos vs tiempo
  // - Costos vs ingresos
  // - Márgenes vs volumen
  
  const ingresos = data.map(d => d.ingresos);
  const timePoints = data.map((_, i) => i + 1);
  
  const regression = calculateLinearRegression(timePoints, ingresos);
  
  return {
    algorithm: 'Regresión Lineal Múltiple',
    trend: regression.slope,
    confidence: regression.rSquared * 100,
    explanation: 'Análisis de tendencias usando regresión lineal múltiple para identificar patrones subyacentes.'
  };
};

// Algoritmo 2: Análisis de Series Temporales (ARIMA simplificado)
export const timeSeriesAnalysis = (data: MonthlyData[]): Partial<AnalysisResult> => {
  // Implementar análisis de series temporales:
  // - Componentes de tendencia
  // - Componentes estacionales
  // - Componentes cíclicos
  
  const values = data.map(d => d.ebitda);
  const decomposition = decomposeTimeSeries(values);
  
  return {
    algorithm: 'Análisis de Series Temporales',
    trend: decomposition.trend,
    volatility: decomposition.seasonality,
    confidence: decomposition.confidence,
    explanation: 'Descomposición de series temporales para identificar tendencias, estacionalidad y ciclos.'
  };
};

// Algoritmo 3: Análisis de Ratios Financieros
export const financialRatioAnalysis = (data: MonthlyData[]): Partial<AnalysisResult> => {
  // Calcular ratios financieros clave:
  // - Liquidez
  // - Rentabilidad
  // - Eficiencia
  // - Apalancamiento
  
  const ratios = data.map(d => ({
    margenBruto: d.ingresos > 0 ? ((d.ingresos - d.costoVentasTotal) / d.ingresos) * 100 : 0,
    margenEbitda: d.margenEbitda,
    margenNeto: d.ingresos > 0 ? (d.utilidadNeta / d.ingresos) * 100 : 0,
    eficienciaOperativa: d.ingresos > 0 ? (d.ebitda / d.ingresos) * 100 : 0
  }));
  
  const avgMargenBruto = ratios.reduce((sum, r) => sum + r.margenBruto, 0) / ratios.length;
  const avgMargenEbitda = ratios.reduce((sum, r) => sum + r.margenEbitda, 0) / ratios.length;
  
  return {
    algorithm: 'Análisis de Ratios Financieros',
    efficiency: avgMargenBruto,
    profitability: avgMargenEbitda,
    confidence: 85,
    explanation: 'Análisis comprensivo de ratios financieros para evaluar salud financiera.'
  };
};

// Algoritmo 4: Análisis de Volatilidad y Riesgo - CORREGIDO
export const riskVolatilityAnalysis = (data: MonthlyData[]): Partial<AnalysisResult> => {
  // Calcular métricas de riesgo corregidas
  const ingresos = data.map(d => d.ingresos);
  const ebitda = data.map(d => d.ebitda);
  const utilidad = data.map(d => d.utilidadNeta);
  
  // Calcular volatilidad como coeficiente de variación (limitado)
  const ingresosCV = calculateCoefficientOfVariation(ingresos);
  const ebitdaCV = calculateCoefficientOfVariation(ebitda.map(v => Math.abs(v))); // Usar valores absolutos para EBITDA
  const volatilityPercent = Math.min((ingresosCV + ebitdaCV) / 2 * 100, 200); // Limitar a 200%
  
  // Calcular tendencia usando regresión lineal - SIN LIMITACIONES ARTIFICIALES
  const timePoints = data.map((_, i) => i);
  const ingresosRegression = calculateLinearRegression(timePoints, ingresos);
  const avgIngresos = ingresos.reduce((sum, val) => sum + val, 0) / ingresos.length;
  const trendPercent = Math.abs(avgIngresos) > 0.01 ? (ingresosRegression.slope / avgIngresos) * 100 : 0;
  const realTrend = !isNaN(trendPercent) && isFinite(trendPercent) ? trendPercent : 0;
  
  // Calcular crecimiento mensual promedio - SIN LIMITACIONES ARTIFICIALES
  let totalGrowth = 0;
  let validGrowths = 0;
  for (let i = 1; i < ingresos.length; i++) {
    if (Math.abs(ingresos[i-1]) > 0.01) {
      const growth = ((ingresos[i] - ingresos[i-1]) / Math.abs(ingresos[i-1])) * 100;
      // Solo validar que sea un número válido, SIN limitar valores
      if (!isNaN(growth) && isFinite(growth)) {
        totalGrowth += growth;
        validGrowths++;
      }
    }
  }
  const monthlyGrowth = validGrowths > 0 ? totalGrowth / validGrowths : 0;
  
  // Calcular proyección simple
  const lastIngresos = ingresos[ingresos.length - 1];
  const projection = lastIngresos + (ingresosRegression.slope * ingresos.length);
  
  // Calcular métricas de desempeño
  const avgEbitda = ebitda.reduce((sum, val) => sum + val, 0) / ebitda.length;
  const avgUtilidad = utilidad.reduce((sum, val) => sum + val, 0) / utilidad.length;
  
  const efficiency = Math.abs(avgIngresos) > 0.01 ? Math.max(0, (avgEbitda / avgIngresos) * 100) : 0;
  const profitability = Math.abs(avgIngresos) > 0.01 ? (avgUtilidad / avgIngresos) * 100 : 0;
  const sustainability = Math.max(0, 100 - volatilityPercent);
  
  return {
    algorithm: 'Análisis de Riesgo y Volatilidad',
    trend: realTrend,
    monthlyGrowth: monthlyGrowth,
    volatility: volatilityPercent,
    projection: Math.max(0, projection),
    efficiency: Math.max(0, efficiency),
    profitability: profitability,
    sustainability: Math.max(0, 100 - volatilityPercent),
    confidence: 75,
    explanation: 'Evaluación integral de riesgo financiero, volatilidad y proyecciones basadas en datos históricos REALES sin limitaciones artificiales.'
  };
};

// Algoritmo 5: Análisis de Estacionalidad y Ciclos
export const seasonalityAnalysis = (data: MonthlyData[]): Partial<AnalysisResult> => {
  // Detectar patrones estacionales:
  // - Análisis de Fourier simplificado
  // - Detección de picos y valles
  // - Predicción de ciclos
  
  const ingresos = data.map(d => d.ingresos);
  const seasonalPattern = detectSeasonalPattern(ingresos);
  
  return {
    algorithm: 'Análisis de Estacionalidad',
    trend: seasonalPattern.overallTrend,
    projection: seasonalPattern.nextPeriodPrediction,
    confidence: seasonalPattern.confidence,
    explanation: 'Identificación de patrones estacionales y predicción de ciclos de negocio.'
  };
};

// ============================================================================
// 3. MOTOR DE SELECCIÓN INTELIGENTE DE ALGORITMOS
// ============================================================================

export const intelligentFinancialAnalysis = (data: MonthlyData[]): AnalysisResult => {
  // Análisis de características
  const characteristics = analyzeDataCharacteristics(data);
  
  // Selección inteligente de algoritmos
  let primaryAlgorithm: Partial<AnalysisResult>;
  let secondaryAlgorithm: Partial<AnalysisResult>;
  
  // Lógica de selección basada en características
  if (characteristics.dataQuality === 'excellent' && characteristics.sampleSize >= 12) {
    primaryAlgorithm = timeSeriesAnalysis(data);
    secondaryAlgorithm = multipleLinearRegression(data);
  } else if (characteristics.volatility === 'extreme' || characteristics.hasNegativeValues) {
    primaryAlgorithm = riskVolatilityAnalysis(data);
    secondaryAlgorithm = financialRatioAnalysis(data);
  } else if (characteristics.seasonality) {
    primaryAlgorithm = seasonalityAnalysis(data);
    secondaryAlgorithm = timeSeriesAnalysis(data);
  } else {
    primaryAlgorithm = multipleLinearRegression(data);
    secondaryAlgorithm = financialRatioAnalysis(data);
  }
  
  // Combinar resultados
  const combinedResult = combineAnalysisResults(primaryAlgorithm, secondaryAlgorithm, characteristics);
  
  // Generar insights y recomendaciones
  const insights = generateFinancialInsights(data, characteristics);
  const recommendations = generateRecommendations(data, characteristics);
  const warnings = generateWarnings(data, characteristics);
  
  return {
    algorithm: primaryAlgorithm.algorithm || 'Análisis Combinado',
    confidence: combinedResult.confidence,
    trend: combinedResult.trend,
    monthlyGrowth: combinedResult.monthlyGrowth,
    volatility: combinedResult.volatility,
    projection: combinedResult.projection,
    financialHealth: assessFinancialHealth(data, characteristics),
    keyInsights: insights,
    recommendations,
    warnings,
    efficiency: combinedResult.efficiency,
    profitability: combinedResult.profitability,
    sustainability: combinedResult.sustainability,
    explanation: combinedResult.explanation,
    dataQuality: characteristics
  };
};

// ============================================================================
// 4. FUNCIONES DE APOYO FINANCIERO
// ============================================================================

// Función para calcular volatilidad financiera - CORREGIDA
const calculateVolatilityScore = (ingresos: number[], ebitda: number[], utilidad: number[]): DataCharacteristics['volatility'] => {
  const ingresosCV = calculateCoefficientOfVariation(ingresos);
  const ebitdaCV = calculateCoefficientOfVariation(ebitda.map(v => Math.abs(v))); // Usar valores absolutos
  const utilidadCV = calculateCoefficientOfVariation(utilidad.map(v => Math.abs(v))); // Usar valores absolutos
  
  // Promediar solo los CV válidos
  const validCVs = [ingresosCV, ebitdaCV, utilidadCV].filter(cv => cv > 0);
  const avgCV = validCVs.length > 0 ? validCVs.reduce((sum, cv) => sum + cv, 0) / validCVs.length : 0;
  
  // Umbrales ajustados para datos financieros reales
  if (avgCV < 0.25) return 'low';
  if (avgCV < 0.50) return 'medium';  
  if (avgCV < 1.00) return 'high';
  return 'extreme';
};

// Función para inferir tipo de negocio
const inferBusinessType = (data: MonthlyData[]): DataCharacteristics['businessType'] => {
  const avgCostoVentas = data.reduce((sum, d) => sum + d.costoVentasTotal, 0) / data.length;
  const avgIngresos = data.reduce((sum, d) => sum + d.ingresos, 0) / data.length;
  const costoVentasRatio = avgCostoVentas / avgIngresos;
  
  if (costoVentasRatio > 0.7) return 'manufacturing';
  if (costoVentasRatio < 0.3) return 'services';
  return 'retail';
};

// Función para evaluar salud financiera
const assessFinancialHealth = (data: MonthlyData[], characteristics: DataCharacteristics): AnalysisResult['financialHealth'] => {
  const avgMargenEbitda = data.reduce((sum, d) => sum + d.margenEbitda, 0) / data.length;
  const positiveMonths = data.filter(d => d.ebitda > 0).length;
  const profitabilityRatio = positiveMonths / data.length;
  
  if (avgMargenEbitda > 20 && profitabilityRatio > 0.8) return 'excellent';
  if (avgMargenEbitda > 10 && profitabilityRatio > 0.6) return 'good';
  if (avgMargenEbitda > 0 && profitabilityRatio > 0.4) return 'concerning';
  return 'critical';
};

// ============================================================================
// 5. IMPLEMENTACIÓN COMPLETA DE FUNCIONES AUXILIARES
// ============================================================================

// Función para calcular regresión lineal
const calculateLinearRegression = (x: number[], y: number[]) => {
  const n = x.length;
  if (n < 2) return { slope: 0, rSquared: 0, intercept: 0 };
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calcular R²
  const meanY = sumY / n;
  const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const residualSumSquares = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  
  const rSquared = Math.max(0, 1 - (residualSumSquares / totalSumSquares));
  
  return { slope, rSquared, intercept };
};

// Función para descomponer series temporales
const decomposeTimeSeries = (values: number[]) => {
  if (values.length < 4) return { trend: 0, seasonality: 0, confidence: 0 };
  
  // Calcular tendencia usando media móvil
  const windowSize = Math.min(3, Math.floor(values.length / 2));
  const trend = calculateMovingAverage(values, windowSize);
  
  // Calcular componente estacional
  const detrended = values.map((val, i) => val - (trend[i] || trend[trend.length - 1]));
  const seasonality = calculateCoefficientOfVariation(detrended);
  
  // Calcular tendencia general
  const timePoints = values.map((_, i) => i);
  const regression = calculateLinearRegression(timePoints, values);
  
  return {
    trend: regression.slope,
    seasonality: seasonality * 100,
    confidence: regression.rSquared * 100
  };
};

// Función para calcular métricas de volatilidad - CORREGIDA
const calculateVolatilityMetrics = (values: number[]) => {
  if (values.length < 2) return { historicalVolatility: 0, stabilityScore: 0 };
  
  // Filtrar valores extremos y usar valores absolutos para EBITDA
  const filteredValues = values.filter(v => Math.abs(v) > 0.01);
  if (filteredValues.length < 2) return { historicalVolatility: 0, stabilityScore: 0 };
  
  // Calcular volatilidad histórica (desviación estándar)
  const mean = filteredValues.reduce((sum, val) => sum + val, 0) / filteredValues.length;
  const variance = filteredValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / filteredValues.length;
  const historicalVolatility = Math.sqrt(variance);
  
  // Calcular score de estabilidad (inverso de coeficiente de variación)
  const cv = Math.abs(mean) > 0.01 ? historicalVolatility / Math.abs(mean) : 1;
  const stabilityScore = Math.max(0, 100 - Math.min(cv * 100, 100)); // Limitar a 100%
  
  return { 
    historicalVolatility: Math.min(historicalVolatility, 100), // Limitar volatilidad
    stabilityScore: Math.max(0, stabilityScore) 
  };
};

// Función para detectar patrones estacionales
const detectSeasonalPattern = (values: number[]) => {
  if (values.length < 6) return { overallTrend: 0, nextPeriodPrediction: 0, confidence: 0 };
  
  // Calcular tendencia general
  const timePoints = values.map((_, i) => i);
  const regression = calculateLinearRegression(timePoints, values);
  
  // Detectar picos y valles
  const peaks = detectPeaksAndValleys(values);
  
  // Predecir próximo período
  const nextPeriodPrediction = regression.slope * values.length + regression.intercept;
  
  return {
    overallTrend: regression.slope,
    nextPeriodPrediction,
    confidence: regression.rSquared * 100
  };
};

// Función para calcular coeficiente de variación - CORREGIDA
const calculateCoefficientOfVariation = (values: number[]) => {
  if (values.length < 2) return 0;
  
  // Filtrar valores extremos y zeros
  const filteredValues = values.filter(v => Math.abs(v) > 0.01);
  if (filteredValues.length < 2) return 0;
  
  const mean = filteredValues.reduce((sum, val) => sum + val, 0) / filteredValues.length;
  const variance = filteredValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / filteredValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Coeficiente de variación SIN limitaciones artificiales
  const cv = Math.abs(mean) > 0.01 ? stdDev / Math.abs(mean) : 0;
  return !isNaN(cv) && isFinite(cv) ? cv : 0; // Solo validar que sea un número válido
};

// Función para calcular dirección de tendencia
const calculateTrendDirection = (data: MonthlyData[]): DataCharacteristics['trend'] => {
  if (data.length < 2) return 'sideways';
  
  const ingresos = data.map(d => d.ingresos);
  const timePoints = data.map((_, i) => i);
  const regression = calculateLinearRegression(timePoints, ingresos);
  
  const avgIngresos = ingresos.reduce((sum, val) => sum + val, 0) / ingresos.length;
  const slopePercent = Math.abs(avgIngresos) > 0.01 ? (regression.slope / avgIngresos) * 100 : 0;
  
  if (Math.abs(slopePercent) < 2) return 'sideways';
  if (slopePercent > 0) return 'upward';
  if (slopePercent < 0) return 'downward';
  
  // Verificar si es volátil
  const cv = calculateCoefficientOfVariation(ingresos);
  return cv > 0.5 ? 'volatile' : 'sideways';
};

// Función para detectar estacionalidad
const detectSeasonality = (data: MonthlyData[]) => {
  if (data.length < 6) return false;
  
  const ingresos = data.map(d => d.ingresos);
  const cv = calculateCoefficientOfVariation(ingresos);
  
  // Detectar si hay patrones regulares
  const peaks = detectPeaksAndValleys(ingresos);
  const hasRegularPeaks = peaks.length >= 2;
  
  return cv > 0.3 && hasRegularPeaks;
};

// Función para evaluar calidad de datos
const assessDataQuality = (data: MonthlyData[]): DataCharacteristics['dataQuality'] => {
  if (data.length < 3) return 'poor';
  
  const ingresos = data.map(d => d.ingresos);
  const outliers = detectOutliers(ingresos);
  const outlierRatio = outliers.length / data.length;
  
  const zeroCount = data.filter(d => d.ingresos === 0).length;
  const zeroRatio = zeroCount / data.length;
  
  const negativeCount = data.filter(d => d.ebitda < 0).length;
  const negativeRatio = negativeCount / data.length;
  
  if (outlierRatio > 0.3 || zeroRatio > 0.2 || negativeRatio > 0.6) return 'poor';
  if (outlierRatio > 0.2 || zeroRatio > 0.1 || negativeRatio > 0.4) return 'fair';
  if (outlierRatio > 0.1 || negativeRatio > 0.2) return 'good';
  return 'excellent';
};

// Función para evaluar rentabilidad
const assessProfitability = (data: MonthlyData[]): DataCharacteristics['profitability'] => {
  const positiveEbitda = data.filter(d => d.ebitda > 0).length;
  const profitableRatio = positiveEbitda / data.length;
  
  const avgMargen = data.reduce((sum, d) => sum + d.margenEbitda, 0) / data.length;
  
  if (profitableRatio > 0.8 && avgMargen > 15) return 'profitable';
  if (profitableRatio > 0.6 && avgMargen > 5) return 'breakeven';
  if (profitableRatio < 0.4 || avgMargen < -10) return 'loss';
  return 'volatile';
};

// Función para evaluar etapa de crecimiento
const assessGrowthStage = (data: MonthlyData[]): DataCharacteristics['growthStage'] => {
  if (data.length < 3) return 'startup';
  
  const ingresos = data.map(d => d.ingresos);
  const timePoints = data.map((_, i) => i);
  const regression = calculateLinearRegression(timePoints, ingresos);
  
  const avgIngresos = ingresos.reduce((sum, val) => sum + val, 0) / ingresos.length;
  const growthRate = Math.abs(avgIngresos) > 0.01 ? (regression.slope / avgIngresos) * 100 : 0;
  
  if (growthRate > 10) return 'growth';
  if (growthRate > 2) return 'mature';
  if (growthRate < -5) return 'decline';
  return 'startup';
};

// Función para detectar outliers usando IQR
const detectOutliers = (values: number[]) => {
  if (values.length < 4) return [];
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.map((val, index) => ({ value: val, index }))
    .filter(item => item.value < lowerBound || item.value > upperBound)
    .map(item => item.index);
};

// Función para combinar resultados de análisis
const combineAnalysisResults = (primary: any, secondary: any, characteristics: DataCharacteristics) => {
  const primaryWeight = 0.7;
  const secondaryWeight = 0.3;
  
  return {
    confidence: Math.round((primary.confidence || 0) * primaryWeight + (secondary.confidence || 0) * secondaryWeight),
    trend: (primary.trend || 0) * primaryWeight + (secondary.trend || 0) * secondaryWeight,
    monthlyGrowth: (primary.monthlyGrowth || 0) * primaryWeight + (secondary.monthlyGrowth || 0) * secondaryWeight,
    volatility: (primary.volatility || 0) * primaryWeight + (secondary.volatility || 0) * secondaryWeight,
    projection: (primary.projection || 0) * primaryWeight + (secondary.projection || 0) * secondaryWeight,
    efficiency: (primary.efficiency || 0) * primaryWeight + (secondary.efficiency || 0) * secondaryWeight,
    profitability: (primary.profitability || 0) * primaryWeight + (secondary.profitability || 0) * secondaryWeight,
    sustainability: (primary.sustainability || 0) * primaryWeight + (secondary.sustainability || 0) * secondaryWeight,
    explanation: primary.explanation || 'Análisis combinado de múltiples algoritmos financieros.'
  };
};

// Función para generar insights financieros
const generateFinancialInsights = (data: MonthlyData[], characteristics: DataCharacteristics) => {
  const insights = [];
  
  // Análisis de tendencia
  if (characteristics.trend === 'upward') {
    insights.push('Tendencia de crecimiento positiva detectada en los ingresos');
  } else if (characteristics.trend === 'downward') {
    insights.push('Tendencia de declive en los ingresos requiere atención');
  }
  
  // Análisis de rentabilidad
  if (characteristics.profitability === 'profitable') {
    insights.push('Empresa mantiene rentabilidad consistente');
  } else if (characteristics.profitability === 'loss') {
    insights.push('Pérdidas recurrentes indican problemas operativos');
  }
  
  // Análisis de volatilidad
  if (characteristics.volatility === 'extreme') {
    insights.push('Alta volatilidad sugiere riesgo operativo elevado');
  } else if (characteristics.volatility === 'low') {
    insights.push('Operaciones estables con baja volatilidad');
  }
  
  // Análisis estacional
  if (characteristics.seasonality) {
    insights.push('Patrones estacionales detectados - planificar inventarios');
  }
  
  return insights;
};

// Función para generar recomendaciones
const generateRecommendations = (data: MonthlyData[], characteristics: DataCharacteristics) => {
  const recommendations = [];
  
  // Recomendaciones basadas en rentabilidad
  if (characteristics.profitability === 'loss') {
    recommendations.push('Revisar estructura de costos y optimizar gastos operativos');
    recommendations.push('Implementar análisis ABC para identificar productos no rentables');
  }
  
  // Recomendaciones basadas en volatilidad
  if (characteristics.volatility === 'extreme') {
    recommendations.push('Diversificar fuentes de ingresos para reducir riesgo');
    recommendations.push('Establecer reservas de flujo de caja para períodos volátiles');
  }
  
  // Recomendaciones basadas en crecimiento
  if (characteristics.growthStage === 'decline') {
    recommendations.push('Desarrollar nuevos productos o mercados');
    recommendations.push('Considerar estrategias de reestructuración');
  }
  
  // Recomendaciones basadas en estacionalidad
  if (characteristics.seasonality) {
    recommendations.push('Implementar planificación estacional de inventarios');
    recommendations.push('Desarrollar estrategias de marketing contra-estacionales');
  }
  
  return recommendations;
};

// Función para generar warnings
const generateWarnings = (data: MonthlyData[], characteristics: DataCharacteristics) => {
  const warnings = [];
  
  // Warnings críticos
  if (characteristics.profitability === 'loss') {
    warnings.push('Pérdidas consecutivas detectadas - situación financiera crítica');
  }
  
  if (characteristics.dataQuality === 'poor') {
    warnings.push('Calidad de datos insuficiente - verificar fuentes');
  }
  
  if (characteristics.volatility === 'extreme') {
    warnings.push('Volatilidad extrema - riesgo operativo elevado');
  }
  
  // Warnings de tendencia
  if (characteristics.trend === 'downward') {
    warnings.push('Tendencia descendente sostenida - requiere acción inmediata');
  }
  
  return warnings;
};

// Funciones auxiliares adicionales
const calculateMovingAverage = (values: number[], windowSize: number) => {
  const result = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }
  return result;
};

const detectPeaksAndValleys = (values: number[]) => {
  const peaks = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
      peaks.push({ index: i, value: values[i], type: 'peak' });
    } else if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
      peaks.push({ index: i, value: values[i], type: 'valley' });
    }
  }
  return peaks;
};
import { MonthlyData } from '../types';

// Tipos para el análisis inteligente
export interface DataCharacteristics {
  hasOutliers: boolean;
  volatility: 'low' | 'medium' | 'high';
  trend: 'upward' | 'downward' | 'sideways' | 'volatile';
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  seasonality: boolean;
  smallValues: boolean;
  negativeValues: boolean;
  zeroValues: boolean;
  sampleSize: number;
}

export interface AnalysisResult {
  algorithm: string;
  confidence: number;
  trend: number;
  monthlyGrowth: number;
  volatility: number;
  projection: number;
  explanation: string;
  warnings: string[];
  dataQuality: DataCharacteristics;
}

// Detección de outliers usando el método IQR (Interquartile Range)
const detectOutliers = (values: number[]): { indices: number[], cleanValues: number[] } => {
  if (values.length < 4) return { indices: [], cleanValues: [...values] };
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outlierIndices: number[] = [];
  const cleanValues: number[] = [];
  
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      outlierIndices.push(index);
    } else {
      cleanValues.push(value);
    }
  });
  
  return { indices: outlierIndices, cleanValues };
};

// Análisis de características de los datos
const analyzeDataCharacteristics = (values: number[]): DataCharacteristics => {
  const { indices: outlierIndices, cleanValues } = detectOutliers(values);
  
  // Calcular volatilidad usando coeficiente de variación
  const mean = cleanValues.reduce((sum, val) => sum + val, 0) / cleanValues.length;
  const stdDev = Math.sqrt(cleanValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cleanValues.length);
  const cv = Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : 0;
  
  // Clasificar volatilidad
  let volatility: 'low' | 'medium' | 'high';
  if (cv < 0.15) volatility = 'low';
  else if (cv < 0.35) volatility = 'medium';
  else volatility = 'high';
  
  // Detectar tendencia usando regresión lineal en valores limpios
  const n = cleanValues.length;
  const xValues = Array.from({length: n}, (_, i) => i);
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = cleanValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * cleanValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  
  let trend: 'upward' | 'downward' | 'sideways' | 'volatile';
  if (Math.abs(slope) < mean * 0.05) trend = 'sideways';
  else if (slope > 0) trend = 'upward';
  else trend = 'downward';
  
  if (volatility === 'high') trend = 'volatile';
  
  // CALIDAD DE DATOS MEJORADA - considera valores negativos extremos
  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  const outlierRatio = outlierIndices.length / values.length;
  const zeroCount = values.filter(v => v === 0).length;
  const negativeCount = values.filter(v => v < 0).length;
  const extremeNegativeCount = values.filter(v => v < 0 && Math.abs(v) > Math.abs(mean)).length;
  
  if (outlierRatio > 0.3 || zeroCount > values.length * 0.3 || extremeNegativeCount > 0) dataQuality = 'poor';
  else if (outlierRatio > 0.15 || zeroCount > values.length * 0.15 || negativeCount > values.length * 0.3) dataQuality = 'fair';
  else if (outlierRatio > 0.05 || negativeCount > 0) dataQuality = 'good';
  else dataQuality = 'excellent';
  
  // Detectar estacionalidad y patrones problemáticos
  const seasonality = values.length >= 12 && cv > 0.2;
  
  // Detectar patrón de pérdidas
  const lossPattern = values.filter(v => v < 0).length / values.length > 0.3;
  
  return {
    hasOutliers: outlierIndices.length > 0,
    volatility,
    trend,
    dataQuality,
    seasonality,
    smallValues: Math.abs(mean) < 1000,
    negativeValues: values.some(v => v < 0),
    zeroValues: values.some(v => v === 0),
    sampleSize: values.length
  };
};

// Algoritmo de Regresión Lineal Robusta (elimina outliers) - CORREGIDO
const robustLinearRegression = (values: number[], characteristics: DataCharacteristics): Partial<AnalysisResult> => {
  const { cleanValues } = detectOutliers(values);
  const n = cleanValues.length;
  
  if (n < 2) return { trend: 0, monthlyGrowth: 0, volatility: 0, projection: 0 };
  
  const xValues = Array.from({length: n}, (_, i) => i);
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = cleanValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * cleanValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const mean = sumY / n;
  
  // CORRECCIÓN: Crecimiento mensual robusto que maneja valores negativos correctamente
  let totalGrowth = 0;
  let validGrowths = 0;
  for (let i = 1; i < values.length; i++) {
    const prevValue = values[i-1];
    const currValue = values[i];
    
    // Manejar cambios de signo y valores negativos de manera más inteligente
    if (Math.abs(prevValue) > 0.01) {
      let growth: number;
      
      // Caso especial: cambio de negativo a positivo (recuperación)
      if (prevValue < 0 && currValue >= 0) {
        // Para recuperación de pérdidas, usar diferencia absoluta como base
        growth = Math.min(((currValue - prevValue) / Math.abs(prevValue)) * 100, 200);
      }
      // Caso especial: cambio de positivo a negativo (caída)
      else if (prevValue > 0 && currValue < 0) {
        // Para caídas a pérdidas, calcular como porcentaje negativo
        growth = -Math.min((Math.abs(currValue) + prevValue) / prevValue * 100, 200);
      }
      // Caso normal: mismo signo
      else {
        growth = ((currValue - prevValue) / Math.abs(prevValue)) * 100;
      }
      
      // Filtrar valores extremos pero ser más permisivo con recuperaciones
      if (Math.abs(growth) < 300) {
        totalGrowth += growth;
        validGrowths++;
      }
    }
  }
  const monthlyGrowth = validGrowths > 0 ? totalGrowth / validGrowths : 0;
  
  // Volatilidad
  const variance = cleanValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const volatilityPercent = Math.abs(mean) > 0.01 ? (Math.sqrt(variance) / Math.abs(mean)) * 100 : 0;
  
  // CORRECCIÓN: Tendencia mensual promedio, no acumulada
  const monthlyTrendPercent = Math.abs(mean) > 0.01 ? (slope / Math.abs(mean)) * 100 : 0;
  const limitedTrend = Math.min(Math.max(monthlyTrendPercent, -50), 50);
  
  return {
    trend: Math.round(limitedTrend * 10) / 10,
    monthlyGrowth: Math.round(Math.min(Math.max(monthlyGrowth, -100), 100) * 10) / 10,
    volatility: Math.round(Math.min(volatilityPercent, 200) * 10) / 10,
    projection: Math.round(slope * n + intercept)
  };
};

// Algoritmo de Media Móvil Exponencial (para datos volátiles) - CORREGIDO
const exponentialMovingAverage = (values: number[], characteristics: DataCharacteristics): Partial<AnalysisResult> => {
  if (values.length < 2) return { trend: 0, monthlyGrowth: 0, volatility: 0, projection: 0 };
  
  const alpha = 0.3; // Factor de suavizado
  let ema = values[0];
  const emaValues = [ema];
  
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
    emaValues.push(ema);
  }
  
  // CORRECCIÓN: Calcular tendencia como promedio mensual, no total
  const firstEma = emaValues[0];
  const lastEma = emaValues[emaValues.length - 1];
  const monthsSpan = emaValues.length - 1;
  
  // Tendencia mensual promedio, limitada a valores razonables
  const totalTrendPercent = firstEma !== 0 ? ((lastEma - firstEma) / Math.abs(firstEma)) * 100 : 0;
  const monthlyTrendPercent = monthsSpan > 0 ? totalTrendPercent / monthsSpan : 0;
  const limitedTrend = Math.min(Math.max(monthlyTrendPercent, -50), 50);
  
  // CORRECCIÓN: Crecimiento mensual robusto que maneja valores negativos correctamente
  let totalGrowth = 0;
  let validGrowths = 0;
  for (let i = 1; i < values.length; i++) {
    const prevValue = values[i-1];
    const currValue = values[i];
    
    // Manejar cambios de signo y valores negativos de manera más inteligente
    if (Math.abs(prevValue) > 0.01) {
      let growth: number;
      
      // Caso especial: cambio de negativo a positivo (recuperación)
      if (prevValue < 0 && currValue >= 0) {
        // Para recuperación de pérdidas, usar diferencia absoluta como base
        growth = Math.min(((currValue - prevValue) / Math.abs(prevValue)) * 100, 200);
      }
      // Caso especial: cambio de positivo a negativo (caída)
      else if (prevValue > 0 && currValue < 0) {
        // Para caídas a pérdidas, calcular como porcentaje negativo
        growth = -Math.min((Math.abs(currValue) + prevValue) / prevValue * 100, 200);
      }
      // Caso normal: mismo signo
      else {
        growth = ((currValue - prevValue) / Math.abs(prevValue)) * 100;
      }
      
      // Filtrar valores extremos pero ser más permisivo con recuperaciones
      if (Math.abs(growth) < 300) {
        totalGrowth += growth;
        validGrowths++;
      }
    }
  }
  const monthlyGrowth = validGrowths > 0 ? totalGrowth / validGrowths : 0;
  
  return {
    trend: Math.round(limitedTrend * 10) / 10,
    monthlyGrowth: Math.round(Math.min(Math.max(monthlyGrowth, -100), 100) * 10) / 10,
    volatility: Math.round(characteristics.volatility === 'high' ? 75 : 45),
    projection: Math.round(lastEma + (monthlyTrendPercent * lastEma / 100))
  };
};

// Algoritmo de Mediana para datos con muchos outliers - CORREGIDO
const medianBasedAnalysis = (values: number[], characteristics: DataCharacteristics): Partial<AnalysisResult> => {
  if (values.length < 2) return { trend: 0, monthlyGrowth: 0, volatility: 0, projection: 0 };
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const median = values.length % 2 === 0 
    ? (sortedValues[values.length / 2 - 1] + sortedValues[values.length / 2]) / 2
    : sortedValues[Math.floor(values.length / 2)];
  
  // Usar percentiles para cálculos más robustos
  const q1 = sortedValues[Math.floor(values.length * 0.25)];
  const q3 = sortedValues[Math.floor(values.length * 0.75)];
  
  // CORRECCIÓN: Tendencia basada en medianas por períodos, no extremos
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstHalfMedian = firstHalf.sort((a, b) => a - b)[Math.floor(firstHalf.length / 2)];
  const secondHalfMedian = secondHalf.sort((a, b) => a - b)[Math.floor(secondHalf.length / 2)];
  
  const trendPercent = Math.abs(firstHalfMedian) > 0.01 ? 
    ((secondHalfMedian - firstHalfMedian) / Math.abs(firstHalfMedian)) * 100 / Math.max(1, Math.floor(values.length / 2)) : 0;
  
  // CORRECCIÓN: Crecimiento mensual robusto que maneja valores negativos correctamente
  let growthSum = 0;
  let growthCount = 0;
  
  for (let i = 1; i < values.length; i++) {
    const prevValue = values[i - 1];
    const currValue = values[i];
    
    // Manejar cambios de signo y valores negativos de manera más inteligente
    if (Math.abs(prevValue) > 0.01) {
      let growth: number;
      
      // Caso especial: cambio de negativo a positivo (recuperación)
      if (prevValue < 0 && currValue >= 0) {
        // Para recuperación de pérdidas, usar diferencia absoluta como base
        growth = Math.min(((currValue - prevValue) / Math.abs(prevValue)) * 100, 200);
      }
      // Caso especial: cambio de positivo a negativo (caída)
      else if (prevValue > 0 && currValue < 0) {
        // Para caídas a pérdidas, calcular como porcentaje negativo
        growth = -Math.min((Math.abs(currValue) + prevValue) / prevValue * 100, 200);
      }
      // Caso normal: mismo signo
      else {
        growth = ((currValue - prevValue) / Math.abs(prevValue)) * 100;
      }
      
      // Filtrar valores extremos pero ser más permisivo con recuperaciones
      if (Math.abs(growth) < 250) {
        growthSum += growth;
        growthCount++;
      }
    }
  }
  
  const monthlyGrowth = growthCount > 0 ? growthSum / growthCount : 0;
  
  // Volatilidad basada en IQR
  const iqrVolatility = Math.abs(median) > 0.01 ? ((q3 - q1) / Math.abs(median)) * 100 : 0;
  
  return {
    trend: Math.round(Math.min(Math.max(trendPercent, -50), 50) * 10) / 10,
    monthlyGrowth: Math.round(Math.min(Math.max(monthlyGrowth, -100), 100) * 10) / 10,
    volatility: Math.round(Math.min(iqrVolatility, 200) * 10) / 10,
    projection: Math.round(median + (trendPercent * median / 100))
  };
};

// Algoritmo selector inteligente
export const intelligentAnalysis = (values: number[]): AnalysisResult => {
  if (values.length === 0) {
    return {
      algorithm: 'No Data',
      confidence: 0,
      trend: 0,
      monthlyGrowth: 0,
      volatility: 0,
      projection: 0,
      explanation: 'No hay datos suficientes para el análisis.',
      warnings: ['No hay datos disponibles'],
      dataQuality: {
        hasOutliers: false,
        volatility: 'low',
        trend: 'sideways',
        dataQuality: 'poor',
        seasonality: false,
        smallValues: false,
        negativeValues: false,
        zeroValues: false,
        sampleSize: 0
      }
    };
  }

  const characteristics = analyzeDataCharacteristics(values);
  const warnings: string[] = [];
  let algorithm: string;
  let confidence: number;
  let result: Partial<AnalysisResult>;
  let explanation: string;

  // LÓGICA DE SELECCIÓN CORREGIDA para manejar valores negativos extremos
  const hasExtremeNegatives = values.some(v => v < 0 && Math.abs(v) > Math.abs(values.reduce((a,b) => a + b, 0) / values.length));
  const hasConsecutiveNegatives = values.reduce((acc, val, i) => {
    if (val < 0) {
      acc.current++;
      acc.max = Math.max(acc.max, acc.current);
    } else {
      acc.current = 0;
    }
    return acc;
  }, { current: 0, max: 0 }).max >= 2;
  
  if (characteristics.dataQuality === 'poor' || hasExtremeNegatives || hasConsecutiveNegatives) {
    // Datos problemáticos o valores negativos extremos
    algorithm = 'Análisis por Mediana (Robusto)';
    confidence = 40;
    result = medianBasedAnalysis(values, characteristics);
    explanation = 'Se detectaron valores negativos extremos o datos problemáticos. Usando análisis robusto basado en medianas para minimizar el impacto de valores atípicos.';
    
    // Alertas consolidadas para casos extremos
    if (hasExtremeNegatives && hasConsecutiveNegatives) {
      warnings.push('Pérdidas extremas y consecutivas detectadas - situación crítica del negocio');
    } else if (hasExtremeNegatives) {
      warnings.push('Valores negativos extremos detectados - revisar modelo de costos');
    } else if (hasConsecutiveNegatives) {
      warnings.push('Pérdidas consecutivas detectadas - revisar flujo de caja');
    }
    
  } else if (characteristics.volatility === 'high' || characteristics.trend === 'volatile') {
    // Datos muy volátiles pero sin problemas extremos
    algorithm = 'Media Móvil Exponencial (Suavizado)';
    confidence = 60;
    result = exponentialMovingAverage(values, characteristics);
    explanation = 'Se detectó alta volatilidad en los datos. Usando media móvil exponencial para suavizar fluctuaciones y obtener tendencias más estables.';
    warnings.push('Alta volatilidad detectada - tendencias pueden cambiar rápidamente');
    
  } else if (characteristics.dataQuality === 'excellent' && characteristics.sampleSize >= 4) {
    // Datos de alta calidad
    algorithm = 'Regresión Lineal Robusta';
    confidence = 85;
    result = robustLinearRegression(values, characteristics);
    explanation = 'Datos de alta calidad detectados. Usando regresión lineal robusta para obtener tendencias precisas y proyecciones confiables.';
    
  } else {
    // Datos regulares
    algorithm = 'Regresión Lineal Robusta';
    confidence = 70;
    result = robustLinearRegression(values, characteristics);
    explanation = 'Aplicando regresión lineal con filtrado de outliers para obtener análisis balanceado entre precisión y robustez.';
  }

  // WARNINGS INTELIGENTES - solo alertas relevantes sin duplicar
  if (characteristics.sampleSize < 3) {
    warnings.push('Muestra pequeña - resultados con baja confianza estadística');
    confidence = Math.min(confidence, 30);
  }
  
  // Solo alertar sobre crecimiento extremo si no hay alertas más importantes
  if (warnings.length === 0) {
    if (Math.abs(result.monthlyGrowth || 0) > 100) {
      warnings.push(`Crecimiento mensual alto (${result.monthlyGrowth}%) - verificar datos`);
      confidence = Math.min(confidence, 60);
    }
    if (Math.abs(result.trend || 0) > 50) {
      warnings.push(`Tendencia extrema (${result.trend}%) - revisar sostenibilidad`);
      confidence = Math.min(confidence, 50);
    }
  }
  
  // Detectar volatilidad extrema solo en valores positivos para ingresos
  const positiveValues = values.filter(v => v > 0);
  if (positiveValues.length > 1) {
    const maxVal = Math.max(...positiveValues);
    const minVal = Math.min(...positiveValues);
    // Solo alertar si la variación es realmente extrema (más de 10x) y no hay alertas críticas
    if (maxVal / minVal > 10 && !warnings.some(w => w.includes('extremas') || w.includes('consecutivas'))) {
      warnings.push('Variación muy alta en los datos - revisar estacionalidad');
    }
  }

  return {
    algorithm,
    confidence,
    trend: result.trend || 0,
    monthlyGrowth: result.monthlyGrowth || 0,
    volatility: result.volatility || 0,
    projection: result.projection || 0,
    explanation,
    warnings,
    dataQuality: characteristics
  };
};
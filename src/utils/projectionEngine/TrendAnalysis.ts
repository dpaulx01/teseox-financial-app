/**
 * Motor de Análisis de Tendencias - Balance Interno
 * Analiza tendencias históricas para proyecciones inteligentes
 */

import { MonthlyData } from '../../types';

export interface TrendResult {
  slope: number;
  intercept: number;
  rSquared: number;
  confidence: 'high' | 'medium' | 'low';
  direction: 'increasing' | 'decreasing' | 'stable';
  monthlyGrowthRate: number;
}

export interface ProjectionOptions {
  monthsAhead: number;
  includeSeasonality?: boolean;
  confidenceLevel?: number;
}

export class TrendAnalysis {
  /**
   * Calcula la tendencia usando regresión lineal
   */
  static calculateTrend(values: number[]): TrendResult {
    const n = values.length;
    if (n < 3) {
      return {
        slope: 0,
        intercept: values[values.length - 1] || 0,
        rSquared: 0,
        confidence: 'low',
        direction: 'stable',
        monthlyGrowthRate: 0
      };
    }

    // Preparar datos para regresión lineal
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = values;

    // Calcular regresión lineal
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R²
    const meanY = sumY / n;
    const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
    const ssResidual = y.reduce((acc, yi, i) => {
      const predicted = slope * (i + 1) + intercept;
      return acc + Math.pow(yi - predicted, 2);
    }, 0);
    
    const rSquared = Math.max(0, 1 - (ssResidual / ssTotal));

    // Determinar confianza
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (rSquared > 0.8) confidence = 'high';
    else if (rSquared > 0.5) confidence = 'medium';

    // Determinar dirección
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.1) {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }

    // Calcular tasa de crecimiento mensual
    const lastValue = values[values.length - 1];
    const monthlyGrowthRate = lastValue !== 0 ? (slope / lastValue) * 100 : 0;

    return {
      slope,
      intercept,
      rSquared,
      confidence,
      direction,
      monthlyGrowthRate
    };
  }

  /**
   * Proyecta valores futuros basado en tendencia
   */
  static projectFuture(
    historicalValues: number[],
    options: ProjectionOptions
  ): number[] {
    const trend = this.calculateTrend(historicalValues);
    const projections: number[] = [];
    const lastPeriod = historicalValues.length;

    for (let i = 1; i <= options.monthsAhead; i++) {
      const projectedValue = trend.slope * (lastPeriod + i) + trend.intercept;
      
      // Aplicar límites razonables
      const cleanValue = Math.max(0, projectedValue);
      projections.push(cleanValue);
    }

    return projections;
  }

  /**
   * Analiza volatilidad de la serie temporal
   */
  static calculateVolatility(values: number[]): {
    standardDeviation: number;
    coefficientOfVariation: number;
    volatilityLevel: 'low' | 'medium' | 'high';
  } {
    if (values.length < 2) {
      return {
        standardDeviation: 0,
        coefficientOfVariation: 0,
        volatilityLevel: 'low'
      };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? (standardDeviation / mean) * 100 : 0;

    let volatilityLevel: 'low' | 'medium' | 'high' = 'low';
    if (coefficientOfVariation > 50) volatilityLevel = 'high';
    else if (coefficientOfVariation > 20) volatilityLevel = 'medium';

    return {
      standardDeviation,
      coefficientOfVariation,
      volatilityLevel
    };
  }

  /**
   * Detecta puntos de inflexión en la serie
   */
  static detectInflectionPoints(values: number[]): {
    indices: number[];
    types: ('peak' | 'trough')[];
    significance: number[];
  } {
    const inflectionPoints: number[] = [];
    const types: ('peak' | 'trough')[] = [];
    const significance: number[] = [];

    for (let i = 1; i < values.length - 1; i++) {
      const prev = values[i - 1];
      const current = values[i];
      const next = values[i + 1];

      // Detectar pico
      if (current > prev && current > next) {
        inflectionPoints.push(i);
        types.push('peak');
        significance.push(Math.min(current - prev, current - next));
      }
      // Detectar valle
      else if (current < prev && current < next) {
        inflectionPoints.push(i);
        types.push('trough');
        significance.push(Math.min(prev - current, next - current));
      }
    }

    return {
      indices: inflectionPoints,
      types,
      significance
    };
  }
}
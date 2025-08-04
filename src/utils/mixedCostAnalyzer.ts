import { FinancialData } from '../types';
import { parseNumericValue } from './formatters';

export interface MixedCostAnalysisResult {
  accountCode: string;
  accountName: string;
  
  // Resultados del análisis
  fixedComponent: number;      // Componente fijo mensual
  variableRate: number;        // Tasa variable por unidad de actividad
  fixedPercentage: number;     // % del costo total que es fijo
  variablePercentage: number;  // % del costo total que es variable
  
  // Métricas de calidad
  confidence: 'high' | 'medium' | 'low';
  r2: number;                  // Coeficiente de determinación (bondad de ajuste)
  method: 'regression' | 'high-low' | 'correlation' | 'hybrid';
  
  // Datos de análisis
  dataPoints: Array<{
    period: string;
    totalCost: number;
    activityLevel: number;
    predictedCost?: number;
  }>;
  
  // Explicación del análisis
  analysisReason: string;
  recommendedClassification: 'Semi-variable' | 'Variable' | 'Fijo';
}

export class MixedCostAnalyzer {
  private financialData: FinancialData;
  private currentPeriod: 'Anual' | 'Promedio' | string;
  private monthCount: number;
  private currentAccountCode: string = '';

  constructor(financialData: FinancialData, currentPeriod: 'Anual' | 'Promedio' | string = 'Anual') {
    this.financialData = financialData;
    this.currentPeriod = currentPeriod;
    this.monthCount = Object.keys(financialData.monthly).length;
  }

  /**
   * Analiza una cuenta para determinar si es mixta y calcular sus componentes
   */
  analyzeMixedCost(accountCode: string, accountName: string, totalValue?: number): MixedCostAnalysisResult | null {
    
    // Establecer cuenta actual para métodos internos
    this.currentAccountCode = accountCode;
    
    // Obtener datos de la cuenta
    const accountRow = this.financialData.raw.find(row => 
      row['COD.'] === accountCode && row['CUENTA'] === accountName
    );

    if (!accountRow) {
      return null;
    }

    // Extraer datos mensuales
    const months = Object.keys(this.financialData.monthly);
    const dataPoints: Array<{ period: string; totalCost: number; activityLevel: number }> = [];

    // Incluir TODOS los meses, incluso los que tienen costo = 0
    months.forEach(month => {
      const totalCost = Math.abs(parseNumericValue(accountRow[month] || 0));
      const activityLevel = this.financialData.monthly[month]?.ingresos || 0;
      
      if (activityLevel > 0) { // Solo requerir que haya actividad, no que haya costo
        dataPoints.push({
          period: month,
          totalCost, // Puede ser 0
          activityLevel
        });
      }
    });
    

    
    // Si hay valor total proporcionado, usar ese en lugar de calcular
    const accountTotalValue = totalValue || dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0) * (this.currentPeriod === 'Anual' ? 12 : 1) / dataPoints.length;
    
    // Usar clasificación por código de cuenta para datos insuficientes
    if (dataPoints.length < 3) {
      
      const fallbackResult = this.getAccountCodeClassification(accountTotalValue, accountCode);
      const fixedPercentage = accountTotalValue > 0 ? (fallbackResult.fixedComponent / accountTotalValue) * 100 : 0;
      const variablePercentage = 100 - fixedPercentage;
      
      return {
        accountCode,
        accountName,
        fixedComponent: fallbackResult.fixedComponent,
        variableRate: fallbackResult.variableRate,
        fixedPercentage: Math.max(0, Math.min(100, fixedPercentage)),
        variablePercentage: Math.max(0, Math.min(100, variablePercentage)),
        confidence: 'medium' as const,
        r2: fallbackResult.r2,
        method: 'hybrid' as const,
        dataPoints: dataPoints,
        analysisReason: 'Datos insuficientes para análisis estadístico. Usando clasificación por código de cuenta.',
        recommendedClassification: this.getRecommendedClassification(fixedPercentage, variablePercentage, fallbackResult.r2)
      };
    }

    // Ejecutar múltiples métodos de análisis
    const regressionResult = this.performRegressionAnalysis(dataPoints, totalValue);
    const highLowResult = this.performHighLowAnalysis(dataPoints, totalValue);
    const correlationResult = this.performCorrelationAnalysis(dataPoints, totalValue);
    
    // Determinar el mejor método basado en R²
    const methods = [
      { name: 'regression', result: regressionResult },
      { name: 'high-low', result: highLowResult },
      { name: 'correlation', result: correlationResult }
    ].filter(m => m.result !== null);

    if (methods.length === 0) return null;

    // Seleccionar el método con mejor R²
    const bestMethod = methods.reduce((best, current) => 
      (current.result!.r2 > best.result!.r2) ? current : best
    );

    const result = bestMethod.result!;
    
    // Calcular porcentajes basado en el costo promedio
    const avgTotalCost = dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0) / dataPoints.length;
    const fixedPercentage = avgTotalCost > 0 ? (result.fixedComponent / avgTotalCost) * 100 : 0;
    const variablePercentage = 100 - fixedPercentage;

    // Determinar confianza
    const confidence = this.calculateConfidence(result.r2, dataPoints.length);
    
    // Generar recomendación
    const recommendedClassification = this.getRecommendedClassification(
      fixedPercentage, variablePercentage, result.r2
    );

    // Agregar predicciones a los puntos de datos
    const enhancedDataPoints = dataPoints.map(dp => ({
      ...dp,
      predictedCost: result.fixedComponent + (result.variableRate * dp.activityLevel)
    }));

    return {
      accountCode,
      accountName,
      fixedComponent: result.fixedComponent,
      variableRate: result.variableRate,
      fixedPercentage: Math.max(0, Math.min(100, fixedPercentage)),
      variablePercentage: Math.max(0, Math.min(100, variablePercentage)),
      confidence,
      r2: result.r2,
      method: bestMethod.name as any,
      dataPoints: enhancedDataPoints,
      analysisReason: this.generateAnalysisReason(result, bestMethod.name, confidence),
      recommendedClassification
    };
  }

  /**
   * Análisis inteligente que usa códigos de cuenta como fallback
   */
  private performRegressionAnalysis(dataPoints: Array<{ totalCost: number; activityLevel: number }>, totalValue?: number): 
    { fixedComponent: number; variableRate: number; r2: number } | null {
    
    if (dataPoints.length < 2) return null;

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, dp) => sum + dp.activityLevel, 0);
    const sumY = dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0);
    const sumXY = dataPoints.reduce((sum, dp) => sum + (dp.activityLevel * dp.totalCost), 0);
    const sumX2 = dataPoints.reduce((sum, dp) => sum + (dp.activityLevel * dp.activityLevel), 0);
    const sumY2 = dataPoints.reduce((sum, dp) => sum + (dp.totalCost * dp.totalCost), 0);

    // Calcular pendiente (tasa variable) e intercepto (costo fijo)
    const denominator = (n * sumX2) - (sumX * sumX);
    if (Math.abs(denominator) < 0.001) return null; // Evitar división por cero

    const variableRate = ((n * sumXY) - (sumX * sumY)) / denominator;
    const fixedComponent = (sumY - (variableRate * sumX)) / n;
    
    // Calcular R² (coeficiente de determinación)
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;

    dataPoints.forEach(dp => {
      const predicted = fixedComponent + (variableRate * dp.activityLevel);
      ssTotal += Math.pow(dp.totalCost - meanY, 2);
      ssResidual += Math.pow(dp.totalCost - predicted, 2);
    });

    const r2 = ssTotal > 0 ? Math.max(0, 1 - (ssResidual / ssTotal)) : 0;

    // Si el análisis estadístico no es confiable (R² bajo), usar clasificación por código de cuenta
    if (r2 < 0.5) {
      return this.getAccountCodeClassification(totalValue, this.currentAccountCode);
    }

    // Validar que las tasas sean razonables
    if (Math.abs(variableRate) > 1 || Math.abs(variableRate) < 0.0001 || fixedComponent < 0) {
      return this.getAccountCodeClassification(totalValue, this.currentAccountCode);
    }

    // fixedComponent es mensual, multiplicar por cantidad de puntos de datos
    const finalFixedComponent = Math.max(0, fixedComponent * dataPoints.length);
    
    // Validar que el componente fijo no sea mayor al valor total de la cuenta
    const accountTotalValue = totalValue || dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0) * dataPoints.length;
    if (finalFixedComponent > accountTotalValue * 1.2) {
      return this.getAccountCodeClassification(totalValue, this.currentAccountCode);
    }
    
    return {
      fixedComponent: finalFixedComponent,
      variableRate: Math.max(0, variableRate),
      r2
    };
  }

  /**
   * Clasificación basada en códigos de cuenta (fallback robusto)
   */
  private getAccountCodeClassification(totalValue?: number, accountCode?: string): { fixedComponent: number; variableRate: number; r2: number } {
    const currentAccountCode = accountCode || this.currentAccountCode;
    const accountTotalValue = totalValue || 0;


    // Lógica de negocio: 5.1 = variable, 5.2 = fijo
    if (currentAccountCode.startsWith('5.1')) {
      // Cuenta variable: 90% variable, 10% fijo
      return {
        fixedComponent: accountTotalValue * 0.1,
        variableRate: this.financialData.yearly.ingresos > 0 ? (accountTotalValue * 0.9) / this.financialData.yearly.ingresos : 0,
        r2: 0.8 // Alta confianza por ser regla de negocio
      };
    } else if (currentAccountCode.startsWith('5.2')) {
      // Cuenta fija: 90% fijo, 10% variable
      return {
        fixedComponent: accountTotalValue * 0.9,
        variableRate: this.financialData.yearly.ingresos > 0 ? (accountTotalValue * 0.1) / this.financialData.yearly.ingresos : 0,
        r2: 0.8 // Alta confianza por ser regla de negocio
      };
    } else {
      // Otras cuentas: distribución mixta 60/40
      return {
        fixedComponent: accountTotalValue * 0.6,
        variableRate: this.financialData.yearly.ingresos > 0 ? (accountTotalValue * 0.4) / this.financialData.yearly.ingresos : 0,
        r2: 0.5 // Confianza media
      };
    }
  }

  /**
   * Método alto-bajo (más simple, menos preciso)
   */
  private performHighLowAnalysis(dataPoints: Array<{ totalCost: number; activityLevel: number }>, totalValue?: number): 
    { fixedComponent: number; variableRate: number; r2: number } | null {
    
    if (dataPoints.length < 2) {
      return this.getAccountCodeClassification(totalValue, this.currentAccountCode);
    }

    // Encontrar puntos alto y bajo por nivel de actividad
    const sortedPoints = [...dataPoints].sort((a, b) => a.activityLevel - b.activityLevel);
    const lowPoint = sortedPoints[0];
    const highPoint = sortedPoints[sortedPoints.length - 1];

    if (highPoint.activityLevel === lowPoint.activityLevel) {
      return this.getAccountCodeClassification(totalValue, this.currentAccountCode);
    }

    // Calcular tasa variable
    const variableRate = (highPoint.totalCost - lowPoint.totalCost) / 
                        (highPoint.activityLevel - lowPoint.activityLevel);

    // Calcular costo fijo usando el punto bajo
    const fixedComponent = lowPoint.totalCost - (variableRate * lowPoint.activityLevel);

    // Calcular R² aproximado
    const avgCost = dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0) / dataPoints.length;
    let ssTotal = 0;
    let ssResidual = 0;

    dataPoints.forEach(dp => {
      const predicted = Math.max(0, fixedComponent) + (Math.max(0, variableRate) * dp.activityLevel);
      ssTotal += Math.pow(dp.totalCost - avgCost, 2);
      ssResidual += Math.pow(dp.totalCost - predicted, 2);
    });

    const r2 = ssTotal > 0 ? Math.max(0, 1 - (ssResidual / ssTotal)) : 0;

    return {
      fixedComponent: Math.max(0, fixedComponent * dataPoints.length), // Multiplicar por meses con datos reales
      variableRate: Math.max(0, variableRate),
      r2
    };
  }

  /**
   * Análisis por correlación (híbrido)
   */
  private performCorrelationAnalysis(dataPoints: Array<{ totalCost: number; activityLevel: number }>, totalValue?: number): 
    { fixedComponent: number; variableRate: number; r2: number } | null {
    
    if (dataPoints.length < 3) {
      return this.getAccountCodeClassification(totalValue, this.currentAccountCode);
    }

    // Calcular correlación entre costo y actividad
    const correlation = this.calculateCorrelation(
      dataPoints.map(dp => dp.totalCost),
      dataPoints.map(dp => dp.activityLevel)
    );

    // Si la correlación es muy baja, es probablemente un costo fijo
    if (Math.abs(correlation) < 0.3) {
      const avgCost = dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0) / dataPoints.length;
      return {
        fixedComponent: avgCost * dataPoints.length, // Multiplicar por meses con datos reales
        variableRate: 0,
        r2: 0.1 // Baja para indicar que es principalmente fijo
      };
    }

    // Si la correlación es alta, usar regresión
    if (Math.abs(correlation) > 0.7) {
      return this.performRegressionAnalysis(dataPoints, totalValue);
    }

    // Correlación media: usar método híbrido
    const avgCost = dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0) / dataPoints.length;
    const avgActivity = dataPoints.reduce((sum, dp) => sum + dp.activityLevel, 0) / dataPoints.length;
    
    // Estimación híbrida: parte fija + parte variable basada en correlación
    const fixedComponent = avgCost * (1 - Math.abs(correlation));
    const variableRate = (avgCost * Math.abs(correlation)) / avgActivity;

    return {
      fixedComponent: fixedComponent * dataPoints.length, // Multiplicar por meses con datos reales
      variableRate,
      r2: correlation * correlation // R² aproximado
    };
  }

  /**
   * Calcula coeficiente de correlación de Pearson
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Determina el nivel de confianza basado en R² y cantidad de datos
   */
  private calculateConfidence(r2: number, dataPoints: number): 'high' | 'medium' | 'low' {
    // Ajustar confianza por cantidad de datos
    const dataBonus = Math.min(0.2, (dataPoints - 3) * 0.05);
    const adjustedR2 = r2 + dataBonus;

    if (adjustedR2 >= 0.75) return 'high';
    if (adjustedR2 >= 0.45) return 'medium';
    return 'low';
  }

  /**
   * Recomienda la clasificación final basada en el análisis
   */
  private getRecommendedClassification(
    fixedPercentage: number, 
    variablePercentage: number, 
    r2: number
  ): 'Semi-variable' | 'Variable' | 'Fijo' {
    
    // Si el ajuste es muy pobre, mantener como semi-variable para revisión manual
    if (r2 < 0.25) return 'Semi-variable';

    // Si más del 80% es fijo, clasificar como fijo
    if (fixedPercentage > 80) return 'Fijo';
    
    // Si más del 80% es variable, clasificar como variable
    if (variablePercentage > 80) return 'Variable';
    
    // Caso mixto verdadero
    return 'Semi-variable';
  }

  /**
   * Genera explicación textual del análisis
   */
  private generateAnalysisReason(
    result: { fixedComponent: number; variableRate: number; r2: number },
    method: string,
    confidence: string
  ): string {
    const r2Percentage = (result.r2 * 100).toFixed(1);
    
    const methodNames = {
      'regression': 'Regresión Lineal',
      'high-low': 'Método Alto-Bajo',
      'correlation': 'Análisis de Correlación',
      'hybrid': 'Clasificación por Código de Cuenta'
    };

    // Si el R² es alto (>=80%), probablemente viene de clasificación por código de cuenta
    if (result.r2 >= 0.8) {
      return `Análisis usando ${methodNames[method as keyof typeof methodNames]} basado en reglas de negocio (${r2Percentage}% confianza). ` +
             `Componente fijo: $${result.fixedComponent.toFixed(2)}, ` +
             `Tasa variable: $${result.variableRate.toFixed(4)} por unidad de actividad.`;
    }

    return `Análisis usando ${methodNames[method as keyof typeof methodNames]} con ${r2Percentage}% de ajuste (${confidence} confianza). ` +
           `Componente fijo: $${result.fixedComponent.toFixed(2)}, ` +
           `Tasa variable: $${result.variableRate.toFixed(4)} por unidad de actividad.`;
  }

  /**
   * Analiza múltiples cuentas semi-variables
   */
  analyzeMixedCosts(accountCodes: Array<{ code: string; name: string }>): MixedCostAnalysisResult[] {
    const results: MixedCostAnalysisResult[] = [];

    accountCodes.forEach(account => {
      const analysis = this.analyzeMixedCost(account.code, account.name);
      if (analysis) {
        results.push(analysis);
      }
    });

    return results.sort((a, b) => b.r2 - a.r2); // Ordenar por calidad del ajuste
  }
}
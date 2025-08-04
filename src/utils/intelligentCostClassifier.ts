import { CostClassification, FinancialData } from '../types';
import { 
  PROFESSIONAL_COST_CLASSIFICATION, 
  SEMANTIC_PATTERNS, 
  STRUCTURAL_PATTERNS,
  CLASSIFICATION_ALGORITHM_CONFIG 
} from '../constants/professionalCostClassification';
import { parseNumericValue } from './formatters';
import { MixedCostAnalyzer, MixedCostAnalysisResult } from './mixedCostAnalyzer';
import { log } from './logger';

export interface ClassificationResult {
  suggested: CostClassification;
  confidence: number;
  reasons: string[];
  requiresConfirmation: boolean;
  analysis: {
    semantic: { score: number; matches: string[] };
    behavioral: { correlation: number; volatility: number; score: number };
    structural: { score: number; matches: string[] };
  };
  // Análisis de costos mixtos
  mixedCostAnalysis?: MixedCostAnalysisResult;
  mixedCostBreakdown?: {
    fixedPercentage: number;
    variablePercentage: number;
    confidence: 'high' | 'medium' | 'low';
    method: string;
  };
}

export interface IntelligentClassifierConfig {
  enableSemanticAnalysis: boolean;
  enableBehavioralAnalysis: boolean;
  enableStructuralAnalysis: boolean;
  minConfidenceForAutoClassification: number;
}

export class IntelligentCostClassifier {
  private config: IntelligentClassifierConfig;
  private financialData: FinancialData | null = null;
  private mixedCostAnalyzer: MixedCostAnalyzer | null = null;

  constructor(config: Partial<IntelligentClassifierConfig> = {}) {
    this.config = {
      enableSemanticAnalysis: true,
      enableBehavioralAnalysis: true,
      enableStructuralAnalysis: true,
      minConfidenceForAutoClassification: CLASSIFICATION_ALGORITHM_CONFIG.confidence.high,
      ...config
    };
  }

  setFinancialData(data: FinancialData) {
    this.financialData = data;
    this.mixedCostAnalyzer = new MixedCostAnalyzer(data);
  }

  /**
   * Clasifica una cuenta usando los tres motores del algoritmo inteligente
   */
  classifyAccount(accountCode: string, accountName: string): ClassificationResult {
    log.debug('IntelligentClassifier', `Classifying account: ${accountCode} - ${accountName}`);
    // Performance: Disabled debug log, this.financialData ? 'YES' : 'NO');
    if (this.financialData) {
      // Performance: Disabled debug log, this.financialData.raw?.length || 0);
      // Performance: Disabled debug log, this.financialData.monthly ? Object.keys(this.financialData.monthly) : []);
    }
    
    // 1. Verificar si ya existe clasificación profesional manual
    const manualClassification = PROFESSIONAL_COST_CLASSIFICATION[accountName];
    if (manualClassification) {
      // Performance: Disabled debug log);
      return {
        suggested: manualClassification,
        confidence: 1.0,
        reasons: ['Clasificación profesional predefinida basada en mejores prácticas contables'],
        requiresConfirmation: false,
        analysis: {
          semantic: { score: 1.0, matches: ['Manual'] },
          behavioral: { correlation: 0, volatility: 0, score: 1.0 },
          structural: { score: 1.0, matches: ['Manual'] }
        }
      };
    }

    // 2. Ejecutar los tres motores del algoritmo
    const semanticResult = this.config.enableSemanticAnalysis ? 
      this.analyzeSemantics(accountName) : { score: 0, classification: null, matches: [] };
    
    const behavioralResult = this.config.enableBehavioralAnalysis && this.financialData ? 
      this.analyzeBehavior(accountCode, accountName) : { score: 0, classification: null, correlation: 0, volatility: 0 };
    
    const structuralResult = this.config.enableStructuralAnalysis ? 
      this.analyzeStructure(accountCode) : { score: 0, classification: null, matches: [] };

    // 3. Combinar resultados usando pesos configurados
    const weights = CLASSIFICATION_ALGORITHM_CONFIG.weights;
    const combinedScores = this.combineAnalysisResults(
      semanticResult, behavioralResult, structuralResult, weights
    );

    // 4. Determinar clasificación final y nivel de confianza
    let finalClassification = this.determineFinalClassification(combinedScores);
    let confidence = this.calculateConfidence(combinedScores, semanticResult, behavioralResult, structuralResult);

    // 5. Análisis de costos mixtos (si aplica)
    let mixedCostAnalysis: MixedCostAnalysisResult | undefined;
    let mixedCostBreakdown: { fixedPercentage: number; variablePercentage: number; confidence: 'high' | 'medium' | 'low'; method: string } | undefined;

    // Performance: Disabled debug log);
    // Performance: Disabled debug log, this.mixedCostAnalyzer ? 'YES' : 'NO');

    if (finalClassification === 'Semi-variable' && this.mixedCostAnalyzer) {
      // Performance: Disabled debug log);
      mixedCostAnalysis = this.mixedCostAnalyzer.analyzeMixedCost(accountCode, accountName);
      // Performance: Disabled debug log, mixedCostAnalysis);
      
      if (mixedCostAnalysis) {
        mixedCostBreakdown = {
          fixedPercentage: mixedCostAnalysis.fixedPercentage,
          variablePercentage: mixedCostAnalysis.variablePercentage,
          confidence: mixedCostAnalysis.confidence,
          method: mixedCostAnalysis.method
        };
        // Performance: Disabled debug log, mixedCostBreakdown);
        
        // Ajustar confianza basada en la calidad del análisis mixto
        if (mixedCostAnalysis.confidence === 'high') {
          confidence = Math.min(1.0, confidence + 0.15);
        } else if (mixedCostAnalysis.confidence === 'low') {
          confidence = Math.max(0.3, confidence - 0.1);
        }
        
        // Usar la recomendación del analizador mixto si tiene alta confianza
        if (mixedCostAnalysis.confidence === 'high' && mixedCostAnalysis.recommendedClassification !== 'Semi-variable') {
          // Performance: Disabled debug log);
          finalClassification = mixedCostAnalysis.recommendedClassification as CostClassification;
        }
      }
    } else {
      // Performance: Disabled debug log);
    }

    // 6. Generar razones explicativas
    const reasons = this.generateReasons(semanticResult, behavioralResult, structuralResult, finalClassification, mixedCostAnalysis);

    return {
      suggested: finalClassification,
      confidence,
      reasons,
      requiresConfirmation: confidence < this.config.minConfidenceForAutoClassification,
      analysis: {
        semantic: { score: semanticResult.score, matches: semanticResult.matches },
        behavioral: { 
          correlation: behavioralResult.correlation, 
          volatility: behavioralResult.volatility, 
          score: behavioralResult.score 
        },
        structural: { score: structuralResult.score, matches: structuralResult.matches }
      },
      mixedCostAnalysis,
      mixedCostBreakdown
    };
  }

  /**
   * Motor 1: Análisis Semántico - Analiza el nombre de la cuenta
   */
  private analyzeSemantics(accountName: string): { score: number; classification: CostClassification | null; matches: string[] } {
    const nameLower = accountName.toLowerCase();
    let bestMatch = { classification: null as CostClassification | null, score: 0, matches: [] as string[] };

    // Buscar patrones en cada categoría
    for (const [classification, patterns] of Object.entries(SEMANTIC_PATTERNS) as [CostClassification, string[]][]) {
      const matches = patterns.filter(pattern => nameLower.includes(pattern.toLowerCase()));
      
      if (matches.length > 0) {
        // Calcular score basado en número de coincidencias y especificidad
        const score = Math.min(0.9, matches.length * 0.3 + 0.4); // Max 90%
        
        if (score > bestMatch.score) {
          bestMatch = { classification, score, matches };
        }
      }
    }

    return {
      score: bestMatch.score,
      classification: bestMatch.classification,
      matches: bestMatch.matches
    };
  }

  /**
   * Motor 2: Análisis de Comportamiento - Analiza correlación con ventas y volatilidad
   */
  private analyzeBehavior(accountCode: string, accountName: string): { 
    score: number; 
    classification: CostClassification | null; 
    correlation: number; 
    volatility: number; 
  } {
    if (!this.financialData?.raw || !this.financialData.monthly) {
      return { score: 0, classification: null, correlation: 0, volatility: 0 };
    }

    // Encontrar la fila de datos para esta cuenta
    const accountRow = this.financialData.raw.find(row => 
      row['COD.'] === accountCode && row['CUENTA'] === accountName
    );

    if (!accountRow) {
      return { score: 0, classification: null, correlation: 0, volatility: 0 };
    }

    // Obtener datos mensuales de la cuenta y de ingresos
    const months = Object.keys(this.financialData.monthly);
    const accountValues: number[] = [];
    const incomeValues: number[] = [];

    months.forEach(month => {
      const accountValue = parseNumericValue(accountRow[month] || 0);
      const incomeValue = this.financialData!.monthly[month]?.ingresos || 0;
      
      accountValues.push(Math.abs(accountValue)); // Usar valor absoluto para costos
      incomeValues.push(incomeValue);
    });

    if (accountValues.length < 3) { // Necesitamos al menos 3 puntos de datos
      return { score: 0.1, classification: null, correlation: 0, volatility: 0 };
    }

    // Calcular correlación con ingresos
    const correlation = this.calculateCorrelation(accountValues, incomeValues);
    
    // Calcular coeficiente de variación (volatilidad)
    const mean = accountValues.reduce((sum, val) => sum + val, 0) / accountValues.length;
    const variance = accountValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / accountValues.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;

    // Determinar clasificación basada en comportamiento
    let behavioralClassification: CostClassification | null = null;
    let score = 0;

    const config = CLASSIFICATION_ALGORITHM_CONFIG;
    
    if (correlation > config.correlation.variable_threshold) {
      behavioralClassification = 'Variable';
      score = Math.min(0.9, correlation);
    } else if (correlation < config.correlation.fixed_threshold && coefficientOfVariation < config.volatility.fixed_cv_max) {
      behavioralClassification = 'Fijo';
      score = Math.min(0.9, 1 - correlation + (1 - Math.min(1, coefficientOfVariation / 0.2)));
    } else if (coefficientOfVariation > config.volatility.variable_cv_min) {
      behavioralClassification = 'Semi-variable';
      score = Math.min(0.8, coefficientOfVariation);
    }

    return {
      score: score || 0.1,
      classification: behavioralClassification,
      correlation,
      volatility: coefficientOfVariation
    };
  }

  /**
   * Motor 3: Análisis Estructural - Analiza el código contable y jerarquía
   */
  private analyzeStructure(accountCode: string): { score: number; classification: CostClassification | null; matches: string[] } {
    let bestMatch = { classification: null as CostClassification | null, score: 0, matches: [] as string[] };

    // Buscar patrones estructurales en cada categoría
    for (const [classification, patterns] of Object.entries(STRUCTURAL_PATTERNS) as [CostClassification, string[]][]) {
      const matches = patterns.filter(pattern => accountCode.startsWith(pattern));
      
      if (matches.length > 0) {
        // Score más alto para coincidencias más específicas
        const specificity = Math.max(...matches.map(m => m.split('.').length));
        const score = Math.min(0.8, 0.3 + specificity * 0.1); // Max 80%
        
        if (score > bestMatch.score) {
          bestMatch = { classification, score, matches };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Combina los resultados de los tres motores usando pesos configurados
   */
  private combineAnalysisResults(
    semantic: any, 
    behavioral: any, 
    structural: any, 
    weights: any
  ): Record<CostClassification, number> {
    const combined: Record<CostClassification, number> = {
      'Variable': 0,
      'Fijo': 0,
      'Semi-variable': 0,
      'Escalonado': 0
    };

    // Agregar puntuaciones ponderadas
    if (semantic.classification) {
      combined[semantic.classification] += semantic.score * weights.semantic;
    }
    
    if (behavioral.classification) {
      combined[behavioral.classification] += behavioral.score * weights.behavioral;
    }
    
    if (structural.classification) {
      combined[structural.classification] += structural.score * weights.structural;
    }

    return combined;
  }

  /**
   * Determina la clasificación final basada en las puntuaciones combinadas
   */
  private determineFinalClassification(scores: Record<CostClassification, number>): CostClassification {
    const maxScore = Math.max(...Object.values(scores));
    const classification = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as CostClassification;
    
    return classification || 'Semi-variable'; // Default fallback
  }

  /**
   * Calcula el nivel de confianza de la clasificación
   */
  private calculateConfidence(scores: Record<CostClassification, number>, semantic: any, behavioral: any, structural: any): number {
    const maxScore = Math.max(...Object.values(scores));
    const totalEvidence = [semantic.score, behavioral.score, structural.score].filter(s => s > 0).length;
    
    // Confianza basada en puntuación máxima y cantidad de evidencia
    const baseConfidence = maxScore;
    const evidenceBonus = Math.min(0.2, totalEvidence * 0.1);
    
    return Math.min(1.0, baseConfidence + evidenceBonus);
  }

  /**
   * Genera razones explicativas para la clasificación
   */
  private generateReasons(semantic: any, behavioral: any, structural: any, finalClassification: CostClassification, mixedCostAnalysis?: MixedCostAnalysisResult): string[] {
    const reasons: string[] = [];

    if (semantic.score > 0) {
      reasons.push(`Análisis semántico: Palabras clave detectadas: ${semantic.matches.join(', ')}`);
    }

    if (behavioral.score > 0) {
      if (behavioral.classification === 'Variable') {
        reasons.push(`Análisis comportamental: Alta correlación con ventas (${(behavioral.correlation * 100).toFixed(1)}%)`);
      } else if (behavioral.classification === 'Fijo') {
        reasons.push(`Análisis comportamental: Baja variabilidad mensual (CV: ${(behavioral.volatility * 100).toFixed(1)}%)`);
      }
    }

    if (structural.score > 0) {
      reasons.push(`Análisis estructural: Código contable coincide con patrón ${structural.matches.join(', ')}`);
    }

    // Agregar información de análisis de costos mixtos
    if (mixedCostAnalysis) {
      const fixedPct = mixedCostAnalysis.fixedPercentage.toFixed(1);
      const variablePct = mixedCostAnalysis.variablePercentage.toFixed(1);
      const methodNames = {
        'regression': 'Regresión Lineal',
        'high-low': 'Método Alto-Bajo',
        'correlation': 'Análisis de Correlación',
        'hybrid': 'Método Híbrido'
      };
      
      reasons.push(`Análisis de costos mixtos: ${fixedPct}% fijo, ${variablePct}% variable (${methodNames[mixedCostAnalysis.method as keyof typeof methodNames]}, ${mixedCostAnalysis.confidence} confianza)`);
      
      if (mixedCostAnalysis.confidence === 'high') {
        reasons.push(`Recomendación final: ${mixedCostAnalysis.recommendedClassification} basado en desglose automático`);
      }
    }

    if (reasons.length === 0) {
      reasons.push(`Clasificación por defecto como ${finalClassification} - requiere verificación manual`);
    }

    return reasons;
  }

  /**
   * Calcula el coeficiente de correlación de Pearson entre dos arrays
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
   * Clasifica múltiples cuentas de una vez
   */
  classifyMultipleAccounts(accounts: Array<{ code: string; name: string }>): Record<string, ClassificationResult> {
    const results: Record<string, ClassificationResult> = {};
    
    accounts.forEach(account => {
      const key = `${account.code}-${account.name}`;
      results[key] = this.classifyAccount(account.code, account.name);
    });

    return results;
  }

  /**
   * Obtiene estadísticas sobre la calidad de la clasificación automática
   */
  getClassificationStatistics(results: Record<string, ClassificationResult>) {
    const total = Object.keys(results).length;
    const highConfidence = Object.values(results).filter(r => r.confidence >= CLASSIFICATION_ALGORITHM_CONFIG.confidence.high).length;
    const mediumConfidence = Object.values(results).filter(r => 
      r.confidence >= CLASSIFICATION_ALGORITHM_CONFIG.confidence.medium && 
      r.confidence < CLASSIFICATION_ALGORITHM_CONFIG.confidence.high
    ).length;
    const lowConfidence = total - highConfidence - mediumConfidence;

    const byClassification = Object.values(results).reduce((acc, result) => {
      acc[result.suggested] = (acc[result.suggested] || 0) + 1;
      return acc;
    }, {} as Record<CostClassification, number>);

    return {
      total,
      confidence: {
        high: { count: highConfidence, percentage: (highConfidence / total) * 100 },
        medium: { count: mediumConfidence, percentage: (mediumConfidence / total) * 100 },
        low: { count: lowConfidence, percentage: (lowConfidence / total) * 100 }
      },
      byClassification,
      requiresManualReview: Object.values(results).filter(r => r.requiresConfirmation).length
    };
  }
}
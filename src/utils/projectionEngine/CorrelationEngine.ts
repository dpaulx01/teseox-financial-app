/**
 * Motor de Correlaciones - Balance Interno
 * Analiza relaciones entre cuentas financieras para proyecciones más precisas
 */

import { MonthlyData } from '../../types';

export interface CorrelationResult {
  accountA: string;
  accountB: string;
  correlation: number;
  strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  pValue: number;
  significance: boolean;
  description: string;
}

export interface DependencyMap {
  account: string;
  dependencies: {
    account: string;
    coefficient: number;
    strength: number;
  }[];
}

export class CorrelationEngine {
  /**
   * Calcula la correlación de Pearson entre dos series de datos
   */
  static calculatePearsonCorrelation(
    valuesA: number[],
    valuesB: number[]
  ): number {
    const n = Math.min(valuesA.length, valuesB.length);
    if (n < 3) return 0;

    // Filtrar valores válidos
    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (!isNaN(valuesA[i]) && !isNaN(valuesB[i]) && 
          valuesA[i] !== null && valuesB[i] !== null) {
        pairs.push([valuesA[i], valuesB[i]]);
      }
    }

    if (pairs.length < 3) return 0;

    const meanA = pairs.reduce((sum, [a]) => sum + a, 0) / pairs.length;
    const meanB = pairs.reduce((sum, [, b]) => sum + b, 0) / pairs.length;

    let numerator = 0;
    let sumSquaredA = 0;
    let sumSquaredB = 0;

    pairs.forEach(([a, b]) => {
      const diffA = a - meanA;
      const diffB = b - meanB;
      numerator += diffA * diffB;
      sumSquaredA += diffA * diffA;
      sumSquaredB += diffB * diffB;
    });

    const denominator = Math.sqrt(sumSquaredA * sumSquaredB);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Analiza correlaciones entre todas las cuentas
   */
  static analyzeCorrelations(
    monthlyData: Record<string, number[]>,
    threshold: number = 0.3
  ): CorrelationResult[] {
    const accounts = Object.keys(monthlyData);
    const correlations: CorrelationResult[] = [];

    for (let i = 0; i < accounts.length; i++) {
      for (let j = i + 1; j < accounts.length; j++) {
        const accountA = accounts[i];
        const accountB = accounts[j];
        
        const correlation = this.calculatePearsonCorrelation(
          monthlyData[accountA],
          monthlyData[accountB]
        );

        if (Math.abs(correlation) >= threshold) {
          const strength = this.getCorrelationStrength(Math.abs(correlation));
          const pValue = this.calculatePValue(correlation, monthlyData[accountA].length);
          
          correlations.push({
            accountA,
            accountB,
            correlation,
            strength,
            pValue,
            significance: pValue < 0.05,
            description: this.generateCorrelationDescription(accountA, accountB, correlation)
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Encuentra dependencias de una cuenta específica
   */
  static findAccountDependencies(
    targetAccount: string,
    monthlyData: Record<string, number[]>,
    threshold: number = 0.5
  ): DependencyMap {
    const targetValues = monthlyData[targetAccount];
    if (!targetValues) {
      return { account: targetAccount, dependencies: [] };
    }

    const dependencies: { account: string; coefficient: number; strength: number; }[] = [];

    Object.keys(monthlyData).forEach(account => {
      if (account === targetAccount) return;

      const correlation = this.calculatePearsonCorrelation(
        targetValues,
        monthlyData[account]
      );

      if (Math.abs(correlation) >= threshold) {
        // Calcular coeficiente de regresión simple
        const coefficient = this.calculateRegressionCoefficient(
          monthlyData[account], // X (independiente)
          targetValues         // Y (dependiente)
        );

        dependencies.push({
          account,
          coefficient,
          strength: Math.abs(correlation)
        });
      }
    });

    return {
      account: targetAccount,
      dependencies: dependencies.sort((a, b) => b.strength - a.strength)
    };
  }

  /**
   * Proyecta valor basado en dependencias
   */
  static projectBasedOnDependencies(
    targetAccount: string,
    dependencyMap: DependencyMap,
    currentValues: Record<string, number>,
    baseValue: number = 0
  ): number {
    if (dependencyMap.dependencies.length === 0) {
      return baseValue;
    }

    let projectedValue = baseValue;
    let totalWeight = 0;

    dependencyMap.dependencies.forEach(dep => {
      const currentValue = currentValues[dep.account];
      if (currentValue !== undefined && !isNaN(currentValue)) {
        const weight = dep.strength;
        const influence = currentValue * dep.coefficient;
        projectedValue += influence * weight;
        totalWeight += weight;
      }
    });

    // Normalizar por peso total
    if (totalWeight > 0) {
      projectedValue = projectedValue / (1 + totalWeight) + baseValue * (totalWeight / (1 + totalWeight));
    }

    return Math.max(0, projectedValue);
  }

  /**
   * Encuentra patrones de comportamiento en grupos de cuentas
   */
  static findAccountGroups(
    monthlyData: Record<string, number[]>,
    minCorrelation: number = 0.7
  ): string[][] {
    const accounts = Object.keys(monthlyData);
    const groups: string[][] = [];
    const processed = new Set<string>();

    accounts.forEach(account => {
      if (processed.has(account)) return;

      const group = [account];
      processed.add(account);

      accounts.forEach(otherAccount => {
        if (processed.has(otherAccount)) return;

        const correlation = this.calculatePearsonCorrelation(
          monthlyData[account],
          monthlyData[otherAccount]
        );

        if (Math.abs(correlation) >= minCorrelation) {
          group.push(otherAccount);
          processed.add(otherAccount);
        }
      });

      if (group.length > 1) {
        groups.push(group);
      }
    });

    return groups;
  }

  /**
   * Calcula coeficiente de regresión simple
   */
  private static calculateRegressionCoefficient(
    x: number[],
    y: number[]
  ): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const validPairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (!isNaN(x[i]) && !isNaN(y[i])) {
        validPairs.push([x[i], y[i]]);
      }
    }

    if (validPairs.length < 2) return 0;

    const meanX = validPairs.reduce((sum, [xi]) => sum + xi, 0) / validPairs.length;
    const meanY = validPairs.reduce((sum, [, yi]) => sum + yi, 0) / validPairs.length;

    let numerator = 0;
    let denominator = 0;

    validPairs.forEach(([xi, yi]) => {
      const diffX = xi - meanX;
      const diffY = yi - meanY;
      numerator += diffX * diffY;
      denominator += diffX * diffX;
    });

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Determina la fuerza de correlación
   */
  private static getCorrelationStrength(
    absCorrelation: number
  ): 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (absCorrelation >= 0.9) return 'very_strong';
    if (absCorrelation >= 0.7) return 'strong';
    if (absCorrelation >= 0.5) return 'moderate';
    if (absCorrelation >= 0.3) return 'weak';
    return 'very_weak';
  }

  /**
   * Calcula p-value aproximado para correlación
   */
  private static calculatePValue(correlation: number, n: number): number {
    if (n < 3) return 1;
    
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const df = n - 2;
    
    // Aproximación simple para p-value (distribución t)
    const absT = Math.abs(t);
    if (absT > 2.576) return 0.01;  // p < 0.01
    if (absT > 1.96) return 0.05;   // p < 0.05
    if (absT > 1.645) return 0.10;  // p < 0.10
    return 0.20; // p >= 0.10
  }

  /**
   * Genera descripción de la correlación
   */
  private static generateCorrelationDescription(
    accountA: string,
    accountB: string,
    correlation: number
  ): string {
    const direction = correlation > 0 ? 'positiva' : 'negativa';
    const strength = this.getCorrelationStrength(Math.abs(correlation));
    
    const strengthText = {
      very_strong: 'muy fuerte',
      strong: 'fuerte',
      moderate: 'moderada',
      weak: 'débil',
      very_weak: 'muy débil'
    }[strength];

    return `Correlación ${direction} ${strengthText} entre ${accountA} y ${accountB} (r=${correlation.toFixed(3)})`;
  }
}
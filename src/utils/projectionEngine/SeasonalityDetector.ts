/**
 * Detector de Estacionalidad - Balance Interno
 * Identifica y cuantifica patrones estacionales en datos financieros
 */

export interface SeasonalPattern {
  month: number;
  index: number; // 1.0 = promedio, >1.0 = por encima, <1.0 = por debajo
  confidence: number; // 0-1
  description: string;
}

export interface SeasonalityResult {
  hasSeasonality: boolean;
  strength: 'weak' | 'moderate' | 'strong';
  patterns: SeasonalPattern[];
  peakMonths: number[];
  lowMonths: number[];
  explanation: string;
}

export class SeasonalityDetector {
  /**
   * Analiza estacionalidad en datos multi-año
   */
  static analyzeSeasonality(
    monthlyDataByYear: Record<number, number[]>
  ): SeasonalityResult {
    const years = Object.keys(monthlyDataByYear).map(Number);
    
    if (years.length < 2) {
      return {
        hasSeasonality: false,
        strength: 'weak',
        patterns: [],
        peakMonths: [],
        lowMonths: [],
        explanation: 'Insuficientes datos históricos para análisis estacional'
      };
    }

    // Calcular índices estacionales
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCount = new Array(12).fill(0);

    // Acumular datos por mes
    years.forEach(year => {
      const yearData = monthlyDataByYear[year];
      yearData.forEach((value, monthIndex) => {
        if (value !== undefined && value !== null && !isNaN(value)) {
          monthlyAverages[monthIndex] += value;
          monthlyCount[monthIndex]++;
        }
      });
    });

    // Calcular promedios mensuales
    const actualAverages = monthlyAverages.map((sum, index) => 
      monthlyCount[index] > 0 ? sum / monthlyCount[index] : 0
    );

    // Calcular promedio general
    const overallAverage = actualAverages.reduce((a, b) => a + b, 0) / 12;

    if (overallAverage === 0) {
      return {
        hasSeasonality: false,
        strength: 'weak',
        patterns: [],
        peakMonths: [],
        lowMonths: [],
        explanation: 'Datos insuficientes para análisis'
      };
    }

    // Calcular índices estacionales
    const patterns: SeasonalPattern[] = actualAverages.map((avg, index) => {
      const seasonalIndex = avg / overallAverage;
      const confidence = this.calculateConfidence(
        monthlyDataByYear, 
        index, 
        seasonalIndex
      );

      return {
        month: index + 1,
        index: seasonalIndex,
        confidence,
        description: this.getSeasonalDescription(index + 1, seasonalIndex)
      };
    });

    // Calcular fuerza de estacionalidad
    const variance = patterns.reduce((acc, p) => 
      acc + Math.pow(p.index - 1, 2), 0) / 12;
    const standardDeviation = Math.sqrt(variance);

    let strength: 'weak' | 'moderate' | 'strong' = 'weak';
    if (standardDeviation > 0.3) strength = 'strong';
    else if (standardDeviation > 0.15) strength = 'moderate';

    const hasSeasonality = strength !== 'weak';

    // Identificar meses pico y bajos
    const peakMonths = patterns
      .filter(p => p.index > 1.2)
      .map(p => p.month);
    
    const lowMonths = patterns
      .filter(p => p.index < 0.8)
      .map(p => p.month);

    const explanation = this.generateExplanation(strength, peakMonths, lowMonths);

    return {
      hasSeasonality,
      strength,
      patterns,
      peakMonths,
      lowMonths,
      explanation
    };
  }

  /**
   * Aplica ajuste estacional a una proyección
   */
  static applySeasonalAdjustment(
    baseProjection: number,
    month: number,
    patterns: SeasonalPattern[]
  ): number {
    const pattern = patterns.find(p => p.month === month);
    if (!pattern) return baseProjection;

    return baseProjection * pattern.index;
  }

  /**
   * Calcula la confianza del patrón estacional para un mes específico
   */
  private static calculateConfidence(
    monthlyDataByYear: Record<number, number[]>,
    monthIndex: number,
    seasonalIndex: number
  ): number {
    const years = Object.keys(monthlyDataByYear).map(Number);
    const monthValues: number[] = [];

    years.forEach(year => {
      const value = monthlyDataByYear[year][monthIndex];
      if (value !== undefined && value !== null && !isNaN(value)) {
        monthValues.push(value);
      }
    });

    if (monthValues.length < 2) return 0;

    // Calcular consistencia del patrón
    const mean = monthValues.reduce((a, b) => a + b, 0) / monthValues.length;
    const variance = monthValues.reduce((acc, val) => 
      acc + Math.pow(val - mean, 2), 0) / monthValues.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;

    // Confianza inversa a la variabilidad
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Genera descripción del patrón estacional
   */
  private static getSeasonalDescription(month: number, index: number): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const monthName = monthNames[month - 1];
    
    if (index > 1.3) return `${monthName}: Muy por encima del promedio`;
    if (index > 1.1) return `${monthName}: Por encima del promedio`;
    if (index < 0.7) return `${monthName}: Muy por debajo del promedio`;
    if (index < 0.9) return `${monthName}: Por debajo del promedio`;
    return `${monthName}: Cerca del promedio`;
  }

  /**
   * Genera explicación del análisis estacional
   */
  private static generateExplanation(
    strength: 'weak' | 'moderate' | 'strong',
    peakMonths: number[],
    lowMonths: number[]
  ): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (strength === 'weak') {
      return 'Patrones estacionales débiles. Los datos son relativamente estables durante el año.';
    }

    let explanation = `Estacionalidad ${strength} detectada. `;

    if (peakMonths.length > 0) {
      const peakNames = peakMonths.map(m => monthNames[m - 1]).join(', ');
      explanation += `Meses pico: ${peakNames}. `;
    }

    if (lowMonths.length > 0) {
      const lowNames = lowMonths.map(m => monthNames[m - 1]).join(', ');
      explanation += `Meses bajos: ${lowNames}. `;
    }

    return explanation;
  }

  /**
   * Proyecta patrones estacionales para meses futuros
   */
  static projectSeasonalPattern(
    patterns: SeasonalPattern[],
    startMonth: number,
    monthsAhead: number
  ): SeasonalPattern[] {
    const projectedPatterns: SeasonalPattern[] = [];

    for (let i = 0; i < monthsAhead; i++) {
      const targetMonth = ((startMonth - 1 + i) % 12) + 1;
      const pattern = patterns.find(p => p.month === targetMonth);
      
      if (pattern) {
        projectedPatterns.push({
          ...pattern,
          month: targetMonth
        });
      }
    }

    return projectedPatterns;
  }
}
import { FinancialData, MonthlyData } from '../types';
import { getSortedMonths } from './dateUtils';
import { TrendAnalysis } from './projectionEngine/TrendAnalysis';
import { SeasonalityDetector } from './projectionEngine/SeasonalityDetector';
import { CorrelationEngine } from './projectionEngine/CorrelationEngine';

interface ProjectionMetadata {
  isProjected: boolean;
  confidence: number; // 0-100
  method: string;
  basedOn: string[];
}

interface EnhancedMonthlyData extends MonthlyData {
  _metadata?: {
    [key in keyof MonthlyData]?: ProjectionMetadata;
  };
}

interface ProjectionAnalysis {
  trend: 'growing' | 'declining' | 'stable';
  seasonality: number[]; // 12 valores para cada mes
  volatility: number;
  avgGrowthRate: number;
  confidence: number;
}

export class ProjectionEngine {
  /**
   * Nueva función de proyección avanzada usando algoritmos de IA
   */
  static generateAdvancedProjections(
    financialData: FinancialData,
    targetYear: number,
    specificAccounts?: string[]
  ): FinancialData {
    const enhanced: FinancialData = JSON.parse(JSON.stringify(financialData));
    
    if (!enhanced.monthly) {
      enhanced.monthly = {};
    }

    // Convertir datos mensuales a formato para análisis
    const monthlyDataByAccount: Record<string, number[]> = {};
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    // Extraer datos históricos para cada cuenta - SOLO MESES REALES (enero-junio)
    enhanced.raw?.forEach(row => {
      const accountKey = `${row['COD.']} - ${row['CUENTA']}`;
      if (!monthlyDataByAccount[accountKey]) {
        monthlyDataByAccount[accountKey] = new Array(12).fill(0);
      }

      // CRÍTICO: Solo extraer datos reales hasta junio (índices 0-5)
      const realMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio'];
      realMonths.forEach((month, idx) => {
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        const value = parseFloat(row[capitalizedMonth] as string) || 0;
        if (!isNaN(value) && value !== 0) {
          monthlyDataByAccount[accountKey][idx] = value;
          console.log(`📊 ProjectionEngine: Datos reales ${month} para ${accountKey}: ${value}`);
        }
      });
    });

    // Aplicar algoritmos avanzados de proyección
    const accountsToProject = specificAccounts || Object.keys(monthlyDataByAccount);
    
    accountsToProject.forEach(account => {
      const accountData = monthlyDataByAccount[account];
      if (!accountData || accountData.every(v => v === 0)) return;

      // 1. Análisis de tendencias avanzado
      const trendResult = TrendAnalysis.calculateTrend(accountData);
      
      // 2. Análisis estacional
      const seasonalityResult = SeasonalityDetector.analyzeSeasonality({
        [targetYear - 1]: accountData
      });

      // 3. Proyectar valores futuros
      const projections = TrendAnalysis.projectFuture(accountData, {
        monthsAhead: 12 - accountData.filter(v => v !== 0).length
      });

      // 4. Aplicar ajustes estacionales
      const adjustedProjections = projections.map((value, monthIdx) => {
        if (seasonalityResult.hasSeasonality) {
          return SeasonalityDetector.applySeasonalAdjustment(
            value,
            monthIdx + 1,
            seasonalityResult.patterns
          );
        }
        return value;
      });

      // Actualizar datos con proyecciones
      let projectionIndex = 0;
      // CRÍTICO: Solo proyectar julio-diciembre (índices 6-11)
      const monthsToProject = ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      monthsToProject.forEach((month, projIdx) => {
        const monthIdx = 6 + projIdx; // julio=6, agosto=7, etc.
        if (projectionIndex < adjustedProjections.length) {
          // Crear o actualizar datos mensuales
          if (!enhanced.monthly![month]) {
            enhanced.monthly![month] = {
              ingresos: 0,
              costoVentasTotal: 0,
              costoMateriaPrima: 0,
              costoProduccion: 0,
              utilidadBruta: 0,
              gastosOperativos: 0,
              ebitda: 0,
              depreciacion: 0,
              utilidadNeta: 0
            };
          }

          // CRÍTICO: También actualizar RAW data para que calculatePnl lo encuentre
          if (enhanced.raw) {
            const accountCode = account.split(' - ')[0];
            const rawRowIndex = enhanced.raw.findIndex(r => r['COD.'] === accountCode);
            if (rawRowIndex >= 0) {
              const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
              enhanced.raw[rawRowIndex] = {
                ...enhanced.raw[rawRowIndex],
                [capitalizedMonth]: adjustedProjections[projectionIndex]
              };
              console.log(`🚀 ProjectionEngine: PROYECTADO ${month} para ${accountCode}: ${adjustedProjections[projectionIndex]} (era 0)`);
            }
          }

          // Mapear cuenta a campo apropiado (simplificado)
          const code = account.split(' - ')[0];
          if (code.startsWith('4')) {
            enhanced.monthly![month].ingresos += adjustedProjections[projectionIndex];
          } else if (code.startsWith('5.1')) {
            enhanced.monthly![month].costoProduccion += adjustedProjections[projectionIndex];
          } else if (code.startsWith('5.2') || code.startsWith('5.3')) {
            enhanced.monthly![month].gastosOperativos += adjustedProjections[projectionIndex];
          }

          projectionIndex++;
        }
      });
    });

    // Recalcular métricas derivadas
    Object.keys(enhanced.monthly!).forEach(month => {
      const data = enhanced.monthly![month];
      data.costoVentasTotal = data.costoMateriaPrima + data.costoProduccion;
      data.utilidadBruta = data.ingresos - data.costoVentasTotal;
      data.ebitda = data.utilidadBruta - data.gastosOperativos;
      data.utilidadNeta = data.ebitda - (data.depreciacion || 0);
    });

    return enhanced;
  }
  /**
   * Completa automáticamente un año con todos los 12 meses
   */
  static completeYear(financialData: FinancialData, targetYear: number = 2025): FinancialData {
    const enhanced: FinancialData = JSON.parse(JSON.stringify(financialData));
    
    // Asegurar que monthly existe
    if (!enhanced.monthly) {
      enhanced.monthly = {};
    }

    // LIMPIAR DUPLICADOS: Consolidar meses con diferentes casos
    const cleanedMonthly: Record<string, MonthlyData> = {};
    
    Object.entries(enhanced.monthly).forEach(([month, data]) => {
      const monthLower = month.toLowerCase();
      
      // Si ya existe este mes (en minúsculas), combinar los datos
      if (cleanedMonthly[monthLower]) {
        console.log(`⚠️ Duplicado encontrado: ${month} (ya existe ${monthLower})`);
        // Mantener los datos del primero encontrado
      } else {
        cleanedMonthly[monthLower] = data;
      }
    });
    
    // Reemplazar con datos limpios
    enhanced.monthly = cleanedMonthly;
    console.log(`🧹 Limpieza: ${Object.keys(financialData.monthly).length} meses → ${Object.keys(cleanedMonthly).length} meses únicos`);

    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const existingMonths = getSortedMonths(enhanced.monthly);
    const existingData = existingMonths.map(month => enhanced.monthly[month]);

    // Analizar datos existentes para proyecciones inteligentes
    const analysis = this.analyzeHistoricalData(existingData);

    // Obtener meses que realmente existen (normalizados a minúsculas)
    const existingMonthsNormalized = Object.keys(enhanced.monthly)
      .map(month => month.toLowerCase())
      .filter((month, index, arr) => arr.indexOf(month) === index); // eliminar duplicados

    console.log(`📊 Meses existentes (normalizados): ${existingMonthsNormalized.join(', ')}`);

    monthNames.forEach((month, index) => {
      const monthLower = month.toLowerCase();
      
      if (!existingMonthsNormalized.includes(monthLower)) {
        // Solo generar proyección si NO existe este mes
        console.log(`🧠 Generando proyección IA para: ${month} (FALTABA)`);
        const projectedData = this.generateSmartProjection(
          existingData,
          analysis,
          index,
          month
        );
        
        enhanced.monthly[month] = projectedData;
      } else {
        // Mes ya existe - mantener datos reales SIN metadata
        console.log(`📊 Manteniendo datos reales para: ${month} (YA EXISTÍA)`);
        // No tocar los datos existentes
      }
    });

    return enhanced;
  }

  /**
   * Analiza datos históricos para encontrar patrones
   */
  private static analyzeHistoricalData(historicalData: MonthlyData[]): ProjectionAnalysis {
    if (historicalData.length === 0) {
      return {
        trend: 'stable',
        seasonality: Array(12).fill(1),
        volatility: 0.1,
        avgGrowthRate: 0.05,
        confidence: 30
      };
    }

    // Calcular tendencia de ingresos
    const ingresos = historicalData.map(data => data.ingresos || 0).filter(val => val > 0);
    const trend = this.calculateTrend(ingresos);

    // Calcular estacionalidad (simplificado)
    const seasonality = this.calculateSeasonality(historicalData);

    // Calcular volatilidad
    const volatility = this.calculateVolatility(ingresos);

    // Calcular tasa de crecimiento promedio
    const avgGrowthRate = this.calculateAverageGrowthRate(ingresos);

    // Calcular confianza basada en cantidad de datos
    const confidence = Math.min(95, Math.max(30, historicalData.length * 15));

    return {
      trend,
      seasonality,
      volatility,
      avgGrowthRate,
      confidence
    };
  }

  /**
   * Genera proyección inteligente para un mes específico
   */
  private static generateSmartProjection(
    historicalData: MonthlyData[], 
    analysis: ProjectionAnalysis, 
    monthIndex: number,
    monthName: string
  ): EnhancedMonthlyData {
    
    // Si no hay datos históricos, usar valores base
    if (historicalData.length === 0) {
      return this.generateBaseProjection(monthName);
    }

    // Obtener datos de referencia (último mes o promedio)
    const referenceData = this.getReferenceData(historicalData);
    const seasonalMultiplier = analysis.seasonality[monthIndex] || 1;
    const trendMultiplier = 1 + analysis.avgGrowthRate;

    // Calcular cada cuenta con lógica específica
    const projected: EnhancedMonthlyData = {
      // Ingresos: Tendencia + Estacionalidad + Pequeña variación
      ingresos: this.projectValue(
        referenceData.ingresos || 0, 
        trendMultiplier * seasonalMultiplier,
        0.05, // 5% variación máxima
        'Proyección basada en tendencia histórica y estacionalidad'
      ),

      // Costos como % de ingresos (inteligente)
      costoMateriaPrima: 0,
      costoProduccion: 0,
      costoVentasTotal: 0,
      
      // Gastos más estables
      gastosOperativos: this.projectValue(
        referenceData.gastosOperativos || 0,
        trendMultiplier * 0.8, // Crecen menos que ingresos
        0.03,
        'Gastos operativos con crecimiento moderado'
      ),

      gastosAdminTotal: this.projectValue(
        referenceData.gastosAdminTotal || 0,
        trendMultiplier * 0.6,
        0.02,
        'Gastos administrativos estables'
      ),

      gastosVentasTotal: this.projectValue(
        referenceData.gastosVentasTotal || 0,
        trendMultiplier * 0.9,
        0.04,
        'Gastos ventas correlacionados con ingresos'
      ),

      // Métricas calculadas se definirán después
      utilidadBruta: 0,
      ebitda: 0,
      depreciacion: referenceData.depreciacion || 0,
      utilidadNeta: 0,

      _metadata: {}
    };

    // Calcular costos inteligentemente basado en ratios históricos
    const avgCostRatio = this.calculateAverageCostRatio(historicalData);
    projected.costoMateriaPrima = projected.ingresos * avgCostRatio.materiaPrima;
    projected.costoProduccion = projected.ingresos * avgCostRatio.produccion;
    projected.costoVentasTotal = projected.costoMateriaPrima + projected.costoProduccion;

    // Recalcular métricas derivadas
    projected.utilidadBruta = projected.ingresos - projected.costoVentasTotal;
    projected.ebitda = projected.utilidadBruta - projected.gastosOperativos;
    projected.utilidadNeta = projected.ebitda - (projected.depreciacion || 0);

    // Agregar metadata de proyección a todas las cuentas proyectadas
    projected._metadata = {
      ingresos: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Tendencia + Estacionalidad',
        basedOn: ['datos_historicos', 'patron_estacional']
      },
      costoMateriaPrima: { 
        isProjected: true, 
        confidence: analysis.confidence - 10, 
        method: 'Ratio histórico',
        basedOn: ['ratio_promedio_historico']
      },
      costoProduccion: { 
        isProjected: true, 
        confidence: analysis.confidence - 10, 
        method: 'Ratio histórico',
        basedOn: ['ratio_promedio_historico']
      },
      gastosOperativos: { 
        isProjected: true, 
        confidence: analysis.confidence - 5, 
        method: 'Tendencia moderada',
        basedOn: ['tendencia_historica']
      },
      utilidadBruta: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Calculado',
        basedOn: ['ingresos_proyectados', 'costos_proyectados']
      },
      ebitda: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Calculado',
        basedOn: ['utilidad_bruta', 'gastos_operativos']
      },
      utilidadNeta: { 
        isProjected: true, 
        confidence: analysis.confidence, 
        method: 'Calculado',
        basedOn: ['ebitda', 'depreciacion']
      }
    };

    return projected;
  }

  /**
   * Proyecta un valor individual con variación controlada
   */
  private static projectValue(
    baseValue: number, 
    multiplier: number, 
    maxVariation: number,
    description: string
  ): number {
    if (baseValue === 0) return 0;
    
    // CORREGIDO: Limitar el multiplicador para evitar crecimiento exponencial
    const limitedMultiplier = Math.min(1.3, Math.max(0.7, multiplier)); // Max 30% cambio
    
    // Agregar pequeña variación aleatoria para realismo
    const variation = 1 + (Math.random() - 0.5) * 2 * maxVariation;
    return Math.round(baseValue * limitedMultiplier * variation);
  }

  /**
   * Calcula ratios promedio de costos vs ingresos
   */
  private static calculateAverageCostRatio(historicalData: MonthlyData[]): {
    materiaPrima: number;
    produccion: number;
    operativos: number;
  } {
    let totalIngresos = 0;
    let totalMateriaPrima = 0;
    let totalProduccion = 0;
    let totalOperativos = 0;
    let validMonths = 0;

    historicalData.forEach(data => {
      if (data.ingresos && data.ingresos > 0) {
        totalIngresos += data.ingresos;
        totalMateriaPrima += data.costoMateriaPrima || 0;
        totalProduccion += data.costoProduccion || 0;
        totalOperativos += data.gastosOperativos || 0;
        validMonths++;
      }
    });

    if (validMonths === 0 || totalIngresos === 0) {
      return {
        materiaPrima: 0.35, // 35% default
        produccion: 0.25,   // 25% default
        operativos: 0.20    // 20% default
      };
    }

    return {
      materiaPrima: totalMateriaPrima / totalIngresos,
      produccion: totalProduccion / totalIngresos,
      operativos: totalOperativos / totalIngresos
    };
  }

  /**
   * Obtiene datos de referencia para proyección
   */
  private static getReferenceData(historicalData: MonthlyData[]): MonthlyData {
    if (historicalData.length === 0) {
      return {} as MonthlyData;
    }

    // Usar último mes como referencia principal
    const lastMonth = historicalData[historicalData.length - 1];
    
    // Si el último mes tiene datos vacíos, hacer promedio de últimos 3 meses
    if (!lastMonth.ingresos || lastMonth.ingresos === 0) {
      return this.calculateAverageData(historicalData.slice(-3));
    }

    return lastMonth;
  }

  /**
   * Calcula promedio de datos mensuales
   */
  private static calculateAverageData(data: MonthlyData[]): MonthlyData {
    if (data.length === 0) return {} as MonthlyData;

    const result: MonthlyData = {} as MonthlyData;
    const validData = data.filter(d => d.ingresos && d.ingresos > 0);
    
    if (validData.length === 0) return data[0];

    // Promediar cada campo
    const fields: (keyof MonthlyData)[] = [
      'ingresos', 'costoMateriaPrima', 'costoProduccion', 'costoVentasTotal',
      'gastosOperativos', 'gastosAdminTotal', 'gastosVentasTotal',
      'utilidadBruta', 'ebitda', 'depreciacion', 'utilidadNeta'
    ];

    fields.forEach(field => {
      const values = validData.map(d => d[field] || 0);
      result[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return result;
  }

  /**
   * Genera proyección base cuando no hay datos históricos
   */
  private static generateBaseProjection(monthName: string): EnhancedMonthlyData {
    // Valores base realistas para una empresa típica
    const baseIngresos = 1000000; // 1M base
    const seasonalMultiplier = this.getSeasonalMultiplier(monthName);

    const ingresos = baseIngresos * seasonalMultiplier;
    const costoMateriaPrima = ingresos * 0.35;
    const costoProduccion = ingresos * 0.25;
    const gastosOperativos = ingresos * 0.20;

    return {
      ingresos,
      costoMateriaPrima,
      costoProduccion,
      costoVentasTotal: costoMateriaPrima + costoProduccion,
      gastosOperativos,
      gastosAdminTotal: ingresos * 0.08,
      gastosVentasTotal: ingresos * 0.05,
      utilidadBruta: ingresos - (costoMateriaPrima + costoProduccion),
      ebitda: ingresos * 0.12,
      depreciacion: 50000,
      utilidadNeta: ingresos * 0.08,
      _metadata: {
        ingresos: { 
          isProjected: true, 
          confidence: 50, 
          method: 'Estimación base',
          basedOn: ['valores_industriales_tipicos']
        }
      }
    };
  }

  /**
   * Obtiene multiplicador estacional para un mes
   */
  private static getSeasonalMultiplier(monthName: string): number {
    const seasonalPatterns: Record<string, number> = {
      'enero': 0.9,    // Post navidad, bajo
      'febrero': 0.95, // Recuperación
      'marzo': 1.05,   // Primer trimestre fuerte
      'abril': 1.0,    // Estable
      'mayo': 1.02,    // Primavera
      'junio': 1.08,   // Medio año fuerte
      'julio': 0.98,   // Vacaciones
      'agosto': 0.96,  // Vacaciones
      'septiembre': 1.05, // Vuelta al trabajo
      'octubre': 1.03,    // Otoño
      'noviembre': 1.15,  // Pre-navidad
      'diciembre': 1.20   // Navidad fuerte
    };

    return seasonalPatterns[monthName.toLowerCase()] || 1.0;
  }

  // Métodos auxiliares de análisis
  private static calculateTrend(values: number[]): 'growing' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const avgFirst = first.reduce((sum, val) => sum + val, 0) / first.length;
    const avgSecond = second.reduce((sum, val) => sum + val, 0) / second.length;
    
    const change = (avgSecond - avgFirst) / avgFirst;
    
    if (change > 0.05) return 'growing';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  private static calculateSeasonality(data: MonthlyData[]): number[] {
    // Simplificado: retorna patrón estacional estándar
    return [0.9, 0.95, 1.05, 1.0, 1.02, 1.08, 0.98, 0.96, 1.05, 1.03, 1.15, 1.20];
  }

  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0.1;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private static calculateAverageGrowthRate(values: number[]): number {
    if (values.length < 2) return 0.05;
    
    const growthRates = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] > 0) {
        growthRates.push((values[i] - values[i-1]) / values[i-1]);
      }
    }
    
    if (growthRates.length === 0) return 0.05;
    
    return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
  }

  /**
   * Recalcula automáticamente métricas derivadas cuando cambia un valor
   */
  static recalculateMetrics(monthData: MonthlyData): MonthlyData {
    const updated = { ...monthData };
    
    // Recalcular costo total de ventas
    updated.costoVentasTotal = (updated.costoMateriaPrima || 0) + (updated.costoProduccion || 0);
    
    // Recalcular utilidad bruta
    updated.utilidadBruta = (updated.ingresos || 0) - (updated.costoVentasTotal || 0);
    
    // Recalcular EBITDA
    updated.ebitda = (updated.utilidadBruta || 0) - (updated.gastosOperativos || 0);
    
    // Recalcular utilidad neta
    updated.utilidadNeta = (updated.ebitda || 0) - (updated.depreciacion || 0);
    
    return updated;
  }
}

export default ProjectionEngine;
import { FinancialDataMonthly, AccountData } from '../../../types';
import { BreakEvenLevel, ClassifiedAccounts } from '../types';

export interface Insight {
  id: string;
  type: 'info' | 'warning' | 'critical';
  category: 'anomaly' | 'trend' | 'classification' | 'performance' | 'recommendation';
  title: string;
  message: string;
  targetElement?: string;
  data?: any;
  confidence: number;
  suggestedAction?: {
    label: string;
    action: string;
    params?: any;
  };
  historicalContext?: {
    period: string;
    comparison: string;
    trend: 'improving' | 'declining' | 'stable';
  };
}

export interface InsightDetectionConfig {
  enableAnomalyDetection: boolean;
  enableTrendAnalysis: boolean;
  enableClassificationInsights: boolean;
  anomalyThreshold: number;
  confidenceThreshold: number;
  historicalDataMonths: number;
}

const defaultConfig: InsightDetectionConfig = {
  enableAnomalyDetection: true,
  enableTrendAnalysis: true,
  enableClassificationInsights: true,
  anomalyThreshold: 0.25,
  confidenceThreshold: 0.7,
  historicalDataMonths: 12
};

export class InsightDetectionEngine {
  private config: InsightDetectionConfig;
  private insights: Map<string, Insight> = new Map();

  constructor(config: Partial<InsightDetectionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async detectInsights(
    currentData: FinancialDataMonthly[],
    breakEvenResults: BreakEvenLevel[],
    classifiedAccounts?: ClassifiedAccounts,
    historicalData?: FinancialDataMonthly[]
  ): Promise<Insight[]> {
    this.insights.clear();

    if (this.config.enableAnomalyDetection && historicalData) {
      await this.detectAnomalies(currentData, historicalData);
    }

    if (this.config.enableTrendAnalysis && breakEvenResults.length > 0) {
      await this.analyzeTrends(breakEvenResults, historicalData);
    }

    if (this.config.enableClassificationInsights && classifiedAccounts) {
      await this.analyzeClassifications(classifiedAccounts, currentData);
    }

    await this.detectPerformanceInsights(breakEvenResults, currentData);

    return Array.from(this.insights.values())
      .filter(insight => insight.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.type] - severityOrder[b.type];
      });
  }

  private async detectAnomalies(
    currentData: FinancialDataMonthly[],
    historicalData: FinancialDataMonthly[]
  ): Promise<void> {
    const latestMonth = currentData[currentData.length - 1];
    if (!latestMonth) return;

    const historicalRevenues = historicalData
      .filter(d => d.accounts)
      .map(d => d.accounts.find(a => a.type === 'revenue')?.amount || 0);
    
    const avgRevenue = historicalRevenues.reduce((a, b) => a + b, 0) / historicalRevenues.length;
    const stdDevRevenue = Math.sqrt(
      historicalRevenues.reduce((sq, n) => sq + Math.pow(n - avgRevenue, 2), 0) / historicalRevenues.length
    );

    const currentRevenue = latestMonth.accounts.find(a => a.type === 'revenue')?.amount || 0;
    const revenueDeviation = Math.abs(currentRevenue - avgRevenue) / stdDevRevenue;

    if (revenueDeviation > 2) {
      const percentChange = ((currentRevenue - avgRevenue) / avgRevenue) * 100;
      const direction = currentRevenue > avgRevenue ? 'aumentó' : 'disminuyó';
      
      this.insights.set('revenue-anomaly', {
        id: 'revenue-anomaly',
        type: percentChange < -25 ? 'critical' : 'warning',
        category: 'anomaly',
        title: 'Anomalía en Ingresos Detectada',
        message: `Los ingresos ${direction} un ${Math.abs(percentChange).toFixed(1)}% respecto al promedio histórico. Esta es una desviación de ${revenueDeviation.toFixed(1)} sigmas.`,
        targetElement: 'revenue-metric',
        confidence: Math.min(revenueDeviation / 3, 1),
        historicalContext: {
          period: `Últimos ${this.config.historicalDataMonths} meses`,
          comparison: `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}% vs promedio`,
          trend: percentChange > 0 ? 'improving' : 'declining'
        },
        suggestedAction: {
          label: 'Analizar Causas',
          action: 'navigate',
          params: { panel: 'revenue-analysis' }
        }
      });
    }

    const ebitda = latestMonth.operationalResults?.ebitda || 0;
    const historicalEbitda = historicalData
      .filter(d => d.operationalResults?.ebitda)
      .map(d => d.operationalResults!.ebitda);
    
    if (historicalEbitda.length > 3) {
      const avgEbitda = historicalEbitda.reduce((a, b) => a + b, 0) / historicalEbitda.length;
      const ebitdaChange = ((ebitda - avgEbitda) / avgEbitda) * 100;
      
      if (Math.abs(ebitdaChange) > this.config.anomalyThreshold * 100) {
        this.insights.set('ebitda-anomaly', {
          id: 'ebitda-anomaly',
          type: ebitdaChange < -30 ? 'critical' : 'warning',
          category: 'anomaly',
          title: 'Variación Significativa en EBITDA',
          message: `EBITDA ${ebitdaChange > 0 ? 'mejoró' : 'cayó'} un ${Math.abs(ebitdaChange).toFixed(1)}% vs. promedio histórico.`,
          targetElement: 'ebitda-metric',
          confidence: Math.min(Math.abs(ebitdaChange) / 50, 1),
          historicalContext: {
            period: 'Histórico disponible',
            comparison: `${ebitdaChange > 0 ? '+' : ''}${ebitdaChange.toFixed(1)}%`,
            trend: ebitdaChange > 0 ? 'improving' : 'declining'
          },
          suggestedAction: {
            label: 'Ver Análisis de Costos',
            action: 'navigate',
            params: { panel: 'cost-analysis' }
          }
        });
      }
    }
  }

  private async analyzeTrends(
    breakEvenResults: BreakEvenLevel[],
    historicalData?: FinancialDataMonthly[]
  ): Promise<void> {
    const latestCashBreakEven = breakEvenResults.find(r => r.type === 'cash');
    if (!latestCashBreakEven) return;

    const marginOfSafety = latestCashBreakEven.marginOfSafety || 0;
    
    if (marginOfSafety < 10 && marginOfSafety > 0) {
      this.insights.set('low-safety-margin', {
        id: 'low-safety-margin',
        type: marginOfSafety < 5 ? 'critical' : 'warning',
        category: 'performance',
        title: 'Margen de Seguridad Bajo',
        message: `El margen de seguridad de caja es solo ${marginOfSafety.toFixed(1)}%. Las ventas actuales apenas superan el punto de equilibrio.`,
        targetElement: 'cash-breakeven-card',
        confidence: 0.95,
        suggestedAction: {
          label: 'Simular Mejoras',
          action: 'simulate',
          params: { 
            type: 'cash',
            suggestedIncrease: 15
          }
        }
      });
    }

    if (historicalData && historicalData.length >= 6) {
      const last6Months = breakEvenResults.slice(-6);
      const decliningTrend = last6Months.every((result, index) => 
        index === 0 || result.breakEvenPoint > last6Months[index - 1].breakEvenPoint
      );

      if (decliningTrend) {
        this.insights.set('declining-performance', {
          id: 'declining-performance',
          type: 'warning',
          category: 'trend',
          title: 'Tendencia Negativa Detectada',
          message: 'El punto de equilibrio ha aumentado consistentemente en los últimos 6 meses, indicando menor eficiencia operativa.',
          confidence: 0.85,
          historicalContext: {
            period: 'Últimos 6 meses',
            comparison: 'Incremento sostenido',
            trend: 'declining'
          },
          suggestedAction: {
            label: 'Revisar Estructura de Costos',
            action: 'navigate',
            params: { panel: 'cost-classification' }
          }
        });
      }
    }
  }

  private async analyzeClassifications(
    classifiedAccounts: ClassifiedAccounts,
    currentData: FinancialDataMonthly[]
  ): Promise<void> {
    const lowConfidenceClassifications = Object.entries(classifiedAccounts)
      .filter(([_, classification]) => 
        classification.confidence < 0.7 && classification.type === 'MIX'
      );

    if (lowConfidenceClassifications.length > 0) {
      const account = lowConfidenceClassifications[0];
      const accountData = currentData[0]?.accounts.find(a => a.name === account[0]);
      
      if (accountData) {
        this.insights.set(`classification-${account[0]}`, {
          id: `classification-${account[0]}`,
          type: 'info',
          category: 'classification',
          title: 'Clasificación con Confianza Media',
          message: `La cuenta "${account[0]}" fue clasificada como Mixta con confianza ${(account[1].confidence * 100).toFixed(0)}%. Considera revisar manualmente.`,
          targetElement: `account-${accountData.code}`,
          confidence: 0.8,
          suggestedAction: {
            label: 'Revisar Clasificación',
            action: 'navigate',
            params: { 
              panel: 'mixed-cost-analysis',
              account: account[0]
            }
          }
        });
      }
    }

    const mixedCosts = Object.entries(classifiedAccounts)
      .filter(([_, classification]) => classification.type === 'MIX');
    
    if (mixedCosts.length > 5) {
      this.insights.set('many-mixed-costs', {
        id: 'many-mixed-costs',
        type: 'info',
        category: 'recommendation',
        title: 'Múltiples Costos Mixtos Detectados',
        message: `Se identificaron ${mixedCosts.length} cuentas con comportamiento mixto. Un análisis detallado podría mejorar la precisión del punto de equilibrio.`,
        confidence: 0.9,
        suggestedAction: {
          label: 'Analizar Costos Mixtos',
          action: 'navigate',
          params: { panel: 'mixed-cost-panel' }
        }
      });
    }
  }

  private async detectPerformanceInsights(
    breakEvenResults: BreakEvenLevel[],
    currentData: FinancialDataMonthly[]
  ): Promise<void> {
    const operationalBE = breakEvenResults.find(r => r.type === 'operational');
    const cashBE = breakEvenResults.find(r => r.type === 'cash');
    
    if (operationalBE && cashBE) {
      const gap = Math.abs(operationalBE.breakEvenPoint - cashBE.breakEvenPoint);
      const gapPercentage = (gap / operationalBE.breakEvenPoint) * 100;
      
      if (gapPercentage > 20) {
        this.insights.set('be-gap-analysis', {
          id: 'be-gap-analysis',
          type: 'info',
          category: 'performance',
          title: 'Brecha Significativa entre Puntos de Equilibrio',
          message: `Existe una diferencia del ${gapPercentage.toFixed(1)}% entre el PE operativo y de caja, indicando alto impacto de depreciación/intereses.`,
          confidence: 0.9,
          suggestedAction: {
            label: 'Ver Análisis Detallado',
            action: 'navigate',
            params: { panel: 'analysis-type-selector' }
          }
        });
      }
    }

    const latestMonth = currentData[currentData.length - 1];
    if (latestMonth?.productionData) {
      const capacity = latestMonth.productionData.installedCapacity || 100;
      const utilization = latestMonth.productionData.capacityUtilization || 0;
      
      if (utilization < 50 && operationalBE) {
        const requiredUtilization = (operationalBE.breakEvenPoint / (capacity * 30)) * 100;
        
        if (requiredUtilization > utilization) {
          this.insights.set('capacity-insight', {
            id: 'capacity-insight',
            type: 'warning',
            category: 'performance',
            title: 'Capacidad Subutilizada',
            message: `Utilizando solo ${utilization.toFixed(1)}% de capacidad. Necesitas ${requiredUtilization.toFixed(1)}% para alcanzar PE operativo.`,
            confidence: 0.85,
            suggestedAction: {
              label: 'Optimizar Producción',
              action: 'navigate',
              params: { panel: 'production-analysis' }
            }
          });
        }
      }
    }
  }

  public getInsightsByCategory(category: Insight['category']): Insight[] {
    return Array.from(this.insights.values())
      .filter(insight => insight.category === category);
  }

  public getInsightById(id: string): Insight | undefined {
    return this.insights.get(id);
  }

  public clearInsights(): void {
    this.insights.clear();
  }
}
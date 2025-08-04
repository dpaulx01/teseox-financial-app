import { MultiLevelBreakEvenData, BreakEvenResult, BreakEvenAnalysisType } from '../../../types';

export interface SimpleInsight {
  id: string;
  type: 'info' | 'warning' | 'critical';
  category: 'performance' | 'optimization' | 'alert';
  title: string;
  message: string;
  targetElement?: string;
  confidence: number;
  suggestedAction?: {
    label: string;
    action: string;
    params?: any;
  };
}

export class SimpleInsightEngine {
  
  detectRealInsights(
    multiLevelData: MultiLevelBreakEvenData,
    currentAnalysisType: BreakEvenAnalysisType,
    customClassifications: Record<string, string>
  ): SimpleInsight[] {
    const insights: SimpleInsight[] = [];
    
    // Obtener datos actuales
    const contable = multiLevelData.contable;
    const operativo = multiLevelData.operativo;
    const caja = multiLevelData.caja;
    const current = multiLevelData[currentAnalysisType];

    // 1. Detectar margen de contribución bajo
    if (current.margenContribucionPorc < 0.15) { // Menos del 15%
      insights.push({
        id: 'low-contribution-margin',
        type: current.margenContribucionPorc < 0.05 ? 'critical' : 'warning',
        category: 'performance',
        title: 'Margen de Contribución Bajo',
        message: `Tu margen de contribución es solo ${(current.margenContribucionPorc * 100).toFixed(1)}%. Esto indica que los costos variables son muy altos en relación a los ingresos.`,
        targetElement: `${currentAnalysisType}-breakeven-card`,
        confidence: 0.95,
        suggestedAction: {
          label: 'Revisar Costos Variables',
          action: 'navigate',
          params: { panel: 'cost-analysis' }
        }
      });
    }

    // 2. Detectar pérdidas operativas
    if (current.utilidadNeta < 0) {
      const perdidaPorc = Math.abs(current.utilidadNeta / current.ingresos) * 100;
      insights.push({
        id: 'operational-loss',
        type: perdidaPorc > 10 ? 'critical' : 'warning',
        category: 'alert',
        title: 'Empresa Operando en Pérdida',
        message: `Pérdida neta de ${Math.abs(current.utilidadNeta).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} (${perdidaPorc.toFixed(1)}% de ingresos). Las ventas actuales no cubren los costos totales.`,
        targetElement: `${currentAnalysisType}-breakeven-card`,
        confidence: 1.0,
        suggestedAction: {
          label: 'Simular Mejoras',
          action: 'simulate',
          params: { 
            type: currentAnalysisType,
            suggestedIncrease: Math.ceil(perdidaPorc / 2) // Sugerir incremento de precio
          }
        }
      });
    }

    // 3. Detectar diferencias significativas entre tipos de análisis
    const gapOperativoCaja = Math.abs(operativo.puntoEquilibrio - caja.puntoEquilibrio);
    const gapPercentage = (gapOperativoCaja / operativo.puntoEquilibrio) * 100;
    
    if (gapPercentage > 25) {
      insights.push({
        id: 'significant-breakeven-gap',
        type: 'info',
        category: 'performance',
        title: 'Brecha Significativa entre Análisis',
        message: `Existe ${gapPercentage.toFixed(1)}% de diferencia entre PE operativo y de caja. Esto indica alto impacto de depreciación/intereses en tu estructura.`,
        targetElement: 'operativo-breakeven-card',
        confidence: 0.9,
        suggestedAction: {
          label: 'Comparar Análisis',
          action: 'navigate',
          params: { panel: 'analysis-comparison' }
        }
      });
    }

    // 4. Detectar punto de equilibrio muy alto
    const ventasVsPuntoEquilibrio = current.puntoEquilibrio / current.ingresos;
    if (ventasVsPuntoEquilibrio > 0.8) { // PE > 80% de ventas actuales
      insights.push({
        id: 'high-breakeven-point',
        type: ventasVsPuntoEquilibrio > 0.95 ? 'critical' : 'warning',
        category: 'performance',
        title: 'Punto de Equilibrio Muy Alto',
        message: `Tu punto de equilibrio (${current.puntoEquilibrio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}) representa ${(ventasVsPuntoEquilibrio * 100).toFixed(1)}% de las ventas actuales. Margen de maniobra muy limitado.`,
        targetElement: `${currentAnalysisType}-breakeven-card`,
        confidence: 0.92,
        suggestedAction: {
          label: 'Optimizar Estructura',
          action: 'navigate',
          params: { panel: 'cost-analysis' }
        }
      });
    }

    // 5. Detectar muchas cuentas mixtas sin clasificar
    const mixedAccounts = Object.entries(customClassifications)
      .filter(([_, classification]) => classification === 'MIX').length;
    
    if (mixedAccounts > 3) {
      insights.push({
        id: 'multiple-mixed-accounts',
        type: 'info',
        category: 'optimization',
        title: 'Múltiples Cuentas Mixtas Detectadas',
        message: `Se detectaron ${mixedAccounts} cuentas con comportamiento mixto. Un análisis detallado podría mejorar la precisión de tus cálculos.`,
        confidence: 0.85,
        suggestedAction: {
          label: 'Analizar Costos Mixtos',
          action: 'navigate',
          params: { panel: 'mixed-cost-panel' }
        }
      });
    }

    // 6. Detectar oportunidades de mejora en margen
    if (current.margenContribucionPorc > 0.15 && current.margenContribucionPorc < 0.40) {
      const mejoraRecomendada = Math.ceil((0.40 - current.margenContribucionPorc) * 100);
      insights.push({
        id: 'margin-improvement-opportunity',
        type: 'info',
        category: 'optimization',
        title: 'Oportunidad de Mejora de Margen',
        message: `Con un margen del ${(current.margenContribucionPorc * 100).toFixed(1)}%, podrías mejorar ${mejoraRecomendada} puntos porcentuales para alcanzar un margen saludable del 40%.`,
        confidence: 0.8,
        suggestedAction: {
          label: 'Simular Optimización',
          action: 'simulate',
          params: { 
            type: currentAnalysisType,
            suggestedIncrease: mejoraRecomendada 
          }
        }
      });
    }

    // 7. Detectar estructura de costos saludable
    if (current.margenContribucionPorc > 0.5 && current.utilidadNeta > 0) {
      insights.push({
        id: 'healthy-margin-structure',
        type: 'info',
        category: 'performance',
        title: '✅ Estructura Financiera Saludable',
        message: `Excelente margen de contribución del ${(current.margenContribucionPorc * 100).toFixed(1)}% y utilidad neta positiva. Tu negocio tiene una base sólida.`,
        confidence: 0.95
      });
    }

    return insights
      .filter(insight => insight.confidence >= 0.7)
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.type] - severityOrder[b.type];
      });
  }
}
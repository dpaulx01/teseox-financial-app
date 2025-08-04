import { useState, useEffect, useMemo } from 'react';
import { MultiLevelBreakEvenData, BreakEvenAnalysisType } from '../types';
import { SimpleInsightEngine, SimpleInsight } from '../modules/breakEvenAnalysis/intelligence/simpleInsightEngine';

interface UseSimpleInsightsProps {
  multiLevelData: MultiLevelBreakEvenData;
  currentAnalysisType: BreakEvenAnalysisType;
  customClassifications: Record<string, string>;
  enabled?: boolean;
}

export function useSimpleInsights({
  multiLevelData,
  currentAnalysisType,
  customClassifications,
  enabled = true
}: UseSimpleInsightsProps) {
  const [insights, setInsights] = useState<SimpleInsight[]>([]);
  
  // Inicializar el motor de insights
  const insightEngine = useMemo(() => new SimpleInsightEngine(), []);

  // Detectar insights cuando cambien los datos
  useEffect(() => {
    if (!enabled || !multiLevelData) {
      setInsights([]);
      return;
    }

    try {
      const detectedInsights = insightEngine.detectRealInsights(
        multiLevelData,
        currentAnalysisType,
        customClassifications
      );
      
      setInsights(detectedInsights);
    } catch (error) {
      // console.error('Error detectando insights:', error);
      setInsights([]);
    }
  }, [multiLevelData, currentAnalysisType, customClassifications, enabled, insightEngine]);

  // Agrupar insights por tipo
  const { criticalInsights, warningInsights, infoInsights } = useMemo(() => {
    return {
      criticalInsights: insights.filter(i => i.type === 'critical'),
      warningInsights: insights.filter(i => i.type === 'warning'),
      infoInsights: insights.filter(i => i.type === 'info')
    };
  }, [insights]);

  // Función para obtener insight por elemento
  const getInsightForElement = (elementId: string): SimpleInsight | undefined => {
    return insights.find(insight => insight.targetElement === elementId);
  };

  return {
    insights,
    criticalInsights,
    warningInsights,
    infoInsights,
    getInsightForElement,
    hasInsights: insights.length > 0
  };
}
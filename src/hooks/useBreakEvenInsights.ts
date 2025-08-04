import { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialData, FinancialDataMonthly, BreakEvenAnalysisType } from '../types';
import { InsightDetectionEngine, Insight } from '../modules/breakEvenAnalysis/intelligence/insightDetectionEngine';
import { BreakEvenLevel, ClassifiedAccounts } from '../modules/breakEvenAnalysis/types';

interface UseBreakEvenInsightsProps {
  financialData: FinancialData | null;
  currentMonth: string;
  analysisType: BreakEvenAnalysisType;
  breakEvenResults: {
    contable: BreakEvenLevel;
    operativo: BreakEvenLevel;
    caja: BreakEvenLevel;
  };
  classifiedAccounts?: Record<string, { type: string; confidence: number }>;
  enableInsights?: boolean;
}

interface UseBreakEvenInsightsReturn {
  insights: Insight[];
  insightsByElement: Record<string, Insight[]>;
  criticalInsights: Insight[];
  warningInsights: Insight[];
  infoInsights: Insight[];
  isLoading: boolean;
  error: Error | null;
  refreshInsights: () => Promise<void>;
  getInsightForElement: (elementId: string) => Insight | undefined;
  dismissInsight: (insightId: string) => void;
}

export function useBreakEvenInsights({
  financialData,
  currentMonth,
  analysisType,
  breakEvenResults,
  classifiedAccounts,
  enableInsights = true
}: UseBreakEvenInsightsProps): UseBreakEvenInsightsReturn {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  // Inicializar el motor de detección
  const insightEngine = useMemo(() => new InsightDetectionEngine({
    enableAnomalyDetection: true,
    enableTrendAnalysis: true,
    enableClassificationInsights: true,
    anomalyThreshold: 0.25,
    confidenceThreshold: 0.7,
    historicalDataMonths: 12
  }), []);

  // Función para obtener datos históricos desde la API
  const fetchHistoricalData = useCallback(async (): Promise<FinancialDataMonthly[]> => {
    try {
      const response = await fetch('http://localhost:8080/api/historical-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          months: 12,
          currentMonth 
        })
      });

      if (!response.ok) {
        throw new Error('Error al obtener datos históricos');
      }

      const data = await response.json();
      return data.historicalData || [];
    } catch (error) {
      // console.warn('No se pudieron obtener datos históricos:', error);
      return [];
    }
  }, [currentMonth]);

  // Función principal para detectar insights
  const detectInsights = useCallback(async () => {
    if (!enableInsights || !financialData) {
      setInsights([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Preparar datos actuales
      const currentData: FinancialDataMonthly[] = currentMonth === 'Anual' 
        ? [{
            month: 'Anual',
            accounts: Object.values(financialData.monthly).flatMap(m => m.accounts || []),
            operationalResults: financialData.yearly
          }]
        : currentMonth === 'Promedio'
        ? [{
            month: 'Promedio',
            accounts: Object.values(financialData.monthly).flatMap(m => m.accounts || []),
            operationalResults: {
              ingresos: financialData.yearly.ingresos / Object.keys(financialData.monthly).length,
              costosVariables: financialData.yearly.costosVariables / Object.keys(financialData.monthly).length,
              costosFijos: financialData.yearly.costosFijos / Object.keys(financialData.monthly).length,
              ebitda: financialData.yearly.ebitda / Object.keys(financialData.monthly).length,
              ebit: financialData.yearly.ebit / Object.keys(financialData.monthly).length,
              utilidadNeta: financialData.yearly.utilidadNeta / Object.keys(financialData.monthly).length
            }
          }]
        : [{
            month: currentMonth,
            accounts: financialData.monthly[currentMonth]?.accounts || [],
            operationalResults: financialData.monthly[currentMonth]
          }];

      // Obtener datos históricos
      const historicalData = await fetchHistoricalData();

      // Preparar resultados de punto de equilibrio
      const breakEvenLevels: BreakEvenLevel[] = [
        {
          type: 'accounting',
          breakEvenPoint: breakEvenResults.contable.puntoEquilibrio,
          marginOfSafety: ((breakEvenResults.contable.ingresos - breakEvenResults.contable.puntoEquilibrio) / breakEvenResults.contable.ingresos) * 100,
          contributionMargin: breakEvenResults.contable.margenContribucion,
          contributionMarginRatio: breakEvenResults.contable.margenContribucionPorc
        },
        {
          type: 'operational',
          breakEvenPoint: breakEvenResults.operativo.puntoEquilibrio,
          marginOfSafety: ((breakEvenResults.operativo.ingresos - breakEvenResults.operativo.puntoEquilibrio) / breakEvenResults.operativo.ingresos) * 100,
          contributionMargin: breakEvenResults.operativo.margenContribucion,
          contributionMarginRatio: breakEvenResults.operativo.margenContribucionPorc
        },
        {
          type: 'cash',
          breakEvenPoint: breakEvenResults.caja.puntoEquilibrio,
          marginOfSafety: ((breakEvenResults.caja.ingresos - breakEvenResults.caja.puntoEquilibrio) / breakEvenResults.caja.ingresos) * 100,
          contributionMargin: breakEvenResults.caja.margenContribucion,
          contributionMarginRatio: breakEvenResults.caja.margenContribucionPorc
        }
      ];

      // Convertir clasificaciones al formato esperado
      const classifiedAccountsFormatted: ClassifiedAccounts = {};
      if (classifiedAccounts) {
        Object.entries(classifiedAccounts).forEach(([account, classification]) => {
          classifiedAccountsFormatted[account] = {
            type: classification.type as 'CFT' | 'CVU' | 'PVU' | 'MIX',
            confidence: classification.confidence
          };
        });
      }

      // Detectar insights
      const detectedInsights = await insightEngine.detectInsights(
        currentData,
        breakEvenLevels,
        classifiedAccountsFormatted,
        historicalData
      );

      // Filtrar insights dismissidos
      const activeInsights = detectedInsights.filter(
        insight => !dismissedInsights.has(insight.id)
      );

      setInsights(activeInsights);
    } catch (err) {
      // console.error('Error detectando insights:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [
    enableInsights,
    financialData,
    currentMonth,
    breakEvenResults,
    classifiedAccounts,
    dismissedInsights,
    insightEngine,
    fetchHistoricalData
  ]);

  // Ejecutar detección cuando cambien las dependencias
  useEffect(() => {
    detectInsights();
  }, [detectInsights]);

  // Agrupar insights por tipo
  const { criticalInsights, warningInsights, infoInsights } = useMemo(() => {
    return {
      criticalInsights: insights.filter(i => i.type === 'critical'),
      warningInsights: insights.filter(i => i.type === 'warning'),
      infoInsights: insights.filter(i => i.type === 'info')
    };
  }, [insights]);

  // Agrupar insights por elemento target
  const insightsByElement = useMemo(() => {
    const grouped: Record<string, Insight[]> = {};
    
    (insights || []).forEach(insight => {
      if (insight.targetElement) {
        if (!grouped[insight.targetElement]) {
          grouped[insight.targetElement] = [];
        }
        grouped[insight.targetElement].push(insight);
      }
    });

    return grouped;
  }, [insights]);

  // Función para obtener el insight más relevante para un elemento
  const getInsightForElement = useCallback((elementId: string): Insight | undefined => {
    const elementInsights = insightsByElement[elementId];
    if (!elementInsights || elementInsights.length === 0) return undefined;

    // Priorizar por tipo (critical > warning > info) y luego por confianza
    return elementInsights.sort((a, b) => {
      const typeOrder = { critical: 0, warning: 1, info: 2 };
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      
      if (typeDiff !== 0) return typeDiff;
      return b.confidence - a.confidence;
    })[0];
  }, [insightsByElement]);

  // Función para descartar un insight
  const dismissInsight = useCallback((insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
    setInsights(prev => prev.filter(i => i.id !== insightId));
  }, []);

  // Función para refrescar insights manualmente
  const refreshInsights = useCallback(async () => {
    setDismissedInsights(new Set());
    await detectInsights();
  }, [detectInsights]);

  return {
    insights,
    insightsByElement,
    criticalInsights,
    warningInsights,
    infoInsights,
    isLoading,
    error,
    refreshInsights,
    getInsightForElement,
    dismissInsight
  };
}
// Hook personalizado para cálculos PyG
import { useState, useCallback, useMemo } from 'react';
import { FinancialData, PyGResult, PyGViewState, PyGConfig } from '../types/financial';
import { financialAPI } from '../services/api';

interface UsePyGCalculationReturn {
  pnlResult: PyGResult | null;
  isCalculating: boolean;
  calculationError: string | null;
  recalculate: () => Promise<void>;
}

export const usePyGCalculation = (
  financialData: FinancialData | null,
  viewState: PyGViewState
): UsePyGCalculationReturn => {
  const [pnlResult, setPnlResult] = useState<PyGResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Crear configuración PyG basada en el estado
  const config: PyGConfig = useMemo(() => ({
    view_type: viewState.viewType,
    analysis_month: viewState.selectedMonth || undefined,
    enable_vertical_analysis: viewState.showVerticalAnalysis,
    enable_horizontal_analysis: viewState.showHorizontalAnalysis,
    comparison_month: viewState.comparisonMonth || undefined,
  }), [viewState]);

  const recalculate = useCallback(async () => {
    if (!financialData) return;

    try {
      setIsCalculating(true);
      setCalculationError(null);

      const result = await financialAPI.analyzePyG(financialData, config);
      setPnlResult(result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error calculating PyG';
      setCalculationError(errorMessage);
      console.error('PyG Calculation Error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [financialData, config]);

  return {
    pnlResult,
    isCalculating,
    calculationError,
    recalculate,
  };
};
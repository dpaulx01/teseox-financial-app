import { useEffect, useState } from 'react';
import { FinancialData, MixedCost } from '../types';
import { calculatePnl, PnlResult, PnlViewType } from '../utils/pnlCalculator';

export function usePnlResult(
  financialData: FinancialData | null | undefined,
  month: string = 'Anual',
  viewType: PnlViewType = 'contable',
  mixedCosts?: MixedCost[]
) {
  const [result, setResult] = useState<PnlResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!financialData) { setResult(null); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await calculatePnl(financialData, month, viewType, mixedCosts);
        if (!cancelled) setResult(res);
      } catch (e: any) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [financialData, month, viewType, mixedCosts]);

  return { result, loading, error };
}

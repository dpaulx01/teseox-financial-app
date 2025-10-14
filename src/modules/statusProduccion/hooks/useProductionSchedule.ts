import { useCallback, useEffect, useState } from 'react';
import financialAPI from '../../../services/api';
import type { DailyScheduleDay, DailyScheduleResponse } from '../../../types/production';

interface UseProductionScheduleState {
  days: DailyScheduleDay[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProductionSchedule(): UseProductionScheduleState {
  const [days, setDays] = useState<DailyScheduleDay[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const response: DailyScheduleResponse = await financialAPI.getProductionSchedule();
      setDays(response.days ?? []);
      setError(null);
    } catch (err: any) {
      console.error('[StatusProduccion] fetchSchedule error', err);
      setError(err?.response?.data?.detail || err?.message || 'No se pudo cargar la programación diaria.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    days,
    loading,
    error,
    refetch: fetchSchedule,
  };
}

export default useProductionSchedule;

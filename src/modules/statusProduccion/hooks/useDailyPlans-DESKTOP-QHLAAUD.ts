import { useCallback, useEffect, useState } from 'react';
import financialAPI from '../../../services/api';
import type { DailyProductionPlanEntry } from '../../../types/production';

interface DailyPlanCache {
  [itemId: number]: {
    plan: DailyProductionPlanEntry[];
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useDailyPlans() {
  const [cache, setCache] = useState<DailyPlanCache>({});
  const [loading, setLoading] = useState<Set<number>>(new Set());

  const getDailyPlan = useCallback(async (itemId: number): Promise<DailyProductionPlanEntry[]> => {
    const now = Date.now();
    const cached = cache[itemId];
    
    // Verificar si tenemos datos en caché válidos
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.plan;
    }

    // Evitar múltiples requests simultáneos para el mismo item
    if (loading.has(itemId)) {
      // Esperar un poco y reintentarr
      await new Promise(resolve => setTimeout(resolve, 100));
      return getDailyPlan(itemId);
    }

    try {
      setLoading(prev => new Set([...prev, itemId]));
      
      const response = await financialAPI.getProductionDailyPlan(itemId);
      const plan = response.plan || [];
      
      setCache(prev => ({
        ...prev,
        [itemId]: {
          plan,
          timestamp: now,
        },
      }));
      
      return plan;
    } catch (error) {
      console.warn(`[useDailyPlans] Failed to fetch plan for item ${itemId}:`, error);
      return [];
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [cache, loading]);

  const invalidateCache = useCallback((itemId?: number) => {
    if (itemId !== undefined) {
      setCache(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setCache({});
    }
  }, []);

  const preloadPlans = useCallback(async (itemIds: number[]) => {
    const promises = itemIds.map(itemId => getDailyPlan(itemId));
    await Promise.allSettled(promises);
  }, [getDailyPlan]);

  // Limpiar caché expirado periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCache(prev => {
        const next = { ...prev };
        let hasChanges = false;
        
        for (const [itemId, data] of Object.entries(next)) {
          if ((now - data.timestamp) > CACHE_DURATION) {
            delete next[parseInt(itemId)];
            hasChanges = true;
          }
        }
        
        return hasChanges ? next : prev;
      });
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return {
    getDailyPlan,
    invalidateCache,
    preloadPlans,
    isLoading: (itemId: number) => loading.has(itemId),
  };
}
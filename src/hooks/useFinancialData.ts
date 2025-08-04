// Hook personalizado para manejo de datos financieros
import { useState, useEffect } from 'react';
import { FinancialData } from '../types/financial';
import { financialAPI } from '../services/api';

interface UseFinancialDataReturn {
  financialData: FinancialData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFinancialData = (): UseFinancialDataReturn => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Por ahora, usar datos mock - en producción esto vendría del backend
      const mockData = financialAPI.generateMockFinancialData();
      setFinancialData(mockData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading financial data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    financialData,
    isLoading,
    error,
    refetch: fetchData,
  };
};
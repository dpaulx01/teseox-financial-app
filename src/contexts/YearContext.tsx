import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiPath } from '../config/apiBaseUrl';

// Tipos para el contexto de año
export interface YearInfo {
  year: number;
  records: number;
  accounts: number;
  months: number;
  month_range: string;
  total_revenue: number;
  has_data: boolean;
}

interface YearContextType {
  selectedYear: number | null;
  availableYears: YearInfo[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  setSelectedYear: (year: number | null) => void;
  loadAvailableYears: () => Promise<void>;
  refreshYears: () => Promise<void>;
  clearSelectedYear: () => void;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useYear = (): YearContextType => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
};

interface YearProviderProps {
  children: ReactNode;
}

export const YearProvider: React.FC<YearProviderProps> = ({ children }) => {
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<YearInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar años disponibles desde API
  const loadAvailableYears = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const [financialResponse, productionResponse] = await Promise.allSettled([
        fetch(apiPath('/api/financial/years'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(apiPath('/api/production/years'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      let financialYears: YearInfo[] = [];
      if (financialResponse.status === 'fulfilled') {
        if (!financialResponse.value.ok) {
          throw new Error(`Failed to fetch years: ${financialResponse.value.statusText}`);
        }
        const data = await financialResponse.value.json();
        if (data.success && Array.isArray(data.years)) {
          financialYears = data.years;
        }
      }

      const productionYears: number[] = [];
      if (productionResponse.status === 'fulfilled') {
        if (productionResponse.value.ok) {
          const productionData = await productionResponse.value.json();
          if (productionData.success && Array.isArray(productionData.years)) {
            productionYears.push(...productionData.years);
          }
        }
      }

      const productionYearsSet = new Set<number>(productionYears);
      const mergedYearsMap = new Map<number, YearInfo>();

      financialYears.forEach((info) => {
        const hasProductionData = productionYearsSet.has(info.year);
        mergedYearsMap.set(info.year, {
          ...info,
          has_data: info.has_data || hasProductionData
        });
      });

      productionYearsSet.forEach((year) => {
        if (!mergedYearsMap.has(year)) {
          mergedYearsMap.set(year, {
            year,
            records: 0,
            accounts: 0,
            months: 0,
            month_range: '',
            total_revenue: 0,
            has_data: true
          });
        }
      });

      const mergedYears = Array.from(mergedYearsMap.values()).sort((a, b) => a.year - b.year);
      setAvailableYears(mergedYears);
      
      if (!selectedYear && mergedYears.length > 0) {
        const latestYearWithData = [...mergedYears]
          .filter((y) => y.has_data)
          .sort((a, b) => b.year - a.year)[0];
        if (latestYearWithData) {
          setSelectedYearState(latestYearWithData.year);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading years';
      setError(errorMessage);
      console.error('Error loading available years:', err);
      setAvailableYears([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para refrescar años (alias de loadAvailableYears)
  const refreshYears = async (): Promise<void> => {
    return loadAvailableYears();
  };

  // Función para establecer año seleccionado
  const setSelectedYear = (year: number | null): void => {
    setSelectedYearState(year);
    
    // Guardar en localStorage para persistencia
    if (year) {
      localStorage.setItem('selected_year', year.toString());
    } else {
      localStorage.removeItem('selected_year');
    }
  };

  // Función para limpiar selección
  const clearSelectedYear = (): void => {
    setSelectedYear(null);
  };

  // Cargar año guardado al inicializar
  useEffect(() => {
    const savedYear = localStorage.getItem('selected_year');
    if (savedYear) {
      const yearNumber = parseInt(savedYear);
      if (!isNaN(yearNumber)) {
        setSelectedYearState(yearNumber);
      }
    }
    
    // Cargar años disponibles al inicializar
    loadAvailableYears();
  }, []);

  const contextValue: YearContextType = {
    selectedYear,
    availableYears,
    isLoading,
    error,
    setSelectedYear,
    loadAvailableYears,
    refreshYears,
    clearSelectedYear
  };

  return (
    <YearContext.Provider value={contextValue}>
      {children}
    </YearContext.Provider>
  );
};

export default YearContext;

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

      const response = await fetch('http://localhost:8001/api/financial/years', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch years: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.years) {
        setAvailableYears(data.years);
        
        // Auto-seleccionar el año más reciente con datos si no hay ninguno seleccionado
        if (!selectedYear && data.years.length > 0) {
          const latestYearWithData = data.years.find((y: YearInfo) => y.has_data);
          if (latestYearWithData) {
            setSelectedYearState(latestYearWithData.year);
          }
        }
      } else {
        setAvailableYears([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading years';
      setError(errorMessage);
      console.error('Error loading available years:', err);
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
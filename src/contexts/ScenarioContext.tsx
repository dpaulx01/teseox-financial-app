import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { FinancialData } from '../types';

// Tipos específicos para escenarios
interface ScenarioMetadata {
  id: number;
  name: string;
  description?: string;
  base_year: number;
  category: string;
  status: string;
  is_template: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  owner?: string;
}

interface CreateScenarioData {
  name: string;
  description?: string;
  base_year: number;
  category?: string;
  financial_data: FinancialData;
}

interface ScenarioContextType {
  // Estado del escenario activo
  activeScenarioId: number | null;
  setActiveScenarioId: (id: number | null) => void;
  scenarioData: FinancialData | null;
  scenarioMetadata: ScenarioMetadata | null;
  
  // Estados de UI
  isSimulationMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Lista de escenarios
  scenarios: ScenarioMetadata[];
  refreshScenarios: () => Promise<void>;
  
  // Operaciones CRUD
  createScenario: (data: CreateScenarioData) => Promise<number>;
  updateScenario: (id: number, data: Partial<FinancialData>) => Promise<void>;
  deleteScenario: (id: number) => Promise<void>;
  duplicateScenario: (id: number, newName: string) => Promise<void>;
  shareScenario: (id: number, userIds: number[], isShared: boolean) => Promise<void>;
  
  // Utilidades
  exitSimulation: () => void;
  getScenarioIcon: (category: string) => string;
  clearError: () => void;
  
  // Estadísticas
  scenarioStats: {
    total_own_scenarios: number;
    shared_scenarios_accessible: number;
    scenarios_by_category: Record<string, number>;
    scenarios_by_status: Record<string, number>;
    total_accessible: number;
  } | null;
  refreshStats: () => Promise<void>;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

export const ScenarioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estados principales
  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null);
  const [scenarioData, setScenarioData] = useState<FinancialData | null>(null);
  const [scenarioMetadata, setScenarioMetadata] = useState<ScenarioMetadata | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMetadata[]>([]);
  const [scenarioStats, setScenarioStats] = useState<ScenarioContextType['scenarioStats']>(null);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Computed values
  const isSimulationMode = activeScenarioId !== null;

  // Utility function para manejar errores de API
  const handleApiError = (error: any, defaultMessage: string) => {
    if (error.response?.data?.detail) {
      setError(error.response.data.detail);
    } else if (error.message) {
      setError(error.message);
    } else {
      setError(defaultMessage);
    }
  };

  // Función para obtener token de autenticación
  const getAuthToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  };

  // Función para hacer requests autenticados
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const response = await fetch(`http://localhost:8001${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Cargar escenario específico
  const loadScenario = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest(`/api/scenarios/${id}`);
      setScenarioData(data.financial_data);
      setScenarioMetadata(data.metadata);
    } catch (error: any) {
      handleApiError(error, 'Error loading scenario');
      setActiveScenarioId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect para cargar escenario cuando cambia activeScenarioId
  useEffect(() => {
    if (activeScenarioId) {
      loadScenario(activeScenarioId);
    } else {
      setScenarioData(null);
      setScenarioMetadata(null);
    }
  }, [activeScenarioId, loadScenario]);

  // Operaciones CRUD
  const refreshScenarios = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest('/api/scenarios/');
      setScenarios(data);
    } catch (error: any) {
      handleApiError(error, 'Error fetching scenarios');
    }
  }, []);

  const createScenario = useCallback(async (data: CreateScenarioData): Promise<number> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/scenarios/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      await refreshScenarios();
      return response.id;
    } catch (error: any) {
      handleApiError(error, 'Error creating scenario');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshScenarios]);

  const updateScenario = useCallback(async (id: number, data: Partial<FinancialData> | FinancialData) => {
    setError(null);
    
    try {
      // Optimistic UI: actualizar inmediatamente el estado local
      if (id === activeScenarioId) {
        setScenarioData(data as FinancialData);
      }

      await apiRequest(`/api/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ financial_data: data }),
      });
      
      // Solo refrescar escenarios si no es el activo para evitar loops
      if (id !== activeScenarioId) {
        await refreshScenarios();
      }
    } catch (error: any) {
      // En caso de error, revertir el estado optimistic
      if (id === activeScenarioId && scenarioData) {
        setScenarioData(scenarioData);
      }
      handleApiError(error, 'Error updating scenario');
      throw error;
    }
  }, [activeScenarioId, refreshScenarios, scenarioData]);

  const duplicateScenario = useCallback(async (id: number, newName: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiRequest(`/api/scenarios/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ new_name: newName }),
      });
      
      await refreshScenarios();
    } catch (error: any) {
      handleApiError(error, 'Error duplicating scenario');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshScenarios]);

  const deleteScenario = useCallback(async (id: number) => {
    setError(null);
    
    try {
      await apiRequest(`/api/scenarios/${id}`, {
        method: 'DELETE',
      });
      
      if (id === activeScenarioId) {
        setActiveScenarioId(null);
      }
      
      await refreshScenarios();
    } catch (error: any) {
      handleApiError(error, 'Error deleting scenario');
      throw error;
    }
  }, [activeScenarioId, refreshScenarios]);

  const shareScenario = useCallback(async (id: number, userIds: number[], isShared: boolean) => {
    setError(null);
    
    try {
      await apiRequest(`/api/scenarios/${id}/share`, {
        method: 'POST',
        body: JSON.stringify({
          user_ids: userIds,
          is_shared: isShared,
        }),
      });
      
      await refreshScenarios();
    } catch (error: any) {
      handleApiError(error, 'Error sharing scenario');
      throw error;
    }
  }, [refreshScenarios]);

  const refreshStats = useCallback(async () => {
    setError(null);
    
    try {
      const data = await apiRequest('/api/scenarios/stats/summary');
      setScenarioStats(data);
    } catch (error: any) {
      handleApiError(error, 'Error fetching scenario statistics');
    }
  }, []);

  // Utilidades
  const exitSimulation = useCallback(() => {
    setActiveScenarioId(null);
  }, []);

  const getScenarioIcon = useCallback((category: string): string => {
    switch (category) {
      case 'proyección': return '📊';
      case 'simulación': return '🔬';
      case 'análisis': return '📈';
      case 'plantilla': return '📋';
      default: return '💼';
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Effect para cargar datos iniciales
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          refreshScenarios(),
          refreshStats(),
        ]);
      } catch (error) {
        // Los errores ya se manejan en las funciones individuales
        console.warn('Error initializing scenario data:', error);
      }
    };

    const token = localStorage.getItem('access_token');
    if (token) {
      initializeData();
    }
  }, [refreshScenarios, refreshStats]);

  // Context value
  const value: ScenarioContextType = {
    // Estado del escenario activo
    activeScenarioId,
    setActiveScenarioId,
    scenarioData,
    scenarioMetadata,
    
    // Estados de UI
    isSimulationMode,
    isLoading,
    error,
    
    // Lista de escenarios
    scenarios,
    refreshScenarios,
    
    // Operaciones CRUD
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    shareScenario,
    
    // Utilidades
    exitSimulation,
    getScenarioIcon,
    clearError,
    
    // Estadísticas
    scenarioStats,
    refreshStats,
  };

  return (
    <ScenarioContext.Provider value={value}>
      {children}
    </ScenarioContext.Provider>
  );
};

export const useScenario = () => {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error('useScenario must be used within a ScenarioProvider');
  }
  return context;
};

export default ScenarioProvider;
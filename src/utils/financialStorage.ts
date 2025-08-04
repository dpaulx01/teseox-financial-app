import { FinancialData } from '../types';
import { hybridStorage } from './serverStorage';

const FINANCIAL_DATA_KEY = 'artyco-financial-data-persistent';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// === SISTEMA HÍBRIDO: API MySQL primero, localStorage como fallback ===

export const saveFinancialData = async (data: FinancialData): Promise<void> => {
  try {
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString(),
      source: 'csv_upload'
    };
    
    // 1. Intentar guardar en MySQL via API (nuevo sistema)
    try {
      const response = await fetch(`${API_BASE}/financial_data_original.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // También guardar en localStorage como cache
          localStorage.setItem(FINANCIAL_DATA_KEY, JSON.stringify(dataToSave));
          return;
        }
      }
    } catch (apiError) {
    }
    
    // 2. Fallback: Guardar en localStorage
    localStorage.setItem(FINANCIAL_DATA_KEY, JSON.stringify(dataToSave));
    
    // 3. Intentar servidor PHP legacy como backup adicional
    if (typeof window !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/data.php?type=financial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave)
        });
        if (response.ok) {
        }
      } catch (serverError) {
      }
    }
  } catch (error) {
    throw error;
  }
};

export const loadFinancialData = async (): Promise<FinancialData | null> => {
  try {
    // 1. Fallback directo a localStorage (los datos financieros ya están ahí)
    const stored = localStorage.getItem(FINANCIAL_DATA_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      console.log('📊 Financial data loaded from localStorage cache');
      return data;
    }
    
    console.log('⚠️ No financial data found in localStorage');
    return null;
  } catch (error) {
    console.error('❌ Error loading financial data:', error);
    return null;
  }
};

export const clearFinancialData = async (): Promise<void> => {
  try {
    // Limpiar del localStorage
    localStorage.removeItem('artyco-financial-data-persistent');
    localStorage.removeItem(FINANCIAL_DATA_KEY);
    
    // También limpiar cualquier otro dato relacionado
    localStorage.removeItem('artyco-financial-data');
    
    
    // Intentar limpiar del servidor sin fallar si no funciona
    try {
      await hybridStorage.deleteFromServer('financial');
    } catch (serverError) {
    }
  } catch (error) {
    throw error;
  }
};

export const getFinancialDataInfo = async (): Promise<any> => {
  const data = await loadFinancialData();
  if (!data) return null;
  
  return {
    hasData: true,
    lastUpdated: data.lastUpdated || null,
    monthsCount: data.monthly ? Object.keys(data.monthly).length : 0,
    totalIngresos: data.yearly?.ingresos || 0,
    totalEbitda: data.yearly?.ebitda || 0
  };
};

// === FUNCIONES ADICIONALES PARA SERVIDOR ===

export const syncFinancialDataToServer = async (): Promise<boolean> => {
  try {
    const localData = localStorage.getItem('artyco-financial-data-persistent');
    if (!localData) return false;
    
    const data = JSON.parse(localData);
    return await hybridStorage.saveToServer('financial', data);
  } catch (error) {
    return false;
  }
};

export const checkServerConnection = async (): Promise<boolean> => {
  try {
    const status = await hybridStorage.getServerStatus();
    return status !== null;
  } catch (error) {
    return false;
  }
};
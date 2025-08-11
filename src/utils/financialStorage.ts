import { FinancialData } from '../types';
import { hybridStorage } from './serverStorage';

const FINANCIAL_DATA_KEY = 'artyco-financial-data-persistent';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// === SISTEMA HÍBRIDO: API MySQL primero, localStorage como fallback ===

export const saveFinancialData = async (data: FinancialData): Promise<void> => {
  try {
    // SOLO GUARDAR EN MYSQL - NUNCA EN LOCALSTORAGE
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString(),
      source: 'app_update'
    };
    
    // Guardar en MySQL via API RBAC
    const response = await fetch('http://localhost:8001/api/financial/save', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dataToSave)
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('✅ Financial data saved to MySQL database');
        // NO guardar en localStorage - todo desde MySQL
        localStorage.removeItem(FINANCIAL_DATA_KEY);
        return;
      }
    }
    
    throw new Error('Failed to save data to MySQL');
  } catch (error) {
    console.error('❌ Error saving to MySQL:', error);
    throw error;
  }
};

export const loadFinancialData = async (year?: number): Promise<FinancialData | null> => {
  try {
    // SOLO CARGAR DESDE MYSQL - NUNCA DE LOCALSTORAGE
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No authentication token found');
      return null;
    }
    
    try {
      // Construir URL con filtro de año opcional
      const baseUrl = 'http://localhost:8001/api/financial/data?include_raw=true';
      const url = year ? `${baseUrl}&year=${year}` : baseUrl;
      
      // Obtener datos desde MySQL via API RBAC
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.raw_data) {
          const yearMsg = year ? ` for year ${year}` : '';
          console.log(`🔍 Raw data from MySQL${yearMsg}:`, result.raw_data.length, 'records');
          console.log('🔍 Sample raw record:', result.raw_data[0]);
          
          // Procesar datos raw desde MySQL al formato esperado
          const processedData = await import('./financialDataProcessor').then(module => 
            module.processFinancialData(result.raw_data)
          );
          
          console.log(`📊 Financial data loaded from MySQL database${yearMsg}`);
          console.log('📊 Processed data:', processedData);
          console.log('📊 Monthly keys:', Object.keys(processedData.monthly || {}));
          console.log('📊 Yearly totals:', processedData.yearly);
          return processedData;
        }
      }
    } catch (apiError) {
      console.error('Failed to load from MySQL:', apiError);
    }
    
    console.log('⚠️ No financial data found in database');
    return null;
  } catch (error) {
    console.error('❌ Error loading financial data:', error);
    return null;
  }
};

export const clearFinancialData = async (): Promise<void> => {
  try {
    // LIMPIAR SOLO DE MYSQL - NO LOCALSTORAGE
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Limpiar datos de MySQL via API RBAC
    const response = await fetch('http://localhost:8001/api/financial/clear', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Financial data cleared from MySQL database');
      // Limpiar cualquier residuo de localStorage
      localStorage.removeItem('artyco-financial-data-persistent');
      localStorage.removeItem(FINANCIAL_DATA_KEY);
      localStorage.removeItem('artyco-financial-data');
    } else {
      throw new Error('Failed to clear data from MySQL');
    }
  } catch (error) {
    console.error('❌ Error clearing from MySQL:', error);
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
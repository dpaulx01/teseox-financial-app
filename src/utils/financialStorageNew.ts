import { FinancialData } from '../types';
import axios from 'axios';

const API_BASE = 'http://localhost:8001/api/financial';

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========================================
// FINANCIAL DATA FUNCTIONS
// ========================================

export const saveFinancialData = async (data: FinancialData): Promise<void> => {
  try {
    // VOLVER A LA LÓGICA ORIGINAL: localStorage primero
    console.log('💾 Saving financial data to localStorage...');
    
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString(),
      source: 'csv_upload'
    };
    
    // Guardar en localStorage (como el original)
    localStorage.setItem('artyco-financial-data-persistent', JSON.stringify(dataToSave));
    console.log('✅ Financial data saved to localStorage');
    
  } catch (error) {
    console.error('❌ Error saving financial data:', error);
    throw error;
  }
};

export const loadFinancialData = async (): Promise<FinancialData | null> => {
  try {
    // VOLVER A LA LÓGICA ORIGINAL: localStorage primero
    console.log('📊 Loading financial data from localStorage...');
    
    const localData = localStorage.getItem('artyco-financial-data-persistent');
    if (localData) {
      const parsed = JSON.parse(localData);
      console.log('✅ Financial data loaded from localStorage');
      return parsed;
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
    console.log('🗑️ Clearing financial data from database and localStorage...');
    
    // 1. Clear from database using RBAC API
    try {
      const token = getAuthToken();
      if (token) {
        const currentYear = new Date().getFullYear();
        
        // Delete from both tables (like in the original project)
        await apiClient.delete(`/data-clear/${currentYear}`);
        console.log('✅ Financial data cleared from database');
      }
    } catch (apiError) {
      console.warn('⚠️ API error during clear, clearing localStorage only:', apiError);
    }
    
    // 2. Clear from localStorage  
    localStorage.removeItem('artyco-financial-data-persistent');
    localStorage.removeItem('artyco-financial-data');
    
    console.log('✅ Financial data cleared completely');
    
  } catch (error) {
    console.error('❌ Error clearing financial data:', error);
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
    totalEbitda: data.yearly?.ebitda || 0,
    source: data.source || 'database'
  };
};

// ========================================
// PRODUCTION DATA FUNCTIONS
// ========================================

export const saveProductionData = async (data: any): Promise<void> => {
  try {
    console.log('💾 Saving production data to MySQL database...');
    
    if (!data.monthly) {
      throw new Error('No monthly production data to save');
    }

    // Convert monthly data to individual records
    const records = [];
    for (const [monthKey, monthData] of Object.entries(data.monthly)) {
      const [year, month] = monthKey.split('-').map(Number);
      
      records.push({
        year,
        month,
        metros_producidos: monthData.metros_producidos || 0,
        metros_vendidos: monthData.metros_vendidos || 0,
        unidades_producidas: monthData.unidades_producidas || 0,
        unidades_vendidas: monthData.unidades_vendidas || 0,
      });
    }

    // Save each record individually
    for (const record of records) {
      await apiClient.post('/production', record);
    }

    console.log('✅ Production data saved to database');
    
    // Remove from localStorage
    localStorage.removeItem('artyco-production-data');
    
  } catch (error) {
    console.error('❌ Error saving production data:', error);
    throw error;
  }
};

export const loadProductionData = async (): Promise<any | null> => {
  try {
    console.log('🏭 Loading production data from MySQL database...');
    
    const currentYear = new Date().getFullYear();
    const response = await apiClient.get(`/production?year=${currentYear}`);
    
    if (response.data && response.data.monthly) {
      console.log('✅ Production data loaded from database');
      return {
        monthly: response.data.monthly,
        metadata: response.data.metadata,
        lastUpdated: new Date().toISOString(),
        source: 'mysql_database'
      };
    }
    
    console.log('⚠️ No production data found in database');
    return null;
    
  } catch (error) {
    console.error('❌ Error loading production data:', error);
    
    // Fallback to localStorage
    try {
      const localData = localStorage.getItem('artyco-production-data');
      if (localData) {
        const parsed = JSON.parse(localData);
        console.log('⚠️ Using localStorage fallback for production data');
        return parsed;
      }
    } catch (localError) {
      console.error('❌ Error loading production data from localStorage:', localError);
    }
    
    return null;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    return false;
  }
};

export const getCompanies = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/companies');
    return response.data;
  } catch (error) {
    console.error('❌ Error loading companies:', error);
    return [];
  }
};

export const deleteFinancialData = async (year: number, month: number): Promise<void> => {
  try {
    await apiClient.delete(`/data/${year}/${month}`);
    console.log(`✅ Deleted financial data for ${year}-${month.toString().padStart(2, '0')}`);
  } catch (error) {
    console.error('❌ Error deleting financial data:', error);
    throw error;
  }
};

// ========================================
// MIGRATION UTILITIES
// ========================================

export const migrateLocalStorageToDatabase = async (): Promise<boolean> => {
  try {
    console.log('🔄 Starting migration from localStorage to database...');
    
    // Check if there's data in localStorage
    const localFinancialData = localStorage.getItem('artyco-financial-data-persistent');
    const localProductionData = localStorage.getItem('artyco-production-data');
    
    let migrated = false;
    
    if (localFinancialData) {
      const financialData = JSON.parse(localFinancialData);
      await saveFinancialData(financialData);
      console.log('✅ Financial data migrated');
      migrated = true;
    }
    
    if (localProductionData) {
      const productionData = JSON.parse(localProductionData);
      await saveProductionData(productionData);
      console.log('✅ Production data migrated');
      migrated = true;
    }
    
    if (migrated) {
      console.log('✅ Migration completed successfully');
    } else {
      console.log('ℹ️ No data to migrate');
    }
    
    return migrated;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
};

// Expose migration function globally for easy access
if (typeof window !== 'undefined') {
  (window as any).migrateToDatabase = migrateLocalStorageToDatabase;
}

export default {
  saveFinancialData,
  loadFinancialData,
  clearFinancialData,
  getFinancialDataInfo,
  saveProductionData,
  loadProductionData,
  checkDatabaseConnection,
  getCompanies,
  deleteFinancialData,
  migrateLocalStorageToDatabase
};
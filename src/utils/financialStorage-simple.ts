import { FinancialData } from '../types';

const FINANCIAL_DATA_KEY = 'artyco-financial-data-persistent';

// Funciones extremadamente simples sin posibles conflictos
export function saveFinancialData(data: FinancialData): void {
  try {
    localStorage.setItem(FINANCIAL_DATA_KEY, JSON.stringify(data));
    // console.log('✅ Datos guardados');
  } catch (error) {
    // console.error('❌ Error guardando:', error);
  }
}

export function loadFinancialData(): FinancialData | null {
  try {
    const stored = localStorage.getItem(FINANCIAL_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    // console.error('❌ Error cargando:', error);
    return null;
  }
}

export function clearFinancialData(): void {
  try {
    localStorage.removeItem(FINANCIAL_DATA_KEY);
    // console.log('🗑️ Datos eliminados');
  } catch (error) {
    // console.error('❌ Error limpiando:', error);
  }
}

export function getFinancialDataInfo(): any {
  const data = loadFinancialData();
  if (!data) return null;
  
  return {
    hasData: true,
    lastUpdated: data.lastUpdated || null,
    monthsCount: data.monthly ? Object.keys(data.monthly).length : 0,
    totalIngresos: (data.yearly && data.yearly.ingresos) ? data.yearly.ingresos : 0,
    totalEbitda: (data.yearly && data.yearly.ebitda) ? data.yearly.ebitda : 0
  };
}
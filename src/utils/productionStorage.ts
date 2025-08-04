import { ProductionData, OperationalMetrics, ProductionConfig, CombinedData } from '../types';
import { formatCurrency } from './formatters';
import { log } from './logger';

// Claves para localStorage
const PRODUCTION_DATA_KEY = 'artyco-production-data';
const PRODUCTION_CONFIG_KEY = 'artyco-production-config';
const COMBINED_DATA_KEY = 'artyco-combined-data';
const API_BASE = 'http://localhost:8001/api/financial';

// === SISTEMA HÍBRIDO: API MySQL primero, localStorage como fallback ===

// Helper function to convert month names to numbers
const getMonthNumber = (monthName: string): number => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const index = months.indexOf(monthName);
  return index >= 0 ? index + 1 : 1;
};

export const saveProductionData = async (data: ProductionData[], year?: number): Promise<void> => {
  try {
    const selectedYear = year || new Date().getFullYear();
    
    // 1. Intentar guardar en MySQL via API RBAC
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Guardar cada registro individualmente usando la nueva API
        for (const record of data) {
          const productionRecord = {
            year: selectedYear,
            month: getMonthNumber(record.month),
            metros_producidos: record.metrosProducidos,
            metros_vendidos: record.metrosVendidos,
            unidades_producidas: 0,
            unidades_vendidas: 0
          };

          const response = await fetch(`${API_BASE}/production`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productionRecord)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        log.debug('ProductionStorage', 'Production data saved to MySQL RBAC:', data.length, 'records');
        // También guardar en localStorage como cache
        localStorage.setItem(PRODUCTION_DATA_KEY, JSON.stringify(data));
        return;
      }
    } catch (apiError) {
      log.warn('ProductionStorage', 'API error, saving to localStorage only:', apiError);
    }
    
    // 2. Fallback: Guardar solo en localStorage
    localStorage.setItem(PRODUCTION_DATA_KEY, JSON.stringify(data));
    log.debug('ProductionStorage', 'Production data saved to localStorage:', data.length, 'records');
  } catch (error) {
    log.error('ProductionStorage', 'Error saving production data:', error);
  }
};

// Helper function to convert month numbers to names
const getMonthName = (monthNumber: number): string => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[monthNumber - 1] || 'Enero';
};

export const loadProductionData = async (year?: number): Promise<ProductionData[]> => {
  try {
    // 1. Intentar cargar desde MySQL via API RBAC
    try {
      const selectedYear = year || new Date().getFullYear();
      const token = localStorage.getItem('access_token');
      
      if (token) {
        const response = await fetch(`${API_BASE}/production?year=${selectedYear}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result && result.monthly) {
            // Convertir formato de API a formato interno
            const productionData: ProductionData[] = [];
            for (const [monthKey, monthData] of Object.entries(result.monthly)) {
              const [yearStr, monthStr] = monthKey.split('-');
              const monthNumber = parseInt(monthStr, 10);
              const data = monthData as any;
              
              productionData.push({
                month: getMonthName(monthNumber),
                metrosProducidos: data.metros_producidos || 0,
                metrosVendidos: data.metros_vendidos || 0,
                fechaRegistro: new Date().toISOString()
              });
            }
            
            log.debug('ProductionStorage', 'Production data loaded from RBAC API:', productionData.length, 'records');
            // También guardar en localStorage como cache
            localStorage.setItem(PRODUCTION_DATA_KEY, JSON.stringify(productionData));
            return productionData;
          }
        }
      }
    } catch (apiError) {
      log.warn('ProductionStorage', 'API error, falling back to localStorage:', apiError);
    }
    
    // 2. Fallback a localStorage
    const stored = localStorage.getItem(PRODUCTION_DATA_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      log.debug('ProductionStorage', 'Production data loaded from localStorage:', data.length, 'records');
      return data;
    }
  } catch (error) {
    log.error('ProductionStorage', 'Error loading production data:', error);
  }
  return [];
};

export const saveProductionConfig = async (config: ProductionConfig): Promise<void> => {
  try {
    // Por ahora guardamos solo en localStorage hasta implementar endpoint específico
    localStorage.setItem(PRODUCTION_CONFIG_KEY, JSON.stringify(config));
    log.debug('ProductionStorage', 'Production config saved to localStorage');
  } catch (error) {
    log.error('ProductionStorage', 'Error saving production config:', error);
  }
};

export const loadProductionConfig = async (): Promise<ProductionConfig | null> => {
  try {
    // Por ahora usamos localStorage hasta implementar endpoint específico para config
    const stored = localStorage.getItem(PRODUCTION_CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      log.debug('ProductionStorage', 'Production config loaded from localStorage');
      return config;
    }
    
    log.debug('ProductionStorage', 'No production config found');
    return null;
  } catch (error) {
    log.error('ProductionStorage', 'Error loading production config:', error);
    return null;
  }
};

export const saveCombinedData = (data: CombinedData): void => {
  try {
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(COMBINED_DATA_KEY, JSON.stringify(dataToSave));
    // console.log('✅ Datos combinados guardados');
  } catch (error) {
    // console.error('❌ Error guardando datos combinados:', error);
  }
};

export const loadCombinedData = (): CombinedData | null => {
  try {
    const stored = localStorage.getItem(COMBINED_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // console.error('❌ Error cargando datos combinados:', error);
  }
  return null;
};

// === FUNCIONES DE CÁLCULO ===

export const calculateOperationalMetrics = (
  production: ProductionData[],
  financial: any,
  config: ProductionConfig
): OperationalMetrics[] => {
  return production.map(prod => {
    const monthFinancial = financial.monthly[prod.month];
    
    if (!monthFinancial) {
      // console.warn(`⚠️ No hay datos financieros para ${prod.month}`);
      return {
        month: prod.month,
        costoProduccionPorMetro: 0,
        precioVentaPorMetro: 0,
        margenPorMetro: 0,
        margenPorcentual: 0,
        productividad: 0,
        eficienciaVentas: 0
      };
    }

    // Calcular métricas operativas
    // Calcular métricas operativas
    // Calcular métricas operativas
    // Calcular métricas operativas
    // console.log(`[productionStorage] Calculating operational metrics for month: ${prod.month}`);
    // console.log(`[productionStorage] Metros Producidos: ${prod.metrosProducidos}, Metros Vendidos: ${prod.metrosVendidos}`);
    // console.log(`[productionStorage] Financial Data - Ingresos: ${monthFinancial.ingresos}, Costos Variables: ${monthFinancial.costosVariables}, Costo Ventas Total: ${monthFinancial.costoVentasTotal}, Gastos Admin Total: ${monthFinancial.gastosAdminTotal}, Gastos Ventas Total: ${monthFinancial.gastosVentasTotal}`);

    const costoProduccionPorMetro = prod.metrosProducidos > 0 
      ? (monthFinancial.costoVentasTotal + monthFinancial.gastosAdminTotal + monthFinancial.gastosVentasTotal) / prod.metrosProducidos 
      : 0;
    
    const costoVariablePorMetro = prod.metrosVendidos > 0 
      ? monthFinancial.costosVariables / prod.metrosVendidos 
      : 0;

    const precioVentaPorMetro = prod.metrosVendidos > 0 
      ? monthFinancial.ingresos / prod.metrosVendidos 
      : 0;
    
    const margenPorMetro = precioVentaPorMetro - costoVariablePorMetro;
    const margenPorcentual = precioVentaPorMetro > 0 ? (margenPorMetro / precioVentaPorMetro) * 100 : 0;

    // console.log(`[productionStorage] Calculated - Costo Produccion/M2: ${costoProduccionPorMetro}, Costo Variable/M2: ${costoVariablePorMetro}, Precio Venta/M2: ${precioVentaPorMetro}`);
    
    const productividad = config.capacidadMaximaMensual > 0 ? 
      (prod.metrosProducidos / config.capacidadMaximaMensual) * 100 : 0;
    
    const eficienciaVentas = prod.metrosProducidos > 0 ? 
      (prod.metrosVendidos / prod.metrosProducidos) * 100 : 0;

    return {
      month: prod.month,
      costoProduccionPorMetro,
      costoVariablePorMetro,
      precioVentaPorMetro,
      margenPorMetro,
      margenPorcentual,
      productividad,
      eficienciaVentas
    };
  });
};

// === FUNCIONES DE VALIDACIÓN ===

export const validateProductionData = (data: ProductionData[]): string[] => {
  const errors: string[] = [];
  
  data.forEach((item, index) => {
    if (!item.month || item.month.trim() === '') {
      errors.push(`Registro ${index + 1}: Mes es requerido`);
    }
    
    if (item.metrosProducidos < 0) {
      errors.push(`Registro ${index + 1}: Metros producidos no puede ser negativo`);
    }
    
    if (item.metrosVendidos < 0) {
      errors.push(`Registro ${index + 1}: Metros vendidos no puede ser negativo`);
    }
    
    if (item.metrosVendidos > item.metrosProducidos) {
      errors.push(`Registro ${index + 1}: No se puede vender más de lo producido`);
    }
  });
  
  return errors;
};

export const validateProductionConfig = (config: ProductionConfig): string[] => {
  const errors: string[] = [];
  
  if (config.capacidadMaximaMensual <= 0) {
    errors.push('Capacidad máxima mensual debe ser mayor a 0');
  }
  
  if (config.costoFijoProduccion < 0) {
    errors.push('Costo fijo de producción no puede ser negativo');
  }
  
  if (config.metaPrecioPromedio <= 0) {
    errors.push('Meta de precio promedio debe ser mayor a 0');
  }
  
  if (config.metaMargenMinimo < 0 || config.metaMargenMinimo > 100) {
    errors.push('Meta de margen mínimo debe estar entre 0% y 100%');
  }
  
  return errors;
};

// === FUNCIONES DE EXPORTACIÓN ===

export const exportProductionData = (data: CombinedData): string => {
  const exportData = {
    financial: {
      totalIngresos: data.financial.yearly.ingresos,
      totalEbitda: data.financial.yearly.ebitda,
      kpis: data.financial.kpis
    },
    production: data.production,
    operational: data.operational,
    config: data.config,
    summary: {
      totalMetrosProducidos: data.production.reduce((sum, p) => sum + p.metrosProducidos, 0),
      totalMetrosVendidos: data.production.reduce((sum, p) => sum + p.metrosVendidos, 0),
      promedioMargenPorMetro: data.operational.reduce((sum, o) => sum + o.margenPorMetro, 0) / data.operational.length,
      promedioPrecioVenta: data.operational.reduce((sum, o) => sum + o.precioVentaPorMetro, 0) / data.operational.length
    },
    exportedAt: new Date().toISOString()
  };
  
  return JSON.stringify(exportData, null, 2);
};

// === FUNCIONES DE LIMPIEZA ===

export const clearAllProductionData = async (year?: number): Promise<void> => {
  try {
    // 1. Intentar borrar de MySQL via API
    try {
      const currentYear = year || new Date().getFullYear();
      const response = await fetch(`${API_BASE}/production_data_v1.php?year=${currentYear}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        log.info('ProductionStorage', 'Production data deleted from database for year:', currentYear);
      }
    } catch (apiError) {
      log.warn('ProductionStorage', 'API error during delete, clearing localStorage only:', apiError);
    }
    
    // 2. Limpiar localStorage
    localStorage.removeItem(PRODUCTION_DATA_KEY);
    localStorage.removeItem(PRODUCTION_CONFIG_KEY);
    localStorage.removeItem(COMBINED_DATA_KEY);
    log.debug('ProductionStorage', 'All production data cleared from localStorage');
  } catch (error) {
    log.error('ProductionStorage', 'Error clearing production data:', error);
  }
};

export const getAvailableYears = async (): Promise<number[]> => {
  try {
    const response = await fetch(`${API_BASE}/production_data_v1.php?action=years`);
    if (response.ok) {
      const result = await response.json();
      if (result && result.years) {
        return result.years;
      }
    }
  } catch (error) {
    log.warn('ProductionStorage', 'Error getting available years:', error);
  }
  
  // Fallback: return current year
  return [new Date().getFullYear()];
};

export const getStorageSummary = (year?: number): any => {
  // Usar localStorage directamente para evitar problemas con async
  const productionDataStored = localStorage.getItem(PRODUCTION_DATA_KEY);
  const configStored = localStorage.getItem(PRODUCTION_CONFIG_KEY);
  const combinedDataStored = localStorage.getItem(COMBINED_DATA_KEY);
  
  let productionData = [];
  let combinedData = null;
  
  try {
    if (productionDataStored) {
      productionData = JSON.parse(productionDataStored);
    }
    if (combinedDataStored) {
      combinedData = JSON.parse(combinedDataStored);
    }
  } catch (error) {
    // console.error('Error parsing storage data:', error);
  }
  
  return {
    hasProductionData: productionData.length > 0,
    hasConfig: configStored !== null,
    hasCombinedData: combinedDataStored !== null,
    lastUpdated: combinedData?.lastUpdated || null,
    totalRecords: productionData.length,
    year: year || new Date().getFullYear()
  };
};
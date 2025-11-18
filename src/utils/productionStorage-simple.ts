import { ProductionData, OperationalMetrics, ProductionConfig, CombinedData } from '../types';
import TenantStorage from './tenantStorage';

// Claves para localStorage
const PRODUCTION_DATA_KEY = 'artyco-production-data';
const PRODUCTION_CONFIG_KEY = 'artyco-production-config';
const COMBINED_DATA_KEY = 'artyco-combined-data';

// === FUNCIONES SIMPLES DE ALMACENAMIENTO ===

export function saveProductionData(data: ProductionData[]): void {
  try {
    TenantStorage.setItem(PRODUCTION_DATA_KEY, JSON.stringify(data));
    // console.log('✅ Datos de producción guardados:', data.length, 'registros');
  } catch (error) {
    // console.error('❌ Error guardando datos de producción:', error);
  }
}

export function loadProductionData(): ProductionData[] {
  try {
    const stored = TenantStorage.getItem(PRODUCTION_DATA_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // console.log('📁 Datos de producción cargados:', data.length, 'registros');
      return data;
    }
  } catch (error) {
    // console.error('❌ Error cargando datos de producción:', error);
  }
  return [];
}

export function saveProductionConfig(config: ProductionConfig): void {
  try {
    TenantStorage.setItem(PRODUCTION_CONFIG_KEY, JSON.stringify(config));
    // console.log('✅ Configuración de producción guardada');
  } catch (error) {
    // console.error('❌ Error guardando configuración:', error);
  }
}

export function loadProductionConfig(): ProductionConfig | null {
  try {
    const stored = TenantStorage.getItem(PRODUCTION_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // console.error('❌ Error cargando configuración:', error);
  }
  return null;
}

export function saveCombinedData(data: CombinedData): void {
  try {
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    TenantStorage.setItem(COMBINED_DATA_KEY, JSON.stringify(dataToSave));
    // console.log('✅ Datos combinados guardados');
  } catch (error) {
    // console.error('❌ Error guardando datos combinados:', error);
  }
}

export function loadCombinedData(): CombinedData | null {
  try {
    const stored = TenantStorage.getItem(COMBINED_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // console.error('❌ Error cargando datos combinados:', error);
  }
  return null;
}

// === FUNCIONES DE CÁLCULO ===

export function calculateOperationalMetrics(
  production: ProductionData[],
  financial: any,
  config: ProductionConfig
): OperationalMetrics[] {
  return production.map(prod => {
    // Validación defensiva completa
    if (!financial || !financial.monthly || !financial.monthly[prod.month]) {
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

    const monthFinancial = financial.monthly[prod.month];

    // Calcular métricas operativas con validación
    const costoTotal = (monthFinancial.costoVentasTotal || 0) + (monthFinancial.gastosOperativos || 0);
    const costoProduccionPorMetro = prod.metrosProducidos > 0 ? costoTotal / prod.metrosProducidos : 0;
    
    const precioVentaPorMetro = prod.metrosVendidos > 0 ? (monthFinancial.ingresos || 0) / prod.metrosVendidos : 0;
    
    const margenPorMetro = precioVentaPorMetro - costoProduccionPorMetro;
    const margenPorcentual = precioVentaPorMetro > 0 ? (margenPorMetro / precioVentaPorMetro) * 100 : 0;
    
    const productividad = config.capacidadMaximaMensual > 0 ? 
      (prod.metrosProducidos / config.capacidadMaximaMensual) * 100 : 0;
    
    const eficienciaVentas = prod.metrosProducidos > 0 ? 
      (prod.metrosVendidos / prod.metrosProducidos) * 100 : 0;

    return {
      month: prod.month,
      costoProduccionPorMetro,
      precioVentaPorMetro,
      margenPorMetro,
      margenPorcentual,
      productividad,
      eficienciaVentas
    };
  });
}

// === FUNCIONES DE VALIDACIÓN ===

export function validateProductionData(data: ProductionData[]): string[] {
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
}

export function validateProductionConfig(config: ProductionConfig): string[] {
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
}

// === FUNCIONES DE EXPORTACIÓN ===

export function exportProductionData(data: CombinedData): string {
  const exportData = {
    financial: {
      totalIngresos: (data.financial && data.financial.yearly && data.financial.yearly.ingresos) ? data.financial.yearly.ingresos : 0,
      totalEbitda: (data.financial && data.financial.yearly && data.financial.yearly.ebitda) ? data.financial.yearly.ebitda : 0,
      kpis: (data.financial && data.financial.kpis) ? data.financial.kpis : []
    },
    production: data.production || [],
    operational: data.operational || [],
    config: data.config || {},
    summary: {
      totalMetrosProducidos: (data.production || []).reduce((sum, p) => sum + (p.metrosProducidos || 0), 0),
      totalMetrosVendidos: (data.production || []).reduce((sum, p) => sum + (p.metrosVendidos || 0), 0),
      promedioMargenPorMetro: (data.operational && data.operational.length > 0) ? 
        data.operational.reduce((sum, o) => sum + (o.margenPorMetro || 0), 0) / data.operational.length : 0,
      promedioPrecioVenta: (data.operational && data.operational.length > 0) ? 
        data.operational.reduce((sum, o) => sum + (o.precioVentaPorMetro || 0), 0) / data.operational.length : 0
    },
    exportedAt: new Date().toISOString()
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Cleanup helper for tenant data
export function clearProductionStorage(): void {
  TenantStorage.removeItem(PRODUCTION_DATA_KEY);
  TenantStorage.removeItem(PRODUCTION_CONFIG_KEY);
  TenantStorage.removeItem(COMBINED_DATA_KEY);
}

// === FUNCIONES DE LIMPIEZA ===

export function clearAllProductionData(): void {
  TenantStorage.removeItem(PRODUCTION_DATA_KEY);
  TenantStorage.removeItem(PRODUCTION_CONFIG_KEY);
  TenantStorage.removeItem(COMBINED_DATA_KEY);
  // console.log('🗑️ Todos los datos de producción eliminados');
}

export function getStorageSummary(): any {
  const productionData = loadProductionData();
  const config = loadProductionConfig();
  const combinedData = loadCombinedData();
  
  return {
    hasProductionData: productionData.length > 0,
    hasConfig: config !== null,
    hasCombinedData: combinedData !== null,
    lastUpdated: (combinedData && combinedData.lastUpdated) ? combinedData.lastUpdated : null,
    totalRecords: productionData.length
  };
}
